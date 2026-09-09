import { ExternalLinkStatus } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import {
  ExternalLinkBasis,
  ExternalSystem,
  NoActiveLinkError,
  WorkspaceAlreadyLinkedError,
  WorkspaceLinkService,
} from '../../foundation/workspace-link/workspace-link.service';

/**
 * نگاشت هویت کسب‌وکار — CCR ‏`ExternalWorkspaceLink` (مصوب ۱۰ سپتامبر ۲۰۲۶).
 *
 * دامنه‌ی این تست‌ها دقیقاً همان چیزی است که CCR تصویب کرد و نه بیشتر:
 * ناوردای «حداکثر یک پیوند فعال»، معناشناسی لغو و وصل دوباره، و ناوردای
 * هویت تاریخی. هیچ تستی برای اجرای حذف workspace نوشته نشده — آن قاعده
 * عمداً `ENFORCEMENT DEFERRED` است و تست‌کردنش یعنی وانمود کنیم اجرا می‌شود.
 */

const svc = new WorkspaceLinkService();
const SYS = ExternalSystem.CONTENT_STUDIO;

async function cleanup(): Promise<void> {
  await prisma.externalWorkspaceLink.deleteMany({
    where: { externalWorkspaceId: { startsWith: 'ws_test_' } },
  });
}

beforeEach(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe('نگاشت workspace ⇄ organization — resolve', () => {
  it('workspace بدون پیوند، «پیوند ندارد» می‌گیرد', async () => {
    const r = await svc.resolveWorkspace(SYS, 'ws_test_unknown');
    expect(r).toEqual({ status: 'not_linked' });
  });

  it('پیوند فعال، هویت متعارف را برمی‌گرداند', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_1',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    const r = await svc.resolveWorkspace(SYS, 'ws_test_1');
    expect(r).toEqual({ status: 'linked', organizationId: 'org_test_a' });
  });

  it('شناسه‌ی خالی هرگز به ردیفی نمی‌خورد', async () => {
    expect(await svc.resolveWorkspace(SYS, '')).toEqual({ status: 'not_linked' });
    expect(await svc.resolveWorkspace(SYS, '   ')).toEqual({ status: 'not_linked' });
  });

  it('نگاشت بر اساس نام انجام نمی‌شود — فقط شناسه‌ی دقیق', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_clinic',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    // شناسه‌ی مشابه ولی نه یکسان → هیچ تطبیقی
    expect(await svc.resolveWorkspace(SYS, 'ws_test_clini')).toEqual({ status: 'not_linked' });
    expect(await svc.resolveWorkspace(SYS, 'ws_test_clinic ')).toEqual({ status: 'not_linked' });
  });
});

describe('ناوردای «حداکثر یک پیوند فعال»', () => {
  it('پیوند دوم روی workspaceی که پیوند فعال دارد، رد می‌شود', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_2',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });

    await expect(
      svc.linkWorkspace({
        organizationId: 'org_test_b',
        system: SYS,
        externalWorkspaceId: 'ws_test_2',
        basis: ExternalLinkBasis.ADMIN_ACTION,
        linkedByActorId: 'actor_2',
      }),
    ).rejects.toBeInstanceOf(WorkspaceAlreadyLinkedError);
  });

  it('قید در سطح دیتابیس است، نه فقط در اپلیکیشن', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_3',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });

    // دور زدن کامل لایه‌ی سرویس — نوشتن مستقیم با Prisma.
    // اگر ناوردا فقط یک بررسی اپلیکیشنی بود، این موفق می‌شد.
    await expect(
      prisma.externalWorkspaceLink.create({
        data: {
          organizationId: 'org_test_b',
          system: SYS,
          externalWorkspaceId: 'ws_test_3',
          status: ExternalLinkStatus.ACTIVE,
          basis: ExternalLinkBasis.INTEGRATION,
          linkedAt: new Date(),
          linkedByActorId: 'actor_bypass',
        },
      }),
    ).rejects.toThrow();
  });

  it('دو workspace متفاوت می‌توانند هم‌زمان پیوند فعال داشته باشند', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_4a',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_4b',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });

    // یک سازمان می‌تواند چند workspace داشته باشد — عمداً مجاز
    expect(await svc.resolveWorkspace(SYS, 'ws_test_4a')).toEqual({
      status: 'linked',
      organizationId: 'org_test_a',
    });
    expect(await svc.resolveWorkspace(SYS, 'ws_test_4b')).toEqual({
      status: 'linked',
      organizationId: 'org_test_a',
    });
  });
});

