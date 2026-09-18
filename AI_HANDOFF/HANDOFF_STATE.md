HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3B-REVIEW
AUTHOR: CLAUDE
PHASE: M2_3B_REVIEWED_ASTRA_ROUND_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: بخش دوم (M2-3b) پذیرفته شد.
- دامنه تمیز است و منطق پذیرش دست نخورده.
- نگهبان روی نسخه‌ی جدا ۲۳۸ از ۲۳۸ آزمون را قبول کرد و ساخت عادی موفق بود. برگه‌ی شماره‌ی نسخه ساخته می‌شود و شناسه‌اش در برنامه هم نشسته است.
- آزمون زنده‌ی وب‌سرور در یک کانتینر موقت از image موجود (درگاه 127.0.0.1:18443، سپس حذف):
  - nginx -t درست است؛
  - نبود فایل یعنی 404 واقعی؛
  - وقتی فایل هست، JSON با no-store و nosniff برمی‌گردد؛
  - HEAD پاسخ 200 و POST پاسخ 403 می‌گیرد؛
  - version.json با no-store و index با no-cache سرو می‌شوند.
- یادداشت‌ها:
  - G9: مسیرهای دیگر زیر /public-export به صفحه‌ی اصلی می‌روند، که بی‌خطر است.
  - G10: پنجره‌ی ۳۰۰ ثانیه‌ای توزیع با TTL نسخه‌ی دوم برابر است.
  - G11: خطر شکست rename روی ویندوز وقتی فایل باز است.
- دور بازبینی و اشکال‌زدایی مشترک با استرا صادر شد: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-001. محتوا:
  - آزمون سرتاسری بین دو مخزن با کلید آزمایشی؛
  - زمان‌بندی (G10) و قفل فایل ویندوز (G11)؛
  - بازبینی خصمانه.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_3B_AND_ASTRA_ROUND.md
ZIP_PATH: (در این مرحله ساخته نشد)
CODE_COMMIT_SHA: نگهبان codex/v2-public-export-route را در be5577477319c3ef1c8709d478c8c30ea14737e6 منتشر کرد (شاخه‌ی تازه) و ادغام آزمایشی با شاخه‌ی نسخه‌ی دوم تمیز است. بخش اول روی codex/public-export-distribution در f9e4875 است. پیش از این commit، main روی bd48401 بود.
CREATED_AT: 2026-09-18T20:30:00+03:30
NEXT_ACTION: کدکس دور M2-3r را با مدل استرا و TARGET_HANDOFF_ID=HANDOFF-20260918-GUARDIAN-M2-3B-REVIEW اجرا می‌کند. سپس نگهبان آن را بازبینی می‌کند و آزمون‌هایی را که در sandbox کنار گذاشته شده‌اند زیر حساب مالک اجرا می‌کند. بعد مالک برای اعمال واقعی روی میزبان جداگانه اجازه می‌دهد.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3B-REISSUE
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (نقش دائمی)، بازبینی CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-002

MODEL_ROUTING_NOTE: اجرا به‌دست Claude Opus 5 در نقش نگهبان معماری. دور بعدی کدکس با مدل استرا به خواست مالک.

HANDOFF_PRECONDITION_CHECK: پیش از این commit، origin/main روی bd48401 و شاخه‌ی نسخه‌ی دوم روی 540ad2d بود. شاخه‌ی تازه از 540ad2d منشعب شده است.

SCOPE_CONSTRAINT_NOTE: در main فقط بازبینی و فایل‌های AI_HANDOFF تغییر کردند. کانتینر آزمون موقت بود و حذف شد. هیچ کلید واقعی، پوشه‌ی واقعی میزبان، دیتابیس یا کانتینر در حال اجرا لمس نشد.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN هنوز در انتظار بازبینی مستقل ممد است و بخش B آن عمداً اجرا نشده.
