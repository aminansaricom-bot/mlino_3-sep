INSTRUCTION_ID: CODEX-20260906-1800-COMPOSITION-HTTP-READ-AUTH
AUTHOR: CODEX
STATUS: EXECUTED
EXECUTED_BY: CLAUDE
EXECUTED_AT: 2026-09-06T19:15:00
RESULTING_HANDOFF_ID: HANDOFF-20260906-HTTP-READ-API
TARGET_HANDOFF_ID: HANDOFF-20260906-COMPOSITION-ROOT-DESIGN
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260906_COMPOSITION_ROOT_DESIGN_REPORT.md
TARGET_REPORT_SHA256: 4e01b081cad3a2f9e2e77b0a1c31581f983b06b680d45e60f1cfdfe2acee19de
TARGET_ZIP_PATH: (none)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-06T18:00:00
AUTHORIZATION_SCOPE: IMPLEMENT_OPTION4_HTTP_READ_SIDE_ONLY_JWT_FROM_MALINO_NO_DETECTION_NO_CONNECTOR

---

# مجوز فاز: پیاده‌سازی گزینه ۴ — لایه‌ی ورود HTTP فقط-خواندن، JWT از Malino

**صادرکننده:** ممد (بازبین مستقل، GLM 5.3 Flash) — بر پایه‌ی تصمیم صریح مالک محصول (۶ سپتامبر ۲۰۲۶): گزینه ۴ سند تو + JWT از Malino + اولویت بعدی = طراحی Connector.

## ۰. تصمیمات مصوب مالک محصول

1. **گزینه ۴:** لایه‌ی ورود HTTP فقط-خواندن (Feed + By-Id) حالا؛ مسیر تشخیص بعد از ساخت Connector Malino.
2. **صادرکننده‌ی JWT = Malino؛ V1 فقط تایید می‌کند** (`resolveActorContext`). V1 هیچ صفحه‌ی ورود/صدور توکنی ندارد — ساخت آن دامنه‌ی جدید است و بدون تصمیم جداگانه شروع نمی‌شود.
3. اولویت بعدی پس از این فاز: طراحی Connector Malino (دستور جداگانه).
4. سوالات Secret/بسامد/Deploy به مرحله‌ی خودشان موکول شد.

## ۱. محدوده‌ی مجاز این فاز

### ۱.۱. Composition Root + لایه‌ی HTTP فقط-خواندن
- دقیقاً طبق §۲.۱ سند طراحی (ترتیب تایید‌شده): HTTP + Authorization header → `resolveActorContext` (خطا → 401 بدون افشای دلیل) → `new OpportunityReadService(orgMembershipAC2DecisionPort)` یک‌بار در Composition Root → `getOpportunityFeed` / `getOpportunityById` → پاسخ.
- مصرف‌کنندگان: `OpportunityFeedService` (برای ثبت تعامل)، `ProactiveBriefingService` (aiSummarizer اختیاری) — اگر در این فاز سیم‌کشی شدند، همان الگو؛ اگر نه، صریح بگو چه چیزی به فاز بعد موکول شد.
- **Existence Oracle — الزام امنیتی:** `getOpportunityById` برای «وجود ندارد» و «مجاز نیستی» هر دو null می‌دهد؛ مرز HTTP **هر دو را 404 یکسان** می‌دهد. 403 فقط برای خطای Authorization متمایز از وجود. تست الزامی دارد.
- نگاشت خطا: AuthenticationError → 401؛ AuthorizationError → 403؛ ناشناخته → 500 بدون جزئیات داخلی.
- Composition Root یک ماژول تک‌نقطه‌ای (نه new پراکنده) + پیکربندی env (`DATABASE_URL`، `MLINO_JWT_SECRET` fail-closed موجود، پورت) + graceful shutdown برای Prisma.
- **وابستگی:** کمترین وابستگی ممکن — ترجیح بازبین: `node:http` داخلی بدون فریم‌ورک جدید (API فقط‌خواندنی کوچک است). اگر فریم‌ورک خواستی، استدلال در گزارش + تایید بازبینی.
- فقط مسیرهای خواندن + ثبت تعامل (که IC-13/IC-14 را کامل می‌کند). **هیچ مسیر تشخیص/Scheduler/Worker** — آن پس از Connector با دستور جداگانه.

### ۱.۲. تست الزامی (Postgres واقعی + تست HTTP واقعی)
- 401 با توکن غایب/نامعتبر/منقضی.
- Feed فقط فرصت‌های همان سازمان + فقط عبورکرده از AC-2 + فیلتر audience + ترتیب گروه/مرتب‌سازی درست.
- By-Id: 404 یکسان برای «ناموجود» و «سازمان دیگر» (تست Existence Oracle — هر دو دقیقاً 404).
- 403 فقط برای AuthorizationError متمایز؛ 500 بدون افشای جزئیات.
- مرحله‌ی تعامل (SEEN/ACKNOWLEDGED/DISMISSED) از مسیر HTTP کار کند.
- graceful shutdown تست شود.
- کل `npm test`: ۱۴۶ قبلی بدون Regression + جدیدها — یک اجرا، بدون Retry.

## ۲. ممنوعیت‌ها

- هیچ مسیر تشخیص/Scheduler/Worker/Connector در این فاز.
- دو فایل منجمد: دست‌نخورده (Composition نیاز CCR ندارد — تشخیص سند تایید شد؛ اگر خلاف ثابت شد: CCR نه پچ).
- `evaluateAC2FailClosed`، `OpportunityReadService`، Featureها، `jest.config.js`، `mlino2/` — دست‌نخورده.
- هیچ Secret واقعی در ریپو؛ MLINO_JWT_SECRET فقط env.
- هیچ ادعای «تولیدی امن» — بدون Deploy مصوب این پل localhost/آزمایشی است (بند ۴ سند).

## ۳. تعریف Done

- همه‌ی تست‌های بند ۱.۲ + `tsc --noEmit` تمیز + کل مجموعه سبز.
- گزارش کامل: فایل‌های تغییر + چک‌سام + Drift صفر دو فایل منجمد (مرجع: `bc0ca61e...`/`673b8220...`) + استدلال وابستگی HTTP + صراحت آنچه موکول شد.
- HANDOFF_ID جدید، CLAUDE_LATEST_REPORT، HANDOFF_STATE، Push دو-Commit با Hash واقعی در پاسخ نهایی به کاربر.
- تناقض با سطوح ۱–۵ اقتدار → متوقف شو، CCR/ACR — حدس نزن.

## ۴. شرط توقف

بعد از گزارش + Push، کاملاً متوقف شو — بازبینی مستقل را ممد جداگانه انجام می‌دهد. فاز بعدی (Connector Malino) با دستور جداگانه باز می‌شود.

---
*بازبین: ممد (GLM 5.3 Flash) — R4 (BLOCKED)، R5 (OPEN)، R8-a/b (OPEN)، Connector: فاز بعدی.*
