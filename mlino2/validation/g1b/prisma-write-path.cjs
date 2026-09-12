'use strict';

const clientPath = process.env.G1_PRISMA_CLIENT_PATH || '@prisma/client';
const { PrismaClient } = require(clientPath);

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.G1_DATABASE_URL } },
});

let failureCount = 0;

async function expectRejected(name, fn) {
  try {
    await fn();
  } catch (error) {
    console.log(`PASS ${name} code=${error.code ?? 'SQLSTATE'}`);
    return true;
  }
  console.error(`FAIL ${name} was accepted`);
  failureCount += 1;
  return false;
}

async function main() {
  await prisma.organization.createMany({
    data: [{ id: 'prisma-org-a' }, { id: 'prisma-org-b' }],
  });

  await prisma.offer.create({
    data: {
      id: 'prisma-offer-a',
      organization: { connect: { id: 'prisma-org-a' } },
    },
  });

  await prisma.offerVersion.create({
    data: {
      id: 'prisma-version-a',
      content: 'prisma write path',
      organization: { connect: { id: 'prisma-org-a' } },
      offer: {
        connect: {
          id_organizationId: {
            id: 'prisma-offer-a',
            organizationId: 'prisma-org-a',
          },
        },
      },
    },
  });
  console.log('PASS prisma_composite_create');

  const crossTenantRejected = await expectRejected('prisma_cross_tenant_connect', () =>
    prisma.offerVersion.create({
      data: {
        id: 'prisma-version-cross',
        content: 'invalid',
        organization: { connect: { id: 'prisma-org-b' } },
        offer: {
          connect: {
            id_organizationId: {
              id: 'prisma-offer-a',
              organizationId: 'prisma-org-a',
            },
          },
        },
      },
    }),
  );
  if (!crossTenantRejected) {
    const stored = await prisma.offerVersion.findUniqueOrThrow({
      where: { id: 'prisma-version-cross' },
    });
    console.error(
      `FAIL prisma_cross_tenant_connect stored_organization_id=${stored.organizationId}`,
    );
  }

  await prisma.businessIdentityClaim.create({
    data: {
      id: 'prisma-claim-a',
      organizationId: 'prisma-org-a',
      identifierType: 'TAX',
      identifierValue: 'tax-prisma-a',
      claimStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });

  await expectRejected('prisma_partial_unique_claim', () =>
    prisma.businessIdentityClaim.create({
      data: {
        id: 'prisma-claim-b',
        organizationId: 'prisma-org-b',
        identifierType: 'TAX',
        identifierValue: 'tax-prisma-a',
        claimStatus: 'SUSPENDED',
        verifiedAt: new Date(),
      },
    }),
  );

  await prisma.publication.create({
    data: {
      id: 'prisma-pub-a',
      organizationId: 'prisma-org-a',
      offerVersionId: 'prisma-version-a',
      eventKind: 'PUBLISHED',
      contentRevision: 1,
      platformActorRef: 'platform:prisma-test',
    },
  });

  const version = await prisma.offerVersion.findUniqueOrThrow({
    where: { id: 'prisma-version-a' },
  });
  if (version.publicationStatus !== 'PUBLISHED') {
    throw new Error('FAIL publication projection not visible through Prisma');
  }
  console.log('PASS prisma_publication_projection_read');

  await expectRejected('prisma_direct_projection_mutation', () =>
    prisma.offerVersion.update({
      where: { id: 'prisma-version-a' },
      data: { publicationStatus: 'WITHDRAWN' },
    }),
  );

  if (failureCount > 0) {
    console.error(`VALIDATION_FAILURE_COUNT=${failureCount}`);
    process.exitCode = 1;
  } else {
    console.log('PRISMA_WRITE_PATH_PASS');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
