-- CCR «نوع مالکیت» — مصوب مالک محصول (۵ سپتامبر ۲۰۲۶)
-- مرجع: implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_OWNERSHIP_TYPE.md
-- مبنای سیاستی: V1_MINIMUM_AC2_ACCESS_POLICY.md v1.1 (§۴ تصمیم مالک محصول، قواعد ۳/۴/۶)
--
-- یادداشت الزامی درباره‌ی Backfill (طبق بند ۶ CCR و بند ۱.۳ دستور CODEX-20260906-0019):
--   مقدار 'ORGANIZATIONAL' که از طریق DEFAULT روی تمام ردیف‌های *موجود* نشسته،
--   «مشتق از سیاست مصوب مالک محصول» است، نه «ثبت‌شده در لحظه‌ی تولید داده».
--   Kernel §۱۰ حالت ایده‌آل را «تعیین صریح در لحظه‌ی تولید» می‌داند؛ برای ردیف‌های
--   تاریخی این ممکن نیست، پس سیاست مصوب (§۴.۱ سند طراحی: «اطلاعاتی که در فضای
--   بیزنس کلینیک شکل می‌گیرد، متعلق به همان بیزنس است») به‌عنوان مبنا اعمال شده.
--   این یک فرض خودسرانه نیست، اما تمایزش نباید بعداً گم شود.
--   ردیف‌های *جدید* پس از این Migration، مقدار را در مرز Admission (لحظه‌ی پذیرش)
--   می‌گیرند — فاز ۱ مصوب.

CREATE TYPE "OwnershipType" AS ENUM ('ORGANIZATIONAL');

ALTER TABLE "event_log"
  ADD COLUMN "ownership_type" "OwnershipType" NOT NULL DEFAULT 'ORGANIZATIONAL';

ALTER TABLE "opportunity_current_state"
  ADD COLUMN "ownership_type" "OwnershipType" NOT NULL DEFAULT 'ORGANIZATIONAL';
