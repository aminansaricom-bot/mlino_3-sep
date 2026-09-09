/**
 * نگاشت هویت کسب‌وکار — `workspace` بیرونی ⇄ `organization` متعارف V1.
 *
 * CCR مصوب: implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md
 * معماری:   mlino_book/adr/ADR-0004-workspace-organization-mapping.md
 *
 * V1 منبع حقیقت متعارف است. سیستم بیرونی هیچ ستون مالکیتی نمی‌گیرد و
 * `organization_id` را ذخیره نمی‌کند — فقط در همان فراخوانی می‌گیردش.
 *
 * سه قاعده‌ی سختی که این ماژول اجرا می‌کند:
 *   ۱. fail-closed — پیوند نامشخص یا لغوشده = «پیوند ندارد»، بدون استثنا
 *   ۲. هرگز نگاشت بر اساس نام — فقط شناسه‌ی صریح ثبت‌شده
 *   ۳. ناوردای هویت تاریخی — ردیف لغوشده حذف یا بازنویسی نمی‌شود
 */

import { ExternalLinkBasis, ExternalLinkStatus, ExternalSystem } from '@prisma/client';
import { ActorId, ISOTimestamp, OrganizationId } from '../../shared-contracts/types';
import { prisma } from '../prisma-client';

export { ExternalLinkBasis, ExternalSystem };

/**
 * نتیجه‌ی resolve.
 *
 * ⚠️ قید امنیتی: این نوع عمداً بین «پیوند ندارد» و «سازمان وجود ندارد» فرق
 * نمی‌گذارد. هر مرزی که این را بیرون بدهد، باید همان پاسخ یکسان را برگرداند
 * — وگرنه به یک existence oracle تبدیل می‌شود و می‌شود با آن فهمید کدام
 * سازمان‌ها در V1 وجود دارند. همان درسی که در مرز HTTP نسخه‌ی ۱ گرفته شد.
 */
export type WorkspaceResolution =
  | { readonly status: 'linked'; readonly organizationId: OrganizationId }
  | { readonly status: 'not_linked' };

export interface LinkWorkspaceInput {
  readonly organizationId: OrganizationId;
  readonly system: ExternalSystem;
  readonly externalWorkspaceId: string;
  readonly basis: ExternalLinkBasis;
  readonly linkedByActorId: ActorId;
  readonly note?: string;
}

export interface RevokeLinkInput {
  readonly system: ExternalSystem;
  readonly externalWorkspaceId: string;
  readonly revokedByActorId: ActorId;
  readonly note?: string;
}

export interface HistoricalLink {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly system: ExternalSystem;
  readonly externalWorkspaceId: string;
  readonly status: ExternalLinkStatus;
  readonly basis: ExternalLinkBasis;
  readonly linkedAt: ISOTimestamp;
  readonly linkedByActorId: ActorId;
  readonly revokedAt: ISOTimestamp | null;
  readonly revokedByActorId: ActorId | null;
  readonly note: string | null;
}

/** خطای دامنه — تلاش برای پیوند دوم روی یک workspace که پیوند فعال دارد. */
export class WorkspaceAlreadyLinkedError extends Error {
  constructor(system: ExternalSystem, externalWorkspaceId: string) {
    super(`workspace already has an active link: ${system}/${externalWorkspaceId}`);
    this.name = 'WorkspaceAlreadyLinkedError';
  }
}

/** خطای دامنه — تلاش برای لغو پیوندی که وجود ندارد. */
export class NoActiveLinkError extends Error {
  constructor(system: ExternalSystem, externalWorkspaceId: string) {
    super(`no active link to revoke: ${system}/${externalWorkspaceId}`);
    this.name = 'NoActiveLinkError';
  }
}

function toIso(d: Date): ISOTimestamp {
  return d.toISOString();
}

export class WorkspaceLinkService {
  /**
   * ترجمه‌ی شناسه‌ی بیرونی به هویت متعارف.
   *
   * فقط `ACTIVE` معتبر است. `REVOKED` دقیقاً مثل «هرگز پیوند نداشت» رفتار
   * می‌کند — fail-closed، بدون دوره‌ی مهلت و بدون استثنا.
   */
  async resolveWorkspace(
    system: ExternalSystem,
    externalWorkspaceId: string,
  ): Promise<WorkspaceResolution> {
    // ورودی خالی هرگز به دیتابیس نمی‌رسد — یک شناسه‌ی تهی نباید بتواند
    // به‌طور تصادفی به ردیفی بخورد.
    if (externalWorkspaceId.trim().length === 0) return { status: 'not_linked' };

    const row = await prisma.externalWorkspaceLink.findFirst({
      where: { system, externalWorkspaceId, status: ExternalLinkStatus.ACTIVE },
      select: { organizationId: true },
    });

    return row === null
      ? { status: 'not_linked' }
      : { status: 'linked', organizationId: row.organizationId };
  }

