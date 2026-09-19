HANDOFF_ID: HANDOFF-20260919-GUARDIAN-S1B-APPROVED-P1
AUTHOR: CLAUDE
PHASE: S1_APPROVED_P1_002_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: به‌روزرسانی: P1-001 در B2 به‌خاطر برچسب زمانی با تقویم شمسی ویندوز متوقف شد؛ دیتابیس بی‌تغییر ماند و شاخه در b4e851c است. P1-002 با قاعده‌ی InvariantCulture صادر شد (AI_HANDOFF/CLAUDE_REVIEWS/20260919_P1_002_INVARIANT_TIMESTAMP.md). شناسه‌ی Handoff عمداً عوض نشد. — S1 و S1b پذیرفته شدند (شاخه‌ی codex/test-seed-vanak در 228a95f). نگهبان روی دیتابیس دور‌ریختنی 5499 اجرا کرد:
- آزمون‌های ابزار: ۱۸ از ۱۸، سه بار روی دیتابیس تازه.
- بازآزمایی: ۱۹۴ از ۱۹۴.
- تمرین با ۱۵ کسب‌وکار واقعی: ۱۵ ساخته شد؛ اجرای دوم ۰ ساخته و ۱۵ رد شد؛ فایل عمومی دقیقاً ۱۵ رکورد داشت (۱۲ با مختصات، ۷ با ساعت، ۱۰ توانمندی)؛ برچسب آزمایشی روی همه.
- یادداشت‌ها:
  - S1-N1: آزمون یکپارچه فقط روی دیتابیس تازه درست کار می‌کند.
  - S1-N2: پوشه‌ی tools در tsconfig نیست، پس برای P1 ساخت موقت با tsc انجام می‌شود.
اجازه‌ی پیشاپیش P1 فعال شد. دستور CODEX-20260919-P1-SEED-LOCAL-DB-001 با مدل سول صادر شد:
- یک اجرا روی 5435؛
- پشتیبان‌گیری B1 تا B6؛
- C0 فقط در حافظه؛
- بررسی فقط‌خواندنی پیش و پس.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_S1B_AND_P1.md
ZIP_PATH: (در این مرحله ساخته نشد)
CODE_COMMIT_SHA: نگهبان codex/test-seed-vanak را با lease پیشروی از 425b716 به 228a95f8c80d85f311305021cf93fb191e1cf2bc برد. پیش از این commit، main روی a3d9fbe بود.
CREATED_AT: 2026-09-19T15:00:00+03:30
NEXT_ACTION: کدکس P1 را اجرا می‌کند. سپس نگهبان دیتابیس و پشتیبان را مستقل و فقط‌خواندنی بازبینی می‌کند. بعد P2 انجام می‌شود، که پیش از آن باید حساب زمان‌بند (G5) و هویت خواننده‌ی داکر (G7) روشن شوند.
OWNER_ADVANCE_GRANT (2026-09-19): P1 فعال است. P2 و C0 برای همین دو کار معتبرند. ثبت: AI_HANDOFF/CLAUDE_REVIEWS/20260919_OWNER_ADVANCE_GRANT_SEED_AND_TEST_LAUNCH.md
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-L-MERGED
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (نقش دائمی)، بازبینی CODEX-20260919-S1B-TEST-SEED-ACTIVATE-002 و صدور P1

MODEL_ROUTING_NOTE: اجرا به‌دست Claude Opus 5 در نقش نگهبان معماری.

HANDOFF_PRECONDITION_CHECK: پیش از این commit، origin/main روی a3d9fbe بود. شاخه‌ی S1 شامل main در 7d30d1e است. دیتابیس محلی 5435 در این بازبینی لمس نشد.

SCOPE_CONSTRAINT_NOTE: در main فقط بازبینی و فایل‌های AI_HANDOFF تغییر کردند. دیتابیس دور‌ریختنی حذف شد و داده‌ی واقعی فقط در آن و در حافظه بود.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN هنوز در انتظار بازبینی مستقل ممد است و بخش B آن عمداً اجرا نشده.
