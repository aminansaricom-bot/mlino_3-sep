# گزارش تحویل گیت پیش از پیاده‌سازی Prisma

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**INSTRUCTION_ID:** `CODEX-20260912-PRISMA-PREIMPLEMENTATION-GATE-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**سند:** `mlino2/MLINO_PRISMA_PRE_IMPLEMENTATION_GATE_REPORT.md`  
**SHA-256 سند:** `f7845fc54bce85ce94faaf1fef54a563bdfa9a11ad3d681927eae8eb20dfe51d`  
**وضعیت:** `BLOCKED_BEFORE_SCHEMA_IMPLEMENTATION`

## نتیجه

گیت نهایی قبل از ایجاد `schema.prisma` آماده شد. طراحی منطقی آمادهٔ تبدیل است، اما G1 اعتبارسنجی PostgreSQL، G2 همگام‌سازی مبنا و حفظ `ExternalWorkspaceLink`، و G3 CCR مصوب هنوز بسته نشده‌اند.

## پوشش گزارش

- C15، سازگاری Publication و الزامات تراکنش؛
- `ON DELETE RESTRICT` و `ON UPDATE RESTRICT` و قواعد حفظ تاریخچه؛
- وضعیت branch/Handoff و عدم مجوز merge/rebase؛
- تصمیم‌های لازم برای CCR، نام‌گذاری، migration و Prisma Client؛
- الزامات traceability و معیار بازشدن گیت.

## اعتبارسنجی

- سند با همهٔ بخش‌های درخواستی ایجاد شد.
- سند با وضعیت نهایی `BLOCKED_BEFORE_SCHEMA_IMPLEMENTATION` پایان می‌یابد.
- هیچ schema، migration یا backend تغییر نکرد.
- هیچ merge، rebase یا cherry-pick انجام نشد.
- `main` تغییر نکرد.
- سه فایل untracked قدیمی دست‌نخورده باقی ماندند.

## اقدام بعدی

پس از تأیید مالک، G1، G2 و G3 با Handoff جداگانه و evidence کامل اجرا شوند. تا آن زمان ایجاد `schema.prisma` ممنوع است.

من کدکس هستم.
