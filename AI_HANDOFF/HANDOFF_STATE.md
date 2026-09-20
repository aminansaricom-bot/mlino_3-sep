HANDOFF_ID: HANDOFF-20260920-GUARDIAN-P1-VERIFIED-P2-LIVE
AUTHOR: CLAUDE
PHASE: P1_VERIFIED_P2_TEST_LAUNCH_RUNNING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: P1 پذیرفته شد و P2 اجرا شد.
- P1 (commit کدکس 3ecf7f5): بازبینی مستقل و فقط‌خواندنی نگهبان روی دیتابیس محلی: ۱۵ سازمان آزمایشی، ۱۵ نمایه‌ی ACTIVE با برچسب، ۱۰ توانمندی ACTIVE و تأییدشده، ۱۵ ادعای VERIFIED، ۲۵ رویداد انتشار، صفر ردیف غیرآزمایشی، ۸ migration، ۱۳ trigger، ۳۰ CHECK، کانتینرها بدون restart، API با 401.
- P2 را نگهبان اجرا کرد، چون DPAPI به حساب گره خورده است (G5) و کدکس نمی‌تواند. مالک اجازه داد نگهبان خط DATABASE_URL را فقط برای P2 در حافظه بخواند.
  - کلید آزمایشی pb-v1-20260920-dbef05fbc08935dd در DPAPI حساب مالک؛ keystore و فهرست کلید عمومی در C:/mlino code/_KEYS_TEST، بیرون از مخزن.
  - پوشه‌ی عمومی C:/mlino code/_PUBLIC_EXPORT با ACL صریح و وراثت خاموش؛ اسکریپت verify تأیید کرد.
  - ساخت فایل امضاشده با ۱۵ رکورد و رساندن بایت‌به‌بایت به پوشه‌ی عمومی.
  - حلقه‌ی موقت هر ۶۰ ثانیه: CYCLE_OK.
  - نسخه‌ی دوم از e26c525 با کلید عمومی ساخته شد؛ کانتینر mlino2-p2-web روی 0.0.0.0:8443؛ nginx -t درست و همه‌ی مسیرها درست.
  - راستی‌آزمایی امضا مثل مرورگر: کلید در فهرست، بایت‌ها canonical، امضا معتبر، ۱۵ رکورد، سن ۳۱ ثانیه و داخل اعتبار ۳۰۰ ثانیه.
  - نشانی گوشی روی همان شبکه: https://192.168.1.65:8443/
- کلید واقعی ساخته نشد و زمان‌بند دائمی نصب نشد. C0 با پایان P2 منقضی می‌شود.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260920_CLAUDE_P1_VERIFIED_AND_P2_TEST_LAUNCH.md
ZIP_PATH: (در این مرحله ساخته نشد)
CODE_COMMIT_SHA: بدون تغییر کد. شاخه‌ی codex/test-seed-vanak روی سرور در cee6dbe است و commit اجرای P1 کدکس (3ecf7f5) هنوز منتشر نشده. main پیش از این commit روی cdd39b6 بود.
CREATED_AT: 2026-09-20T05:00:00+03:30
NEXT_ACTION: مالک نسخه‌ی دوم را روی گوشی باز می‌کند (https://192.168.1.65:8443/ با یک بار پذیرش هشدار گواهی). سپس، هر کدام با اجازه‌ی جدا: پاک‌سازی پس از آزمایش، کلید واقعی و زمان‌بند دائمی (M2-4)، و در نهایت تصمیم دسترسی بیرون از شبکه‌ی محلی.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-S1B-APPROVED-P1
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (نقش دائمی)، بازبینی P1 و اجرای P2 طبق اجازه‌ی پیشاپیش مالک

MODEL_ROUTING_NOTE: اجرا به‌دست Claude Opus 5 در نقش نگهبان معماری.

HANDOFF_PRECONDITION_CHECK: پیش از P2، دیتابیس ۱۵ سازمان آزمایشی داشت و هیچ ردیف غیرآزمایشی تغییر نکرده بود. کانتینر قدیمی نسخه‌ی دوم (app-mlino2-web-1) دست نخورد و کانتینر تازه نام جدا دارد.

SCOPE_CONSTRAINT_NOTE: در main فقط این ثبت و فایل‌های AI_HANDOFF تغییر کردند. کلید، keystore، فایل عمومی و لاگ‌های P2 همه بیرون از مخزن‌اند و commit نمی‌شوند.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN هنوز در انتظار بازبینی مستقل ممد است و بخش B آن عمداً اجرا نشده.