describe('لغو و وصل دوباره', () => {
  it('پس از لغو، resolve دقیقاً مثل «هرگز پیوند نداشت» جواب می‌دهد', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_5',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    await svc.revokeLink({
      system: SYS,
      externalWorkspaceId: 'ws_test_5',
      revokedByActorId: 'actor_9',
    });

    expect(await svc.resolveWorkspace(SYS, 'ws_test_5')).toEqual({ status: 'not_linked' });
  });

  it('لغو، ردیف را حذف نمی‌کند — بازیگر و زمان ثبت می‌شوند', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_6',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    const revoked = await svc.revokeLink({
      system: SYS,
      externalWorkspaceId: 'ws_test_6',
      revokedByActorId: 'actor_9',
      note: 'تایید مالکیت باطل شد',
    });

    expect(revoked.status).toBe(ExternalLinkStatus.REVOKED);
    expect(revoked.revokedByActorId).toBe('actor_9');
    expect(revoked.revokedAt).not.toBeNull();
    expect(revoked.note).toBe('تایید مالکیت باطل شد');

    const history = await svc.linkHistory(SYS, 'ws_test_6');
    expect(history).toHaveLength(1);
  });

  it('وصل دوباره یک رکورد **جدید** می‌سازد، نه احیای رکورد لغوشده', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_7',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    await svc.revokeLink({
      system: SYS,
      externalWorkspaceId: 'ws_test_7',
      revokedByActorId: 'actor_9',
    });
    await svc.linkWorkspace({
      organizationId: 'org_test_b',
      system: SYS,
      externalWorkspaceId: 'ws_test_7',
      basis: ExternalLinkBasis.ADMIN_ACTION,
      linkedByActorId: 'actor_2',
    });

    const history = await svc.linkHistory(SYS, 'ws_test_7');
    expect(history).toHaveLength(2);
    expect(history[0].status).toBe(ExternalLinkStatus.REVOKED);
    expect(history[0].organizationId).toBe('org_test_a');
    expect(history[1].status).toBe(ExternalLinkStatus.ACTIVE);
    expect(history[1].organizationId).toBe('org_test_b');

    // رکورد لغوشده هرگز دوباره ACTIVE نمی‌شود
    expect(history.filter((h) => h.status === ExternalLinkStatus.ACTIVE)).toHaveLength(1);
  });

  it('لغو پیوندی که وجود ندارد، خطای صریح می‌دهد نه شکست خاموش', async () => {
    await expect(
      svc.revokeLink({
        system: SYS,
        externalWorkspaceId: 'ws_test_never',
        revokedByActorId: 'actor_9',
      }),
    ).rejects.toBeInstanceOf(NoActiveLinkError);
  });

  it('پس از لغو، پیوند تازه روی همان workspace مجاز است', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_8',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    await svc.revokeLink({
      system: SYS,
      externalWorkspaceId: 'ws_test_8',
      revokedByActorId: 'actor_9',
    });

    // ایندکس یکتای جزئی فقط ردیف‌های ACTIVE را می‌بیند، پس این باید موفق شود
    await expect(
      svc.linkWorkspace({
        organizationId: 'org_test_c',
        system: SYS,
        externalWorkspaceId: 'ws_test_8',
        basis: ExternalLinkBasis.SYSTEM_MIGRATION,
        linkedByActorId: 'actor_3',
      }),
    ).resolves.toBeDefined();
  });
});

