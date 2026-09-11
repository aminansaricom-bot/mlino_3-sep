INSTRUCTION_ID: OWNER-20260911-V2-INTENT-FLOW-FOUNDATION
RECORDED_BY: CODEX
STATUS: IN_PROGRESS
TARGET_HANDOFF_ID: HANDOFF-20260909-V2-ASTRA-STAGE2
TARGET_REPORT_PATH: mlino2/HANDOFF/20260909_ASTRA_STAGE2_REPORT.md
TARGET_REPORT_SHA256: 2d828ac641e7e82bdfb124be6560815e456054b5c79606744e29be9340a9392b
ASSISTANT_BASELINE_COMMIT: 76a0537440dee048ace18664f0be6fbee3f726dc
BRANCH: codex/v2-intent-flow-foundation

# ثبت دستور مالک — بنیاد جریان Intent

شناسه توسط Codex برای ردیابی تخصیص یافته؛ متن پیام مالک شناسه نداشت.

مالک تکمیل Core، رضایت، نشست، Assistant و قواعد visibility/expiration را تأیید کرده و پیاده‌سازی فقط Intent Flow Foundation را خواسته است. فایل‌های این مبنا هنوز در پوشه استرا ثبت نشده بودند؛ نسخه دقیق آن‌ها با چک‌سام در کامیت مبنای مستقل حفظ شد. تحویل قدیمی Stage 2 بازنویسی نمی‌شود و مبنای اجرایی جدید با آن یکسان فرض نمی‌شود.

مجاز: حالت‌ها و چرخه Intent، ساخت و ویرایش candidate، تأیید revision مشخص، اصلاح/رد، انقضا و پاک‌سازی با پایان نشست، اتصال به Assistant موجود، تست و مستندات.

حالت‌ها: empty، collecting، interpreted، awaiting_confirmation، confirmed، expired، cancelled.

ممنوع: Matching، Ranking، Context scoring، Business lookup، V1 connector، Directory یا Mock Adapter جدید، LLM، persistence، حافظه بلندمدت، AR، ویترین یا Marketplace. canMatch باید false بماند؛ Intent هیچ دسترسی داده کسب‌وکار ایجاد نمی‌کند. قراردادهای V1 و شاخه main دست‌نخورده‌اند.

C-03 و C-04 دوباره طراحی نمی‌شوند. اجازه محلی این نمونه جایگزین کنترل دسترسی عضویت سازمانی V1 نیست.

اسناد پیش از تغییر کد خوانده شدند: V2_TECHNICAL_ARCHITECTURE_DESIGN، V2_IMPLEMENTATION_TASKS، V2_IMPLEMENTATION_PLAN و پیاده‌سازی واقعی Assistant Foundation. برنامه عمومی Local Discovery دامنه وسیع‌تری دارد؛ دستور فعلی فقط بنیاد Intent را مجاز می‌کند.

معیار تحویل: npm test، npx tsc -b، npm run build، حفظ تست‌های موجود، بررسی مرز persistence/network و اعلام دامنه دقیق. پس از تحویل برای بازبینی توقف شود.

بررسی چک‌سام تحویل قدیمی: SHA-256 بالا دقیقاً با بایت‌های Git blob و نسخه LF گزارش منطبق است. checkout ویندوز همان فایل را با CRLF و چک‌سام 46029d0f83b87d0c649d26cd7c789a0f7bace721c72896e7eaa5b2896b473fc5 دارد؛ پس از حذف CR در پایان‌خط، چک‌سام دقیق مرجع حاصل می‌شود. اختلاف محتوا وجود ندارد؛ هیچ checksum یا گزارش تاریخی بازنویسی نشد.
