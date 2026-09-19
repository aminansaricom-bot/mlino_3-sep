HANDOFF_ID: HANDOFF-20260918-GUARDIAN-SIGNATURE-FIX-MERGED
AUTHOR: CLAUDE
PHASE: F1_FIXED_ON_MAIN_M2_3R_003_AND_S1_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: دو دستور موازی زیر همین شناسه‌ی Handoff معتبرند. شناسه عمداً عوض نشد تا دستور ۰۰۳ که ممکن است در حال اجرا باشد کهنه نشود.
۱. دور استرا M2-3R-004 **پایان یافت و پذیرفته شد**. بازبینی: AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_M2_3R_004.md.
   - نگهبان زیر حساب مالک اجرا کرد: نسخه‌ی اول ۳۷ از ۳۷ بدون skip، نسخه‌ی دوم ۲۴۱ از ۲۴۱.
   - شاخه‌ها منتشر شدند: V1 در 6c5b664 و V2 در d8ad6e3. ادغام آزمایشی هر دو تمیز است.
   - در انتظار تصمیم مالک: M3-1 ادغام در main و M3-2 ادغام در شاخه‌ی نسخه‌ی دوم.
۲. CODEX-20260918-S1-TEST-SEED-TOOL-001 (مدل سول): تازه صادر شد. مرجع آن AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_TEST_SEED_TOOL.md است.
   - تصویب مالک در گفت‌وگو: «ساخت ابزار وارد کردن داده‌ی آزمایشی مجاز است.»
   - ورودی: C:\mlino code\_TEST_DATA\vanak_businesses.json، بیرون از مخزن؛ ۱۵ کسب‌وکار بررسی‌شده.
   - تصمیم‌های نگهبان:
     - S1-D1: روزهای ISO 8601، شنبه=6، با Asia/Tehran.
     - S1-D2: برچسب آزمایشی test-vanak-NN.
     - S1-D3: فقط سرویس‌های رسمی Core.
     - S1-D4: تأییدکننده‌ی آزمایشی فقط با پرچم صریح و localhost.
     - S1-D5: پاک‌سازی فقط با withdraw.
   - اجرا فقط روی دیتابیس آزمایشی 5499.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_TEST_SEED_TOOL.md
ZIP_PATH: (در این مرحله ساخته نشد)
CODE_COMMIT_SHA: اصلاح امضا در main برابر 4c8866c است. شاخه‌ها: codex/public-export-distribution در b4ac4ce و codex/v2-public-export-route در a809c2f.
CREATED_AT: 2026-09-18T22:10:00+03:30
NEXT_ACTION: کدکس دو دستور بالا را جداگانه اجرا می‌کند و نگهبان هر کدام را بازبینی می‌کند. اجرای S1 روی دیتابیس محلی 5435 به اجازه‌ی جداگانه‌ی مالک، پشتیبان‌گیری و اجازه‌ی خواندن نشانی دیتابیس فقط در حافظه نیاز دارد. اعمال روی میزبان هم اجازه‌ی جداگانه می‌خواهد.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3R-PARITY-STOP
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (نقش دائمی)، اصلاح و ادغام امضا به دستور مالک، سپس ثبت تصویب S1

MODEL_ROUTING_NOTE: اجرا به‌دست Claude Opus 5 در نقش نگهبان معماری.

HANDOFF_PRECONDITION_CHECK: origin/main روی f3ebbff بود. سرویس‌های Core برای bootstrap، claim، verification، profile، capability و publication در implementation/core وجود دارند.

SCOPE_CONSTRAINT_NOTE: در main فقط ثبت‌ها و فایل‌های AI_HANDOFF تغییر کردند. فایل داده‌ی آزمایشی بیرون از مخزن است و commit نمی‌شود.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN هنوز در انتظار بازبینی مستقل ممد است و بخش B آن عمداً اجرا نشده.
