# ثبت تصویب مالک — تصمیم‌های U1-O1 تا U1-O10 و مجوز U2

**تاریخ:** ۲۰ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO
**مبنا:** `20260920_CLAUDE_REVIEW_U1_REAL_UI_DESIGN.md` (commit `c90e8b1`) · سند طرح در شاخه‌ی `codex/v2-real-ui-design` @ `6f2c8a5`

## ۱. متن تصویب مالک

> «توصیه‌های نگهبان برای U1-O1 تا U1-O10 و یادداشت U-N1 تصویب شد؛ U2 مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

همه‌ی ده مورد طبق گزینه‌ی **A** سند و توصیه‌ی نگهبان:

| # | تصمیم |
|---|---|
| **O1** | یک شکل نمایشی مستقل (`PublicUiRecord`)؛ داده‌ی واقعی هرگز در قالب قدیمی `draft-1` جا زده نمی‌شود |
| **O2** | طبقه، ساختمان، محصولات و درصد تخفیف در نسخه‌ی واقعی نمایش داده نمی‌شوند؛ هر نیاز واقعی بعداً CCR جدا |
| **O3** | دسته‌بندی حدسی طبق جدول بخش ۵ سند، با برچسب «حدسی» و بازگشت «بدون دسته» |
| **O4** | پیشنهادهای نمونه فقط برای چند کسب‌وکار آزمایشی با نشانه‌ی رسمی |
| **O5** | نشانی دستیار هم‌مبدأ با خود برنامه |
| **O6** | مدل سریع برای فهم جمله و مدل قوی فقط برای پاسخ توضیحی · نگهبان موجود بودن هر سه نام را از سرویس مالک تأیید کرد |
| **O7** | موقعیت مکانی فقط با اجازه‌ی صریح و فقط تقریبی تا یک کیلومتر |
| **O8** | اگر سرویس، نگه‌نداشتن پرسش‌ها را تضمین نکند، موقعیت فرستاده نمی‌شود |
| **O9** | پاسخ گفت‌وگویی کوتاه و فقط بازگویی خواسته |
| **O10** | ترتیب اجرا: U2، سپس U3، سپس U4 |
| **U-N1** | فیلتر «الان باز است» **به دامنه‌ی U2 افزوده شد** |

## ۳. دستور کدکس — U2

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260920-U2-REAL-UI-WIRING-001
TARGET_HANDOFF_ID: HANDOFF-20260920-OWNER-APPROVAL-U2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260920-V2-REAL-UI
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_APPROVAL_U1_DECISIONS_AND_U2.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION in V2 - a NEW branch codex/v2-real-ui-wiring from origin/codex/v2-intent-flow-foundation at
      e26c52568811af5c6669b3458c5ce38d5b3e04a7, in a NEW worktree C:/Users/galexy/mlino code/v2-real-ui-wiring.
      LOCAL commits only; do NOT push.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never open any .env,
  GITHUB_TOKEN.txt or key file; no key anywhere; no network call in code or tests.
DESIGN BASIS: mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md on origin/codex/v2-real-ui-design at
  6f2c8a58f1cbbb441ff09a10d9b3e6f094e2aa19 - sections 3, 4, 5 and 9 (U2 part). Owner decisions O1-O10 as recorded
  in section 2 of the pinned record. U4 (assistant gateway) and U3 (sample offers) are NOT in this step.

1 ADAPTER (design O1): a new pure module that maps an accepted PublicRecord to a display-only view model
  (PublicUiRecord) holding exactly the fields of the design's section 3 table. It NEVER invents a value, never
  converts to the draft-1 type, and is applied only AFTER the consumer accepted the snapshot. A record with null
  coordinates stays in the list and detail but is excluded from map markers, nearby and AR.
2 CATEGORY (O3): a deterministic offline module implementing section 5 exactly: the normalisation rules, the
  capability-first then name/description order, the exact token table, the most-distinct-tokens tie-break, the fixed
  table order as the final tie-break, and the 'uncategorized' fallback with the label 'بدون دسته'. Every derived
  category MUST carry a visible 'حدسی' marker in the UI. No network, no model, no randomness, no clock.