  /**
   * ثبت یک پیوند جدید.
   *
   * ناوردای «حداکثر یک پیوند فعال» در سطح دیتابیس با ایندکس یکتای جزئی
   * اجبار می‌شود. بررسی زیر فقط برای پیام خطای بهتر است و **جایگزین آن قید
   * نیست**: یک بررسی «اول بخوان بعد بنویس» در برابر همزمانی امن نیست.
   * اگر دو تراکنش هم‌زمان برسند، دیتابیس دومی را رد می‌کند و همان خطا به
   * `WorkspaceAlreadyLinkedError` ترجمه می‌شود.
   */
  async linkWorkspace(input: LinkWorkspaceInput): Promise<HistoricalLink> {
    try {
      const row = await prisma.externalWorkspaceLink.create({
        data: {
          organizationId: input.organizationId,
          system: input.system,
          externalWorkspaceId: input.externalWorkspaceId,
          status: ExternalLinkStatus.ACTIVE,
          basis: input.basis,
          linkedAt: new Date(),
          linkedByActorId: input.linkedByActorId,
          note: input.note ?? null,
        },
      });
      return this.toHistorical(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new WorkspaceAlreadyLinkedError(input.system, input.externalWorkspaceId);
      }
      throw err;
    }
  }

  /**
   * لغو پیوند فعال.
   *
   * ردیف **حذف نمی‌شود** — فقط `REVOKED` می‌گیرد با بازیگر و زمان. این همان
   * ناوردای هویت تاریخی است: باید بشود پرسید «در زمان T این workspace به
   * کدام سازمان وصل بود؟» و جواب گرفت.
   */
  async revokeLink(input: RevokeLinkInput): Promise<HistoricalLink> {
    const active = await prisma.externalWorkspaceLink.findFirst({
      where: {
        system: input.system,
        externalWorkspaceId: input.externalWorkspaceId,
        status: ExternalLinkStatus.ACTIVE,
      },
    });
    if (active === null) {
      throw new NoActiveLinkError(input.system, input.externalWorkspaceId);
    }

    const row = await prisma.externalWorkspaceLink.update({
      where: { id: active.id },
      data: {
        status: ExternalLinkStatus.REVOKED,
        revokedAt: new Date(),
        revokedByActorId: input.revokedByActorId,
        // یادداشت قبلی بازنویسی نمی‌شود مگر یادداشت تازه‌ای داده شود
        note: input.note ?? active.note,
      },
    });
    return this.toHistorical(row);
  }

  /**
   * تاریخچه‌ی کامل پیوندهای یک workspace — فعال و لغوشده.
   *
   * این همان چیزی است که الزام ممیزی را برآورده می‌کند. ترتیب از قدیم به
   * جدید، تا بازه‌های زمانی پشت‌سرهم خوانده شوند.
   */
  async linkHistory(
    system: ExternalSystem,
    externalWorkspaceId: string,
  ): Promise<readonly HistoricalLink[]> {
    const rows = await prisma.externalWorkspaceLink.findMany({
      where: { system, externalWorkspaceId },
      orderBy: { linkedAt: 'asc' },
    });
    return rows.map((r) => this.toHistorical(r));
  }

  /**
   * «در زمان T، این workspace به کدام سازمان وصل بود؟»
   *
   * الزام هسته‌ای ممیزی‌پذیری طبق CCR بند ۱۱.۴. یک پیوند در زمان T معتبر
   * است اگر پیش از T ثبت شده باشد و یا هنوز لغو نشده باشد یا پس از T لغو
   * شده باشد.
   */
  async organizationAt(
    system: ExternalSystem,
    externalWorkspaceId: string,
    at: Date,
  ): Promise<WorkspaceResolution> {
    const rows = await prisma.externalWorkspaceLink.findMany({
      where: { system, externalWorkspaceId, linkedAt: { lte: at } },
      orderBy: { linkedAt: 'desc' },
    });

    for (const r of rows) {
      // هنوز فعال، یا پس از لحظه‌ی پرسش لغو شده → در زمان T معتبر بوده
      if (r.revokedAt === null || r.revokedAt > at) {
        return { status: 'linked', organizationId: r.organizationId };
      }
    }
    return { status: 'not_linked' };
  }

  private toHistorical(row: {
    id: string;
    organizationId: string;
    system: ExternalSystem;
    externalWorkspaceId: string;
    status: ExternalLinkStatus;
    basis: ExternalLinkBasis;
    linkedAt: Date;
    linkedByActorId: string;
    revokedAt: Date | null;
    revokedByActorId: string | null;
    note: string | null;
  }): HistoricalLink {
    return {
      id: row.id,
      organizationId: row.organizationId,
      system: row.system,
      externalWorkspaceId: row.externalWorkspaceId,
      status: row.status,
      basis: row.basis,
      linkedAt: toIso(row.linkedAt),
      linkedByActorId: row.linkedByActorId,
      revokedAt: row.revokedAt === null ? null : toIso(row.revokedAt),
      revokedByActorId: row.revokedByActorId,
      note: row.note,
    };
  }
}

/** تشخیص نقض قید یکتایی Postgres بدون وابستگی به متن پیام. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

export const workspaceLinkService = new WorkspaceLinkService();