describe('ناوردای هویت تاریخی — «در زمان T به کدام سازمان وصل بود؟»', () => {
  it('به پرسش زمان‌مند جواب درست می‌دهد', async () => {
    const link1 = await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_9',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    const beforeRevoke = new Date(Date.parse(link1.linkedAt) + 1);

    await new Promise((r) => setTimeout(r, 10));
    await svc.revokeLink({
      system: SYS,
      externalWorkspaceId: 'ws_test_9',
      revokedByActorId: 'actor_9',
    });

    await new Promise((r) => setTimeout(r, 10));
    const link2 = await svc.linkWorkspace({
      organizationId: 'org_test_b',
      system: SYS,
      externalWorkspaceId: 'ws_test_9',
      basis: ExternalLinkBasis.ADMIN_ACTION,
      linkedByActorId: 'actor_2',
    });
    const afterSecondLink = new Date(Date.parse(link2.linkedAt) + 1);

    // در بازه‌ی اول → سازمان اول، حتی با اینکه آن پیوند حالا لغو شده
    expect(await svc.organizationAt(SYS, 'ws_test_9', beforeRevoke)).toEqual({
      status: 'linked',
      organizationId: 'org_test_a',
    });

    // در بازه‌ی دوم → سازمان دوم
    expect(await svc.organizationAt(SYS, 'ws_test_9', afterSecondLink)).toEqual({
      status: 'linked',
      organizationId: 'org_test_b',
    });
  });

  it('پیش از اولین پیوند، هیچ سازمانی برنمی‌گردد', async () => {
    const link = await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_10',
      basis: ExternalLinkBasis.MANUAL,
      linkedByActorId: 'actor_1',
    });
    const before = new Date(Date.parse(link.linkedAt) - 1000);

    expect(await svc.organizationAt(SYS, 'ws_test_10', before)).toEqual({ status: 'not_linked' });
  });

  it('تاریخچه پس از لغو همچنان قابل پرس‌وجوست', async () => {
    await svc.linkWorkspace({
      organizationId: 'org_test_a',
      system: SYS,
      externalWorkspaceId: 'ws_test_11',
      basis: ExternalLinkBasis.INTEGRATION,
      linkedByActorId: 'actor_1',
    });
    await svc.revokeLink({
      system: SYS,
      externalWorkspaceId: 'ws_test_11',
      revokedByActorId: 'actor_9',
    });

    const history = await svc.linkHistory(SYS, 'ws_test_11');
    expect(history).toHaveLength(1);
    expect(history[0].linkedByActorId).toBe('actor_1');
    expect(history[0].revokedByActorId).toBe('actor_9');
    expect(history[0].basis).toBe(ExternalLinkBasis.INTEGRATION);
    expect(history[0].linkedAt).not.toBeNull();
    expect(history[0].revokedAt).not.toBeNull();
  });
});

describe('مبنای پیوند — فهرست بسته', () => {
  it('هر چهار مقدار مصوب پذیرفته می‌شوند', async () => {
    const values = [
      ExternalLinkBasis.MANUAL,
      ExternalLinkBasis.SYSTEM_MIGRATION,
      ExternalLinkBasis.ADMIN_ACTION,
      ExternalLinkBasis.INTEGRATION,
    ];
    expect(values).toHaveLength(4);

    for (const [i, basis] of values.entries()) {
      const link = await svc.linkWorkspace({
        organizationId: 'org_test_a',
        system: SYS,
        externalWorkspaceId: `ws_test_basis_${i}`,
        basis,
        linkedByActorId: 'actor_1',
      });
      expect(link.basis).toBe(basis);
    }
  });

  it('`basis` اجباری است — بدون آن رکورد ساخته نمی‌شود', async () => {
    await expect(
      prisma.externalWorkspaceLink.create({
        // basis عمداً غایب — TypeScript هم جلویش را می‌گیرد و هم دیتابیس
        data: {
          organizationId: 'org_test_a',
          system: SYS,
          externalWorkspaceId: 'ws_test_nobasis',
          linkedAt: new Date(),
          linkedByActorId: 'actor_1',
        } as never,
      }),
    ).rejects.toThrow();
  });
});
