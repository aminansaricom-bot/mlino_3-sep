HANDOFF_ID: HANDOFF-20260906-COMPOSITION-ROOT-DESIGN
AUTHOR: CLAUDE
PHASE: V1_COMPOSITION_ROOT_DESIGN
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
EXECUTED_INSTRUCTION_ID: CODEX-20260906-0056-CCR-ADAPTER-REVIEW
PREVIOUS_HANDOFF_ID: HANDOFF-20260906-CCR-APPLY-AC2-ADAPTER
DELIVERABLE_PATH: C:\mlino code\V1_COMPOSITION_ROOT_DESIGN.md
DELIVERABLE_SHA256: 16b1c166c5f706d92b7f469bd36289afb2087e1758133ac1e459a8dd5ea586de

---

# گزارش — طراحی Composition Root برای V1 (فقط طراحی، صفر کد)

## ۱. دستور اجراشده و تطبیق

`CODEX-20260906-0056-CCR-ADAPTER-REVIEW` بند ۶. **تطبیق قبل از اجرا:** `TARGET_HANDOFF_ID` (`HANDOFF-20260906-CCR-APPLY-AC2-ADAPTER`) و `TARGET_REPORT_SHA256` (`b85b23006826fd3b81fe13456d8beeeabf4679cbab8e2a87f0fea1973ffbed30`) با `HANDOFF_STATE.md` وقت اجرا دقیقاً منطبق بودند.

همچنین ثبت می‌شود: بازبینی مستقل ممد روی دو مرحله‌ی قبلی (اعمال CCR + Adapter واقعی) **تایید کامل** بود و هر پنج تصمیم فرامرزی من پذیرفته شد.

## ۲. تحویل

یک سند: `V1_COMPOSITION_ROOT_DESIGN.md` (SHA-256: `16b1c166c5f706d92b7f469bd36289afb2087e1758133ac1e459a8dd5ea586de`)، در مسیر ریشه طبق **الگوی موجود** فایل‌های `V1_*.md` (هم‌خانواده با `V1_MINIMUM_AC2_ACCESS_POLICY.md`) — هیچ ساختار پوشه‌ای جدیدی اختراع نشد.

محتوا طبق پنج بند دستور: بند ۰ بازخوانی واقعیت کد، بند ۱ گزینه‌ها با مثبت/منفی و پیشنهاد، بند ۲ ترتیب قطعی اتصال، بند ۳ تشخیص CCR، بند ۴ صراحت درباره‌ی آنچه نیست، بند ۵ سوالات باز.

## ۳. یافته‌ی تعیین‌کننده‌ی این پاس (نه صرفاً اجرای دستور)

بررسی مستقیم کدبیس یک تفکیک آشکار کرد که در صورت‌مسئله‌ی دستور نبود و کل تصمیم به آن وابسته است:

**مسئله یک تکه نیست، دو تکه است.**

- **سمت خواندن (Feed/Briefing) امروز واقعاً قابل‌سیم‌کشی است.** همه‌ی قطعات واقعی‌اند: جداول Projection، `OpportunityReadService`، Adapter واقعی AC-2، و `resolveActorContext`. فقط لایه‌ی ورود و نگاشت JWT غایب است.
- **سمت تشخیص (Value Engineها) امروز قابل‌سیم‌کشی به داده‌ی واقعی نیست.** هر سه Repository (`CapacityRepository`, `CancellationRepository`, `FollowupRepository`) **فقط پیاده‌سازی In-Memory دارند**؛ هیچ Connector واقعی به داده‌ی Malino ساخته نشده. یک Scheduler امروز، Detectorها را روی آرایه‌های خالی می‌چرخاند — چرخه‌ای که کار می‌کند اما کاری نمی‌کند.

این یافته مستقیماً روی توصیه اثر گذاشت: گزینه‌های Scheduler/Worker (۲ و ۳) امروز مسئله‌ی محرک را حل نمی‌کنند و در عوض کدی می‌سازند که به داده‌ی واقعی وصل نیست.

