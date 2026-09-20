# ثبت تصویب مالک — سند طرح «رابط واقعی و دستیار هوشمند» (U1)

**تاریخ:** ۲۰ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. متن تصویب مالک

> «سند طرح رابط واقعی و دستیار هوشمند مجاز است.»

**دامنه:** فقط سند. هیچ کدی نوشته یا اجرا نمی‌شود، هیچ کلیدی لمس نمی‌شود و هیچ چیزی روی سیستم تغییر نمی‌کند.

## ۲. زمینه: چرا این مرحله لازم شد

پس از راه‌اندازی آزمایشی (P2)، مالک روی گوشی فقط یک **فهرست متنی** دید، در حالی‌که برنامه از قبل نقشه، ویترین واقعیت افزوده و دستیار دارد.

**علت، که نگهبان می‌پذیرد کوتاهی خودش بوده:** در دستور G14c-2 دامنه‌ی مسیر واقعی عمداً کمینه بسته شد (دریافت، بررسی امضا، نمایش فهرست) و **وصل کردن رابط غنی به داده‌ی واقعی در آن دستور نیامد.** امکانات غنی هنوز به داده‌ی ساختگی `draft-1` وصل‌اند که پشت حالت نمایشی است.

## ۳. تصمیم‌های مالک، ثبت‌شده

| # | موضوع | تصمیم |
|---|---|---|
| **U-D1** | دسته‌بندی | **از روی خدمات کسب‌وکار حدس زده شود.** فیلد دسته‌بندی در قرارداد داده‌ی عمومی وجود ندارد (طبق C8-4) |
| **U-D2** | پیشنهادها | **بله**، برای چند کسب‌وکار آزمایشی پیشنهاد نمونه ثبت شود تا ویترین واقعیت افزوده محتوا داشته باشد |
| **U-D3** | دستیار | **برویم سراغ هوش مصنوعی واقعی.** مالک یک سرویس واسطه با ۳۰ مدل دارد |

## ۴. تصمیم‌ها و هشدارهای نگهبان

| # | مورد |
|---|---|
| **U-G1** | **کلید هرگز در مرورگر نیست.** هر چیزی در برنامه‌ی مرورگری، برای همه‌ی کاربران قابل دیدن است. تماس با مدل زبانی فقط از یک واسطه‌ی سمت سرور انجام می‌شود |
| **U-G2** | **هوش مصنوعی هرگز منبع داده نیست.** مدل فقط «قصد» کاربر را به فیلتر ساختاریافته تبدیل می‌کند. فهرست کسب‌وکارها **همیشه** از همان فایل امضاشده می‌آید. مدل حق ساختن، تغییر دادن یا مرتب کردن دلخواه کسب‌وکار را ندارد |
| **U-G3** | **دسته‌بندی حدسی، برچسب نمایشی است، نه داده‌ی تأییدشده.** باید در رابط کاربری روشن باشد که حدس است و هرگز به‌عنوان اطلاعات تأییدشده‌ی کسب‌وکار نمایش داده نشود |
| **U-G4** | **کلید فعلی لو رفته است،** چون در گفت‌وگو نوشته شد. باید باطل و تازه شود. کلید تازه فقط در فایلی بیرون از مخزن و فقط روی سرور |
| **U-G5** | **حریم خصوصی:** متن پرسش کاربر به یک سرویس بیرونی می‌رود. این باید در طرح صریح نوشته شود و موقعیت مکانی کاربر بدون نیاز روشن فرستاده نشود |
| **U-G6** | مدل‌های پیشنهادی: کار سبک و پرتکرار با `gemini-3.8-flash` یا `deepseek-v4.1-flash`، پاسخ گفت‌وگویی با `claude-sonnet-5`، و در دوره‌ی ساخت نسخه‌های `free/` |

## ۵. دستور کدکس — U1

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260920-U1-REAL-UI-AND-ASSISTANT-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260920-OWNER-APPROVAL-U1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260920-V2-REAL-UI
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_APPROVAL_REAL_UI_AND_ASSISTANT_DESIGN.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: DOCUMENT ONLY - a NEW branch codex/v2-real-ui-design from origin/codex/v2-intent-flow-foundation at
      e26c52568811af5c6669b3458c5ce38d5b3e04a7, in a NEW worktree C:/Users/galexy/mlino code/v2-real-ui-design.
      LOCAL commits only; do NOT push. No code, no key, no network call, no Docker, no database.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never open any .env,
  GITHUB_TOKEN.txt or key file; never put an API key in any file, example or log.