3 OPEN NOW (Guardian U-N1, now in scope): a versioned business-hours evaluator for mlino.business-hours.v1:
  - ISO weekday numbering exactly as Guardian S1-D1 (Monday=1 ... Saturday=6, Sunday=7) and the artifact's own
    timezone field (Asia/Tehran in practice), evaluated against an injected clock, never a hidden Date.now();
  - intervals are half-open [open, close); an absent day means closed; exceptions[] override the weekly entry;
  - an unknown schema_version, a malformed entry or an unknown timezone -> treat as UNKNOWN, never as open;
  - expose openNow(record, now) returning 'open' | 'closed' | 'unknown', and show 'unknown' honestly in the UI
    (never as open) plus a filter that keeps only 'open'.
4 WIRING: RealPublicApp becomes the full experience over the adapter: MapView with markers and clustering,
  BusinessCard, the detail panel extracted for reuse, BottomSheet, nearby/distance sorting, save/like/hide/share via
  organization_id, and the AR vitrine fed by capabilities and offers. Floor, building, products and discount are
  NOT rendered (O2). The rich components must accept the view model through props; do not fork them.
5 HARD BOUNDARIES: no change to canonical, verify, trustBundle, consumer, mapping or transport; no change to the
  public contract; the real path must not import the draft-1 mock, loader, validator or BusinessDirectoryService;
  demo mode stays exactly as it is; no new dependency; no network in tests.
6 TESTS (vitest):
  - adapter: every field of the section 3 table, including null coordinates, contact allowlist, links, hours
    passthrough, capabilities and offers; absent fields are absent, never defaulted;
  - category: each table row, a multi-match tie, the table-order tie-break, the fallback, and the normalisation
    cases (ي/ك, diacritics, underscores, case);
  - open-now: open, closed, before/after, an exception day, a missing day, a malformed schema -> unknown, a
    midnight-crossing pair split across two days, and a fixed-clock table of at least 8 cases;
  - real mode: a proof that no mock module is reachable from RealPublicApp (a static import scan plus a runtime
    test that a draft-1 payload is rejected);
  - map/AR: records without coordinates never appear as markers or AR items but do appear in the list;
  - MUTATION PROOF (throwaway copy): (i) make the adapter default a missing category to 'cafe', (ii) let open-now
    treat 'unknown' as open, (iii) import the mock loader in the real path; each must make a named test FAIL.
7 VALIDATION: npm run build and npm test in mlino2/app THREE times, all green, committed logs in
  mlino2/validation/u2/.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260920_CODEX_U2_REAL_UI_WIRING_REPORT.md - files; requirement ->
  file:line -> exact test name; mutation outcomes; the three run totals; LF sha256; GW2/GW2-P outputs. Append only
  to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- mlino2/app/src/publicExport/** (new adapter/category/hours modules, RealPublicApp wiring, tests)
- mlino2/app/src/components/**, mlino2/app/src/ar/**, mlino2/app/src/experience/** (prop/type changes only, no new
  data sources), mlino2/app/src/App.tsx (only the real/demo split if strictly needed)
- mlino2/validation/u2/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- the acceptance logic (canonical/verify/trustBundle/consumer/mapping/transport); the public contract; nginx,
  Dockerfile, docker-compose (untouched in U2); any assistant/gateway/model/API-key work (that is U4); any sample
  offer creation (that is U3); any new dependency; network in tests; Docker; any database; V1 files; main;
  _PUSH_STAGING; push; git config.
```

## ۴. پس از U2

بازبینی نگهبان و اجرای آزمون‌ها به‌دست نگهبان، سپس تصمیم مالک درباره‌ی ادغام و نمایش روی گوشی. بعد U3 و در پایان U4، که شرط شروعش باطل شدن کلید لو رفته و اصلاح متن رضایت کاربر است.

من کلاد هستم
