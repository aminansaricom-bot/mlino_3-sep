# گزارش M2-1 — طرح عملیاتی خروجی عمومی امضاشده

تاریخ: ۲۰۲۶-۰۹-۱۸
INSTRUCTION_ID: CODEX-20260918-M2-1-PUBLIC-EXPORT-OPERATIONS-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-M2-1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: `0a7727b0553dc65d9d6f253ebf3726e359069ae5:AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_1_OPERATIONS_DESIGN.md`
BASE: `0a7727b0553dc65d9d6f253ebf3726e359069ae5`
BRANCH: `codex/public-export-operations-design`
وضعیت: `DRAFT_DELIVERED_LOCALLY_AWAITING_GUARDIAN_REVIEW`؛ Push انجام نشده است.

## ۱. کار اجراشده

سند جدید `mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md` با وضعیت DRAFT نوشته شد. برای O1 تا O5 گزینه‌ها، پیامد و یک توصیهٔ مشخص ارائه می‌کند؛ جدول تهدید N1/N2 و محدودیت‌های producer، پنج تصمیم باز مالک، مراحل اجراییِ نیازمند تصویب جدا و فهرست خارج از دامنه را دارد. هیچ تصمیم مالک به‌جای او گرفته یا عملیاتی اجرا نشد.

## ۲. منابع خوانده‌شده و پیش‌شرط

- تصویب پین‌شدهٔ مالک و دستور M2-1؛ `git fetch origin` با `SEC_E_NO_CREDENTIALS` ناموفق بود. GW2-P: `git cat-file -e 0a7727b0553dc65d9d6f253ebf3726e359069ae5^{commit}` خروجی خالی و exit 0؛ `git merge-base --is-ancestor 0a7727b0553dc65d9d6f253ebf3726e359069ae5 origin/main` خروجی خالی و exit 0؛ SHA-256 بایت‌های `git show` برابر `cf87cd901fa2740625de8b369c8cddb718803ab82d5f876ba0c02dcc5c474d78`، مطابق مقدار پین‌شده. `origin/main` همان commit مبنا بود.
- از `origin/main`: `implementation/public-export/{cli,signing,builder,canonical}.ts`، `implementation/package.json`، `implementation/docker-compose.yml`، `mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md` و سند اجرای محلی `mlino2/validation/g8/README.md`.
- از V2 در `540ad2d45f245a1bc5960bfdb15dc21b85f00947`: `mlino2/app/src/publicExport/{RealPublicApp,consumer,transport,trustBundle}.ts*`، `mlino2/app/src/App.tsx`، `mlino2/app/{vite.config.ts,Dockerfile,docker-compose.yml,nginx.conf}`.
- طرح مصرف‌کننده در `0bd14bb:mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md` و بازبینی‌های Guardian برای G14b-2، G14c-1، G14c-2 و G14c-2b و سند ثبت ادغام مصرف‌کننده در V2.

## ۳. فایل‌های تغییریافته

- `mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md` (جدید)
- `AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_1_OPERATIONS_DESIGN_REPORT.md` (جدید)
- `mlino2/HANDOFF/HANDOFF_STATE.md` (فقط افزودنی)

## ۴. فایل‌ها و محیط تغییریافته‌نشده

`implementation/**`، شاخه‌های main و V2، قرارداد FINAL، schema، migration، کد، config و test تغییر نکردند. هیچ کلید واقعی تولید یا خوانده نشد؛ هیچ `.env`، فایل secret یا credential باز نشد. CLI، Docker، پایگاه‌داده، پورت 5435، scheduler، میزبان وب و Push استفاده نشدند. Git config تغییر نکرد.

## ۵. اعتبارسنجی مستندات

- بررسی پنج بخش O1–O5، وضعیت DRAFT، پنج تصمیم باز، جدول تهدید و مراحل نیازمند مجوز.
- اعتبارسنجی ماشینی ۶۷ ارجاع file:line در ۲۰ منبع Git: **۰ مسیر/خط نامعتبر**.
- `git diff --cached --check`: بدون خطا؛ دامنهٔ staged در زمان محاسبهٔ hash فقط سند طراحی بود.
- بازبینی دستیِ جدایی واقعیت مستند از پیشنهاد: مسیر واقعی میزبان، هویت‌ها، ACL و SLA لغو به‌عنوان موارد بررسی‌نشده ثبت شدند.

## ۶. نتیجه و SHA-256

PASS برای تحویل مستنداتی. SHA-256 سند طراحی از **بایت‌های staged Git** (`git show :mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md`) برابر است با:

`e00849edf21889f6492b3ed3ade93c10775bf7f26b311fc5e6c99435b778b295`

تست کد اجرا نشد، چون دستور فقط مستندات را مجاز می‌کند.

## ۷. Commit

Commit تحویل پس از این گزارش فقط به‌صورت محلی روی `codex/public-export-operations-design` ساخته می‌شود؛ شناسهٔ نهایی در پیام تحویل اعلام خواهد شد. Push، merge، rebase و amend انجام نمی‌شوند.

## ۸. ریسک‌ها و حقایق راستی‌آزمایی‌نشده

به‌سبب ممنوعیت دسترسی محیطی، وضعیت واقعی میزبان/کانتینرها، محل و ACL artifact، هویت سرویس‌های producer/web، وجود و سازگاری secret store با `KeyObject`، نام URL/DNS/TLS عملیاتی، CORS/cache در مسیر واقعی و زمان reload تب‌های باز **راستی‌آزمایی نشدند**. سند از روی repo دربارهٔ این موارد فقط گزینه و آزمون پیشنهادی می‌دهد. با bundle همراه build، زمان لغو کلید برای تب باز بدون سازوکار refresh/reload قابل تضمین نیست؛ این مانعِ بهره‌برداری واقعی تا تصمیم و آزمون بعدی است.

## ۹. پرسش‌های باز

O1 محل کلید و adapter؛ O2 مسیر هم‌مبدأ و host؛ O3 runner و پایش؛ O4 سقف زمانی لغو، تب‌های باز و standby؛ O5 ACL و staging. همه برای تصمیم مالک بازند. جزئیات استقرار واقعی پس از مشاهدهٔ مجاز میزبان باید در CCR اجرایی ثبت شوند.

## ۱۰. گام بعدی پیشنهادی

Guardian سند و ارجاع‌ها را بازبینی کند، سپس مالک O1–O5 را تصمیم بگیرد. M2-2 (کلید)، M2-3 (مسیر) و M2-4 (زمان‌بندی و drill) هر کدام مجوز مستقل می‌خواهند. Codex پس از commit محلی متوقف می‌شود.

من کدکس هستم
