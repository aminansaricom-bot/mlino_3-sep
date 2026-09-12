'use strict';

const path = require('node:path');

const w1Path = process.env.G1C_CLIENT_OUTPUT_W1;
const w2Path = process.env.G1C_CLIENT_OUTPUT_W2;

if (!w1Path || !w2Path) {
  throw new Error('G1C client output paths are required');
}

const W1 = require(path.resolve(w1Path));
const W2 = require(path.resolve(w2Path));

const w1 = new W1.PrismaClient({
  datasources: { db: { url: process.env.G1C_DATABASE_URL } },
});
const w2 = new W2.PrismaClient({
  datasources: { db: { url: process.env.G1C_DATABASE_URL } },
});

let failures = 0;

async function expectPrismaCode(name, code, fn, sqlState) {
  try {
    await fn();
  } catch (error) {
    const actualCode = error.code;
    const actualSqlState = error.meta?.code;
    if (actualCode !== code || (sqlState && actualSqlState !== sqlState)) {
      console.error(
        `FAIL ${name} expected=${code}${sqlState ? '/' + sqlState : ''} actual=${actualCode ?? 'none'}/${actualSqlState ?? 'none'}`,
      );
      failures += 1;
      return;
    }
    console.log(
      `PASS ${name} code=${actualCode}${sqlState ? ' sqlstate=' + actualSqlState : ''}`,
    );
    return;
  }
  console.error(`FAIL ${name} was accepted`);
  failures += 1;
}

async function expectValidationError(name, fn) {
  try {
    await fn();
  } catch (error) {
    if (
      error.name === 'PrismaClientValidationError' &&
      /Unknown argument.*organization/s.test(error.message)
    ) {
      console.log(`PASS ${name} type=PrismaClientValidationError unknown=organization`);
      return;
    }
    console.error(`FAIL ${name} unexpected=${error.name} code=${error.code ?? 'none'}`);
    failures += 1;
    return;
  }
  console.error(`FAIL ${name} was accepted`);
  failures += 1;
}

async function main() {
  await w1.organization.createMany({
    data: [{ id: 'g1c-prisma-org-a' }, { id: 'g1c-prisma-org-b' }],
  });
  await w1.membership.create({
    data: {
      id: 'g1c-prisma-member-a',
      identityProvider: 'idp-main',
      externalSubject: 'prisma-subject-a',
      organization: { connect: { id: 'g1c-prisma-org-a' } },
    },
  });
  await w1.capability.create({
    data: {
      id: 'g1c-prisma-cap-a',
      organization: { connect: { id: 'g1c-prisma-org-a' } },
    },
  });
  await w1.offer.create({
    data: {
      id: 'g1c-prisma-offer-a',
      organization: { connect: { id: 'g1c-prisma-org-a' } },
      capability: {
        connect: {
          id_organizationId: {
            id: 'g1c-prisma-cap-a',
            organizationId: 'g1c-prisma-org-a',
          },
        },
      },
    },
  });

  await w1.offerVersion.create({
    data: {
      id: 'g1c-prisma-version-valid',
      content: 'valid composite write',
      organization: { connect: { id: 'g1c-prisma-org-a' } },
      offer: {
        connect: {
          id_organizationId: {
            id: 'g1c-prisma-offer-a',
            organizationId: 'g1c-prisma-org-a',
          },
        },
      },
      capability: {
        connect: {
          id_organizationId: {
            id: 'g1c-prisma-cap-a',
            organizationId: 'g1c-prisma-org-a',
          },
        },
      },
    },
  });
  console.log('PASS prisma_composite_valid_write');

  await expectPrismaCode('W1_direct_scalar_tenant_guard', 'P2003', () =>
    w1.offerVersion.create({
      data: {
        id: 'g1c-prisma-w1-cross',
        organizationId: 'g1c-prisma-org-b',
        offerId: 'g1c-prisma-offer-a',
        capabilityId: 'g1c-prisma-cap-a',
        content: 'must fail',
      },
    }),
  );

  await w1.businessIdentityClaim.create({
    data: {
      id: 'g1c-prisma-claim-a',
      organizationId: 'g1c-prisma-org-a',
      identifierType: 'TAX',
      identifierValue: 'tax-g1c-prisma',
      claimStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });

  await expectPrismaCode('prisma_partial_unique_claim', 'P2002', () =>
    w1.businessIdentityClaim.create({
      data: {
        id: 'g1c-prisma-claim-duplicate',
        organizationId: 'g1c-prisma-org-b',
        identifierType: 'TAX',
        identifierValue: 'tax-g1c-prisma',
        claimStatus: 'SUSPENDED',
        verifiedAt: new Date(),
      },
    }),
  );

  await w1.publication.create({
    data: {
      id: 'g1c-prisma-publication-a',
      organizationId: 'g1c-prisma-org-a',
      offerVersionId: 'g1c-prisma-version-valid',
      eventKind: 'PUBLISHED',
      contentRevision: 1,
      performedByMembershipId: 'g1c-prisma-member-a',
      reason: 'Prisma write path validation',
    },
  });

  const projected = await w1.offerVersion.findUniqueOrThrow({
    where: { id: 'g1c-prisma-version-valid' },
  });
  if (projected.publicationStatus !== 'PUBLISHED') {
    console.error('FAIL prisma_publication_projection_read');
    failures += 1;
  } else {
    console.log('PASS prisma_publication_projection_read');
  }

  await expectPrismaCode(
    'prisma_direct_projection_mutation',
    'P2010',
    () => w1.$executeRawUnsafe(
      'UPDATE "offer_versions" SET "publication_status" = \'WITHDRAWN\' WHERE "id" = \'g1c-prisma-version-valid\'',
    ),
    'P0001',
  );

  await w2.offerVersion.create({
    data: {
      id: 'g1c-prisma-w2-valid',
      organizationId: 'g1c-prisma-org-a',
      offerId: 'g1c-prisma-offer-a',
      capabilityId: 'g1c-prisma-cap-a',
      content: 'W2 valid scalar path',
    },
  });
  console.log('PASS W2_valid_without_redundant_organization_relation');

  await expectValidationError('W2_redundant_organization_input_unavailable', () =>
    w2.offerVersion.create({
      data: {
        id: 'g1c-prisma-w2-contradictory',
        content: 'must not be constructible',
        organization: { connect: { id: 'g1c-prisma-org-b' } },
        offer: {
          connect: {
            id_organizationId: {
              id: 'g1c-prisma-offer-a',
              organizationId: 'g1c-prisma-org-a',
            },
          },
        },
        capability: {
          connect: {
            id_organizationId: {
              id: 'g1c-prisma-cap-a',
              organizationId: 'g1c-prisma-org-a',
            },
          },
        },
      },
    }),
  );

  if (failures > 0) {
    console.error(`VALIDATION_FAILURE_COUNT=${failures}`);
    process.exitCode = 1;
  } else {
    console.log('PRISMA_G1C_WRITE_PATH_PASS');
  }
}

main()
  .finally(async () => {
    await Promise.allSettled([w1.$disconnect(), w2.$disconnect()]);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

