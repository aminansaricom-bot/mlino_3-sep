'use strict';

const { PrismaClient } = require(process.env.G3_PRISMA_CLIENT_PATH);

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.organization.createMany({
      data: [
        { id: 'prisma-org-a', displayName: 'Prisma A' },
        { id: 'prisma-org-b', displayName: 'Prisma B' },
      ],
    });
    await prisma.organizationMembership.create({
      data: {
        id: 'prisma-member-a',
        organizationId: 'prisma-org-a',
        identityProvider: 'test-idp',
        externalSubject: 'prisma-subject-a',
      },
    });

    let observed = null;
    try {
      await prisma.businessIdentityClaim.create({
        data: {
          id: 'prisma-cross-tenant-claim',
          organizationId: 'prisma-org-b',
          identifierType: 'registration',
          identifierValue: 'PRISMA-CROSS-TENANT',
          submittedByMembershipId: 'prisma-member-a',
        },
      });
    } catch (error) {
      observed = error && error.code;
    }
    if (observed !== 'P2003') {
      throw new Error(`Expected Prisma P2003, observed ${String(observed)}`);
    }
    console.log('PASS Prisma direct-scalar cross-tenant write rejected with P2003');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
