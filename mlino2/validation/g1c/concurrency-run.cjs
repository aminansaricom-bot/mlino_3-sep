'use strict';

const { spawn, spawnSync } = require('node:child_process');

const container = process.env.G1C_CONTAINER;
const database = process.env.G1C_DATABASE || 'mlino_g1c';
const runTag = process.env.G1C_RUN_TAG || 'default';
const concurrencyOrganization = `g1c-conc-${runTag}-org`;
const concurrencyMembership = `g1c-conc-${runTag}-member`;
const concurrencyCapability = `g1c-conc-${runTag}-cap`;

if (!container) {
  throw new Error('G1C_CONTAINER is required');
}

function psqlArgs(extra = []) {
  return ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-U', 'postgres', '-d', database, ...extra];
}

function runPsql(sql) {
  const result = spawnSync('docker', psqlArgs(['-v', 'ON_ERROR_STOP=1', '-c', sql]), {
    encoding: 'utf8',
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function waitForText(proc, text, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${text}: ${output}`)), timeoutMs);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(text)) {
        clearTimeout(timer);
        resolve(output);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.once('exit', (code) => {
      if (!output.includes(text)) {
        clearTimeout(timer);
        reject(new Error(`process exited ${code} before ${text}: ${output}`));
      }
    });
  });
}

function waitForExit(proc) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.once('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

async function waitForTwoBarrierWaiters(key) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const result = runPsql(
      `SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND classid=42 AND objid=${key} AND NOT granted;`,
    );
    if (result.code !== 0) {
      throw new Error(`barrier inspection failed: ${result.stderr}`);
    }
    const count = Number(result.stdout.trim());
    if (count === 2) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
  }
  throw new Error(`two sessions did not reach advisory barrier key=${key}`);
}

async function runIteration(isolation, iteration) {
  const prefix = isolation === 'READ COMMITTED' ? 'rc' : 'ser';
  const key = isolation === 'READ COMMITTED' ? 10000 + iteration : 20000 + iteration;
  const offer = `g1c-conc-${runTag}-${prefix}-offer-${iteration}`;
  const versionOld = `g1c-conc-${runTag}-${prefix}-old-${iteration}`;
  const versionNew = `g1c-conc-${runTag}-${prefix}-new-${iteration}`;
  const versionRival = `g1c-conc-${runTag}-${prefix}-rival-${iteration}`;

  const setup = runPsql(`
    INSERT INTO "offers"("id","organization_id","capability_id")
    VALUES ('${offer}','${concurrencyOrganization}','${concurrencyCapability}');
    INSERT INTO "offer_versions"("id","organization_id","offer_id","capability_id","content")
    VALUES
      ('${versionOld}','${concurrencyOrganization}','${offer}','${concurrencyCapability}','old'),
      ('${versionNew}','${concurrencyOrganization}','${offer}','${concurrencyCapability}','new'),
      ('${versionRival}','${concurrencyOrganization}','${offer}','${concurrencyCapability}','rival');
    INSERT INTO "publications"(
      "id","organization_id","offer_version_id","event_kind","content_revision",
      "performed_by_membership_id","reason"
    ) VALUES (
      'g1c-conc-${runTag}-${prefix}-initial-${iteration}',
      '${concurrencyOrganization}','${versionOld}','PUBLISHED',1,
      '${concurrencyMembership}','initial publication'
    );
  `);
  if (setup.code !== 0) throw new Error(`setup failed: ${setup.stderr}`);

  const coordinator = spawn('docker', psqlArgs(['-v', 'ON_ERROR_STOP=1']), {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  coordinator.stdin.write(`SELECT pg_advisory_lock(42, ${key});\n\\echo COORDINATOR_READY\n`);
  await waitForText(coordinator, 'COORDINATOR_READY');

  const makeSession = (body) => {
    const child = spawn('docker', psqlArgs(['-v', 'ON_ERROR_STOP=1']), {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(`
      \\set VERBOSITY verbose
      BEGIN ISOLATION LEVEL ${isolation};
      SELECT pg_advisory_lock(42, ${key});
      SELECT pg_advisory_unlock(42, ${key});
      ${body}
      COMMIT;
    `);
    return child;
  };

  const sessionA = makeSession(`
    INSERT INTO "publications"(
      "id","organization_id","offer_version_id","event_kind","content_revision",
      "performed_by_membership_id","reason"
    ) VALUES (
      'g1c-conc-${runTag}-${prefix}-withdraw-${iteration}',
      '${concurrencyOrganization}','${versionOld}','WITHDRAWN',NULL,
      '${concurrencyMembership}','withdraw before replacement'
    );
    INSERT INTO "publications"(
      "id","organization_id","offer_version_id","event_kind","content_revision",
      "performed_by_membership_id","reason"
    ) VALUES (
      'g1c-conc-${runTag}-${prefix}-publish-new-${iteration}',
      '${concurrencyOrganization}','${versionNew}','PUBLISHED',${iteration + 1},
      '${concurrencyMembership}','publish replacement'
    );
  `);
  const sessionB = makeSession(`
    INSERT INTO "publications"(
      "id","organization_id","offer_version_id","event_kind","content_revision",
      "performed_by_membership_id","reason"
    ) VALUES (
      'g1c-conc-${runTag}-${prefix}-publish-rival-${iteration}',
      '${concurrencyOrganization}','${versionRival}','PUBLISHED',${iteration + 100},
      '${concurrencyMembership}','publish rival'
    );
  `);
  const resultAPromise = waitForExit(sessionA);
  const resultBPromise = waitForExit(sessionB);

  await waitForTwoBarrierWaiters(key);
  coordinator.stdin.end(`SELECT pg_advisory_unlock(42, ${key});\n\\q\n`);

  const [a, b] = await Promise.all([resultAPromise, resultBPromise]);
  if (a.code !== 0 || b.code === 0) {
    throw new Error(`${isolation} iteration ${iteration}: expected replacement success and rival failure, got replacement=${a.code} rival=${b.code}`);
  }

  const failureText = `${b.stdout}\n${b.stderr}`;
  const expectedCodes = isolation === 'READ COMMITTED' ? ['23505'] : ['23505', '40001'];
  const actualCode = expectedCodes.find((code) => failureText.includes(code));
  if (!actualCode) {
    throw new Error(
      `${isolation} iteration ${iteration}: unexpected loser error: ${failureText}`,
    );
  }

  const verify = runPsql(`
    SELECT
      (SELECT "publication_status"::text FROM "offer_versions" WHERE "id"='${versionOld}')
      || ':' || (SELECT "publication_status"::text FROM "offer_versions" WHERE "id"='${versionNew}')
      || ':' || (SELECT "publication_status"::text FROM "offer_versions" WHERE "id"='${versionRival}')
      || ':' || (SELECT count(*) FROM "publications" WHERE "id" IN (
        'g1c-conc-${runTag}-${prefix}-withdraw-${iteration}',
        'g1c-conc-${runTag}-${prefix}-publish-new-${iteration}'
      ))
      || ':' || (SELECT count(*) FROM "publications" WHERE "id" =
        'g1c-conc-${runTag}-${prefix}-publish-rival-${iteration}');
  `);
  if (verify.code !== 0 || verify.stdout.trim() !== 'WITHDRAWN:PUBLISHED:UNPUBLISHED:2:0') {
    throw new Error(`${isolation} iteration ${iteration}: final state ${verify.stdout} ${verify.stderr}`);
  }

  console.log(`PASS concurrency isolation=${isolation} iteration=${iteration} loser_code=${actualCode} barrier=advisory`);
  return actualCode;
}

async function main() {
  const seed = runPsql(`
    INSERT INTO "organizations"("id") VALUES ('${concurrencyOrganization}');
    INSERT INTO "memberships"("id","organization_id","identity_provider","external_subject")
    VALUES ('${concurrencyMembership}','${concurrencyOrganization}','idp-main','${concurrencyMembership}');
    INSERT INTO "capabilities"("id","organization_id")
    VALUES ('${concurrencyCapability}','${concurrencyOrganization}');
  `);
  if (seed.code !== 0) throw new Error(`concurrency seed failed: ${seed.stderr}`);

  const counts = new Map();
  for (const isolation of ['READ COMMITTED', 'SERIALIZABLE']) {
    for (let iteration = 1; iteration <= 20; iteration += 1) {
      const code = await runIteration(isolation, iteration);
      counts.set(`${isolation}:${code}`, (counts.get(`${isolation}:${code}`) || 0) + 1);
    }
  }

  for (const [key, value] of counts) {
    console.log(`SUMMARY ${key}=${value}`);
  }
  console.log('PASS_G1C_CONCURRENCY_40_RUNS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
