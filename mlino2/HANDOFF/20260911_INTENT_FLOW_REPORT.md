# گزارش تحویل بنیاد جریان Intent

تاریخ: ۱۱ سپتامبر ۲۰۲۶  
نویسنده: Codex  
وضعیت: آمادهٔ بازبینی مستقل

## شناسه و مبنا

- `INSTRUCTION_ID`: `OWNER-20260911-V2-INTENT-FLOW-FOUNDATION`
- `HANDOFF_ID`: `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`
- مبنای Assistant Foundation: `76a0537440dee048ace18664f0be6fbee3f726dc`
- کامیت کد و مستندات مرحله: `9ebc349737ba756ec5996e8e4d9534349202d2e5`
- شاخه: `codex/v2-intent-flow-foundation`
- شاخهٔ `main` ادغام نشده است.

## نتیجه

چرخهٔ هفت‌حالتهٔ Intent، revision، تأیید دقیق نسخه، اصلاح، رد، انقضا و پاک‌سازی با چرخهٔ نشست در Core پیاده شد. هر فرمان با `generation` و `revision` بررسی می‌شود تا فرمان دیررس نتواند نسخهٔ قدیمی را فعال کند.

این مرحله فقط متن صریح کاربر را برای مرور نشان می‌دهد و parser معنایی، LLM، Matching، Ranking، Directory، V1 connector، AR، Virtual Storefront یا persistence اضافه نمی‌کند.

## فایل‌های تغییرکرده

- `mlino2/app/src/core/foundation.ts`
- `mlino2/app/src/core/useFoundation.ts`
- `mlino2/app/src/core/intent.ts`
- `mlino2/app/src/core/intent.test.ts`
- `mlino2/app/src/core/intentBoundary.test.ts`
- `mlino2/app/src/discovery/AssistantFoundation.tsx`
- `mlino2/app/src/discovery/AssistantFoundation.css`
- `mlino2/app/src/discovery/IntentFoundation.tsx`
- `mlino2/app/src/matching/matching.test.ts` — فقط ثابت‌کردن زمان fixture در یک تست تاریخی؛ منطق Matching تغییر نکرد.
- `mlino2/HANDOFF/20260911_INTENT_FLOW_DESIGN.md`
- `mlino2/HANDOFF/20260911_INTENT_FLOW_INSTRUCTION.md`
- `mlino2/HANDOFF/intent-foundation-browser-check.cjs`
- `mlino2/HANDOFF/20260911_INTENT_EVIDENCE/browser-results.json`
- دو تصویر شواهد مرورگر در `mlino2/HANDOFF/20260911_INTENT_EVIDENCE/`
- `mlino2/MLINO_BOOK.md`
- `mlino2/OPEN_DECISIONS.md`
- `mlino2/03_ROADMAP_PHASES.md`
- `mlino2/CHANGELOG.md`

## راستی‌آزمایی

- `npm test`: موفق، ۱۳ فایل تست و ۲۰۱ تست.
- `npx tsc -b`: موفق.
- `npm run build`: موفق.
- Chrome روی build واقعی در اندازهٔ دسکتاپ `1280×900` و موبایل `390×844`: موفق؛ دریافت متن پس از رضایت، تأیید، اصلاح، مکث/ادامه، رد، لغو رضایت، reload و انقضا بررسی شد.
- در مسیر Intent، `localStorage`، `sessionStorage` و IndexedDB تغییر نکردند و درخواست شبکه‌ای برای متن Intent مشاهده نشد.
- تست مرورگر پس از تغییرات صرفاً مستنداتی تکرار نشد؛ تغییر کد بعد از همان اجرای موفق وجود نداشت.

## تأیید مرزها

- `canMatch === false` و `canOpenBusiness === false` باقی مانده‌اند.
- هیچ فایل V1، قرارداد منجمد، schema، migration، API یا Backend تغییر نکرد.
- هیچ persistence یا حافظهٔ بلندمدت برای Intent اضافه نشد.
- C-03 و C-04 دوباره طراحی نشدند.

شاخهٔ Remote استرا هنگام بررسی روی `ea59aba90e3990c807950702a6f90a7685f92c47` بود و با مبنای این کلون یکسان نیست؛ این شاخه ادغام نشده است. گام بعد، بازبینی مستقل همین تحویل است.

من کدکس هستم
