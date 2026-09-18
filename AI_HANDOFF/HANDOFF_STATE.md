HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3B-REISSUE
AUTHOR: CLAUDE
PHASE: M2_3B_REISSUED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: دستور بخش دوم (M2-3b) هنوز شروع نشده بود. بازبینی بخش اول (M2-3a) آن را کهنه کرده بود، پس بدون تغییر محتوا با نشانی‌های تازه دوباره صادر شد:
- شناسه‌ی تازه CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-002، جایگزین نسخه‌ی ۰۰۱.
- به خواست مالک، متن دستورهای کدکس انگلیسی می‌ماند و بقیه‌ی نوشته‌ها فارسی‌اند.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_REISSUE_M2_3B_V2_ROUTE.md
ZIP_PATH: (در این مرحله ساخته نشد)
CODE_COMMIT_SHA: بدون کد؛ فقط ثبت دستور. پیش از این commit، main روی 9864439 بود. بخش اول روی شاخه‌ی codex/public-export-distribution در f9e4875 پذیرفته شده است.
CREATED_AT: 2026-09-18T19:40:00+03:30
NEXT_ACTION: کدکس بخش دوم را با TARGET_HANDOFF_ID=HANDOFF-20260918-GUARDIAN-M2-3B-REISSUE و مدل سول اجرا می‌کند. سپس نگهبان آن را بازبینی می‌کند. بعد دور مشترک بازبینی و اشکال‌زدایی با استرا برای هر دو بخش صادر می‌شود. در پایان، مالک برای اعمال واقعی روی میزبان جداگانه اجازه می‌دهد.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3A-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (نقش دائمی)، صدور دوباره‌ی M2-3b به فارسی

MODEL_ROUTING_NOTE: اجرا به‌دست Claude Opus 5 در نقش نگهبان معماری.

HANDOFF_PRECONDITION_CHECK: origin/main روی 9864439 است و شاخه‌ی نسخه‌ی دوم روی 540ad2d.

SCOPE_CONSTRAINT_NOTE: فقط این ثبت و فایل‌های AI_HANDOFF در main تغییر کردند.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN هنوز در انتظار بازبینی مستقل ممد است و بخش B آن عمداً اجرا نشده.
