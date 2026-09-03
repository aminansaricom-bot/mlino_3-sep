# نگاشت پیاده‌سازی قراردادهای مشترک

منبع: `PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/CONTRACTS.md` → `implementation/shared-contracts/types.ts` (تنها فایل پیاده‌سازی این قرارداد؛ تأیید‌شده که هیچ Feature نسخه‌ی محلی/Fork‌شده ندارد).

| قرارداد مشترک | نماد TypeScript | خط | وضعیت |
|---|---|---|---|
| شناسه‌های نوع‌دار (Organization/Actor/Event/OpportunityCorrelation/UniqueKey/ISOTimestamp) | `OrganizationId`, `ActorCoreEntityId`, `EventId`, `OpportunityCorrelationId`, `UniqueKey`, `ISOTimestamp` | ۱۱–۱۶ | EXACT |
| فهرست بسته‌ی domain_tag (Closed Allow-list) | `ALLOWED_DOMAIN_TAGS` (const array) + `DomainTag` | ۱۸–۲۴ | EXACT |
| `intended_audience` (سه مقدار) | `IntendedAudience` | ۲۶ | EXACT |
| `EvidenceRef` | `EvidenceRef` | ۲۸–۳۱ | EXACT |
| Payload تشخیص Opportunity | `OpportunityDetectionPayload` | ۳۳–۳۹ | EXACT |
| Payload رکورد تعامل | `InteractionRecordPayload` | ۴۱–۴۴ | EXACT |
| Union نوع Payload کاندید | `EventCandidatePayload` | ۴۶ | EXACT |
| DTO کاندید رویداد (IC-13 ورودی) | `EventCandidateDTO` | ۴۸–۵۹ | EXACT |
| کدهای دلیل رد | `RejectionReasonCode` | ۶۱–۶۷ | EXACT |
| نتیجه‌ی پذیرش | `AdmissionResult` | ۶۹–۷۴ | EXACT |
| وضعیت actor روی یک Opportunity | `OpportunityActorStateDTO` | ۷۶–۷۹ | EXACT |
| DTO فرافکنی Opportunity (خروجی IC-14) | `OpportunityProjectionDTO` | ۸۱–۹۴ | EXACT |
| DTO رویداد خام Opportunity | `OpportunityEventDTO` | ۹۶–۱۱۰ | **NOT IMPLEMENTED** — هیچ سرویسی این DTO را تولید نمی‌کند (به FP-02 موکول شده)؛ نوع فقط تعریف شده |
| رابط ارسال IC-13 | `IC13SubmissionInterface` | ۱۱۲–۱۱۵ | EXACT — پیاده‌سازی واقعی در `EventAdmissionService` |
| زمینه‌ی actor (خروجی FP-03) | `ActorContext` | ۱۱۷–۱۲۱ | EXACT |
| پرس‌وجوی فید Opportunity | `OpportunityFeedQuery` | ۱۲۳–۱۲۸ | EXACT |
| پاسخ فید Opportunity | `OpportunityFeedResponse` | ۱۳۰–۱۳۳ | EXACT |
| رابط خواندن IC-14 | `IC14ReadInterface` | ۱۳۵–۱۴۲ | EXACT — پیاده‌سازی واقعی **هنوز نیست** (FP-02)؛ فقط `MockIC14ReadInterface` (فایل تست) آن را پیاده می‌کند |
| درخواست صفحه‌بندی‌شده | `PaginatedRequest` | ۱۴۴–۱۴۷ | **NOT IMPLEMENTED** — تعریف‌شده اما در هیچ امضای متد واقعی مصرف نشده (صفحه‌بندی واقعی به FP-02/لایه‌ی API موکول است) |
| کد/پاسخ خطای API | `ApiErrorCode`, `ApiErrorResponse` | ۱۴۹–۱۶۰ | **NOT IMPLEMENTED** — هیچ لایه‌ی HTTP/API در Wave 1 وجود ندارد (فقط سرویس‌های TypeScript، بدون Route/Controller)؛ این نوع‌ها برای زمانی که آن لایه ساخته شود آماده‌اند |

## نتیجه

هیچ **DEVIATION** یافت نشد (هیچ نوع مشترک به‌شکلی ناسازگار با تعریف قرارداد پیاده‌سازی نشده). سه مورد **NOT IMPLEMENTED** وجود دارد، هر سه به این دلیل که مؤلفه‌ی مصرف‌کننده‌شان (لایه‌ی HTTP API و FP-02) در دامنه‌ی Wave 1 نبوده — طبق طرح موج‌بندی، نه یک نقص.