READ FIRST (cite file:line for every claim about current behaviour):
- V2 at e26c525: src/App.tsx (DemoApp vs RealPublicApp), src/publicExport/** (consumer, mapping, RealPublicApp),
  src/components/{MapView,BusinessCard,BottomSheet}.tsx, src/ar/**, src/discovery/AssistantFoundation.tsx,
  src/matching/**, src/experience/**, src/directory/** (the draft-1 mock types), src/core/intent.ts, src/offers.ts
- origin/main: the public-business.v1 contract in implementation/public-export/builder.ts and
  mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md; Core services for offers (core/offer-service.ts) and capabilities.

WRITE (new file): mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md, status DRAFT, covering:
 R1 FIELD MAP: a table of every field the rich UI components need (map markers, clustering, business card, bottom
   sheet, detail, AR vitrine, save/like, share) -> where it comes from in public-business.v1 -> or ABSENT. For each
   ABSENT field state the option: drop the feature, derive it, or change the contract (a contract change is a
   separate CCR and must be marked as such). Cover at least category, floor_level, building_id, products,
   discount_percent, offer validity, opening hours, phone, website, social.
 R2 REAL-MODE UI PLAN: how RealPublicApp becomes the full experience WITHOUT reintroducing the draft-1 mock: which
   components can be reused unchanged, which need a thin adapter, and where the seam sits. The mock must stay behind
   the demo mode with no fallback (design C5) and the signed-snapshot acceptance logic must not change.
 R3 CATEGORY DERIVATION (owner decision U-D1): a DETERMINISTIC, offline mapping from a record's capabilities
   (capability_key and name) and, as a last resort, words in the business name/description, to a small fixed set of
   display categories. Give the exact table, the fallback 'بدون دسته', and the rule that it is display-only and must
   be visibly marked as a guess (Guardian U-G3). No network, no model call for this.
 R4 SAMPLE OFFERS (owner decision U-D2): how to add offers for a few TEST businesses through the official Core
   offer services only (never direct writes), which fields the AR vitrine actually needs, the test marker, and how
   they are withdrawn later. This is a plan only; the execution is a separate approved step.
 R5 ASSISTANT GATEWAY (owner decision U-D3, Guardian U-G1/U-G2/U-G5):
   - a SMALL server-side gateway (proposed location mlino2/assistant-gateway/, a separate process from V1 Core;
     justify against the Core/module boundary), the browser never holds a key;
   - the exact request/response contract: the browser sends the user's Persian text (and optionally a coarse
     location only when the user asked for 'near me'); the gateway returns a STRUCTURED intent (for example
     {action, keywords[], category?, openNow?, radiusMeters?, sort}) and optional short answer text;
   - the app then filters/sorts the VERIFIED snapshot locally; the model never returns business data (U-G2);
   - model routing per task with the owner's provider, the model ids from U-G6, timeouts, retries, a hard token cap,
     rate limiting per client, and a graceful fallback to the existing rule-based intent engine when the gateway is
     unavailable;
   - key handling: an env var read from a file OUTSIDE the repository, never logged, never returned to the browser;
     key rotation procedure; what the gateway logs (codes and durations only, never the user's text);
   - privacy: state plainly that the query text leaves the machine to a third-party provider, and what is NOT sent.
 R6 THREAT AND FAILURE TABLE: gateway down, provider down, slow model, malicious prompt in the user's text (prompt
   injection) and why it cannot affect the signed data, cost abuse, and the offline case.
 R7 A NUMBERED LIST OF OPEN DECISIONS for the owner, each with a recommendation, plus a proposed execution split
   (for example U2 UI wiring, U3 sample offers, U4 gateway), each needing its own approval.
 R8 An explicit 'not in scope' list.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260920_CODEX_U1_REAL_UI_DESIGN_REPORT.md - the file, its LF sha256,
  the GW2/GW2-P outputs, the sources read, and anything you could NOT verify. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md (new), the report (new),
  mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: any code change; any key or .env access; any network call; Docker; any database; main; _PUSH_STAGING;
  push; git config.
```

## ۶. پس از U1

بازبینی نگهبان، سپس تصمیم مالک درباره‌ی پرسش‌های باز، و بعد اجرا در چند برش جدا: وصل کردن رابط، پیشنهادهای نمونه، و واسطه‌ی دستیار.

من کلاد هستم
