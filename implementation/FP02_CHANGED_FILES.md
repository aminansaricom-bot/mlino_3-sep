# FP02_CHANGED_FILES.md

## خلاصه

- **فایل‌های تولیدی جدید:** ۵
- **فایل‌های تست جدید:** ۳
- **فایل‌های تغییریافته:** ۰
- **فایل‌های حذف‌شده:** ۰
- **آیا کد تولیدی خارج از این فاز تغییر کرد؟** خیر.
- **آیا معماری منجمد تغییر کرد؟** خیر.
- **آیا Shared Contract (`shared-contracts/types.ts`) تغییر کرد؟** خیر.
- **آیا `prisma/schema.prisma` یا Migration جدیدی اضافه شد؟** خیر.

## فایل‌های تولیدی جدید

| مسیر | نقش |
|---|---|
| `foundation/access-decision/ac2-decision-port.ts` | تعریف `AC2DecisionPort`/`OpportunityAccessCandidate`/`AC2Decision` + `evaluateAC2FailClosed` |
| `foundation/opportunity-projection/compute-projection.ts` | توابع محاسباتی خالص Projection (بدون I/O، بدون ساعت پنهان) |
| `foundation/opportunity-projection/rebuild-projection.service.ts` | تنها نویسنده‌ی `opportunity_current_state`/`opportunity_interaction_state` |
| `foundation/opportunity-read/access-candidate.ts` | ساخت کاندیدای AC-2 از ردیف‌های Projection |
| `foundation/opportunity-read/opportunity-read.service.ts` | پیاده‌سازی واقعی `IC14ReadInterface` |

## فایل‌های تست جدید

| مسیر | نقش |
|---|---|
| `test/mocks/fake-ac2-decision-port.ts` | Fake تست‌محور برای `AC2DecisionPort` |
| `test/foundation/opportunity-projection/rebuild-projection.spec.ts` | ۱۲ تست Projection روی Postgres واقعی |
| `test/foundation/opportunity-read/opportunity-read.spec.ts` | ۱۸ تست IC-14 Read + بازتایید ۴ تست SECURITY واقعی |

## فایل‌های صراحتاً دست‌نخورده (فهرست ممنوعه‌ی دستور)

- `shared-contracts/types.ts` — فقط خوانده شد.
- `prisma/schema.prisma` — فقط خوانده شد.
- `test/mocks/mock-ic14-read-interface.ts` — فقط خوانده شد؛ نه حذف نه تضعیف.
- `test/feed/opportunity-feed.spec.ts` — فقط خوانده شد؛ همه‌ی تست‌های آن دست‌نخورده اجرا شدند.
- تمام کد منبع FP-01، FP-03، F-01 تا F-05 (`foundation/event-log/*`, `foundation/event-admission/*`, `value-engines/*`, `feed/*`, `briefing/*`) — فقط برخی فایل به‌عنوان مرجع خوانده شدند، هیچ Write/Edit روی هیچ‌کدام انجام نشد.

## چک‌سام SHA-256 فایل‌های جدید (همان مقادیر در Manifest داخل ZIP نیز درج شده)

```
47269882a0759249f2ae99755ee79445ca91fb427dde2cfd0d3b9220103630f3  foundation/access-decision/ac2-decision-port.ts
9aa27be3b4240f5af4db066798bd76252333fe6e89676273287e34074418dc12  foundation/opportunity-projection/compute-projection.ts
ca6a0252ebea7561b2682a80f32d44daf794596c4e1ac1539e644ade71418132  foundation/opportunity-projection/rebuild-projection.service.ts
0a03e133a1d5fe4eadd1215f56887e8dc9da82e112b4a47214bfbe95bf369a56  foundation/opportunity-read/access-candidate.ts
2360a0749cdaf88a10af62dfbb638869d7dc0bb9bfbeff47e6e553e446208b48  foundation/opportunity-read/opportunity-read.service.ts
0e2188157f28a4f78a141244eba582c49b72398d7d0a16820b3bd7e0f3147a15  test/mocks/fake-ac2-decision-port.ts
088d6f4c5155ba96932d0e4dc946c0d51ae798a3b5ae16b971d301b3ff405ea1  test/foundation/opportunity-projection/rebuild-projection.spec.ts
ad4bf3c282e0c67f522e9f93b0fc2833ba00c7ebf9d0a77a9d3c42191f415d93  test/foundation/opportunity-read/opportunity-read.spec.ts
```

## چک‌سام مرجع فایل‌های منجمدِ لمس‌نشده (برای اثبات صفر Drift)

```
35d218065f9829f2d9c258d082ba6a2fd48588c573a44f722d35fad6dcb76296  shared-contracts/types.ts
84d138c2222647521f981afefc69944b87b6d2b091cc0f3747e2d0599f37eff0  prisma/schema.prisma
```