## ۴. سایر شواهد بازخوانی‌شده (مستقیم، نه از حافظه)

- هیچ `index.ts`/`main.ts`/`server.ts`/`app.ts` در `implementation/` وجود ندارد.
- `package.json` هیچ script اجرایی ندارد؛ هیچ فریم‌ورک HTTP نصب نیست (وابستگی‌های تولیدی: `@prisma/client`, `jsonwebtoken`, `uuid`).
- `eventAdmissionService` یک نمونه‌ی سراسری واقعی است و آماده‌ی استفاده.
- `AiSummarizer` هیچ پیاده‌سازی واقعی ندارد — اما وابستگی **اختیاری** بریفینگ است، پس مسدودکننده نیست.
- `issueTokenForTesting` تنها مسیر تولید توکن است — یعنی **هیچ صادرکننده‌ی واقعی JWT وجود ندارد** (سوال باز ۲ سند).

## ۵. تشخیص CCR

**نیازی به CCR یا تغییر فایل منجمد نیست.** جدول مورد‌به‌مورد در بند ۳ سند: هر چهار قطعه (`OpportunityReadService`، `resolveActorContext`، `OpportunityFeedService`، `ProactiveBriefingService`) از قبل Interface/Constructor مناسب تزریق دارند. این یک Implementation Design خالص است — ترکیب، نه قرارداد جدید.

**مشروط ثبت شد:** اگر در زمان پیاده‌سازی چیزی واقعاً نیازمند تغییر قرارداد شد، قاعده همان است — CCR، نه پچ.

## ۶. یک نکته‌ی امنیتی که در طراحی صریح شد

`getOpportunityById` عمداً برای «وجود ندارد» و «مجاز نیستی» **هر دو `null`** برمی‌گرداند (بدون Existence Oracle — با تست موجود تضمین‌شده). در طراحی صریح ثبت کردم که مرز HTTP باید این را حفظ کند و **هر دو را ۴۰۴ یکسان** بدهد، نه ۴۰۳ در برابر ۴۰۴ — وگرنه لایه‌ی ورودی همان نشتی را برمی‌گرداند که لایه‌ی خواندن عمداً بسته است.

## ۷. شواهد «صفر کد»

- `npx tsc --noEmit` → CLEAN (Exit 0).
- `npm test` → **۱۴۶/۱۴۶** — دقیقاً همان عدد پاس قبل، یعنی هیچ کدی لمس نشده.
- **Drift صفر دو فایل منجمد** نسبت به پاس قبل: `shared-contracts/types.ts` = `bc0ca61e...`، `prisma/schema.prisma` = `673b8220...` (مقادیر پس‌از‌CCR، بدون تغییر).
- هیچ فایلی در `implementation/`، هیچ فایلی در `mlino2/`.

## ۸. آنچه عمداً انجام نشد

- **هیچ Composition Root، هیچ Entry Point، هیچ فایل اجرایی ساخته نشد.**
- **هیچ گزینه‌ای انتخاب نشد.** بند ۱ سند فقط گزینه‌ها را با مثبت/منفی و یک پیشنهاد صریحاً غیرالزام‌آور ارائه می‌دهد؛ تصمیم با مالک محصول.
- **هیچ سوال بازی جواب داده نشد** — شش سوال در بند ۵ سند فهرست شده‌اند، بدون پاسخ.
- **هیچ کار V2.**
- **هیچ طراحی برای Connector Malino** — پیش‌نیاز شناسایی و ثبت شد، اما طراحی‌اش خارج از دامنه‌ی این دستور بود.

## ۹. اقدام بعدی

**متوقف می‌شوم.** زنجیره: بازبینی مستقل ممد → تصمیم مالک محصول روی گزینه‌ها (و اولویت Connector) → فقط بعد از آن، مجوز کد.

گپ‌های باز بدون تغییر: R4 (BLOCKED)، R5 (OPEN عمدی)، R8-a/R8-b (OPEN).
