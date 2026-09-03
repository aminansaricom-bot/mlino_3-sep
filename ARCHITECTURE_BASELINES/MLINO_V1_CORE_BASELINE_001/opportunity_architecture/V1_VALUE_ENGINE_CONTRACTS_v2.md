# سند G (اصلاح‌شده) — قراردادهای Value Engine های V1

**وضعیت: FREEZE CANDIDATE.** اصلاح‌شده از [V1_VALUE_ENGINE_CONTRACTS.md](../V1_VALUE_ENGINE_CONTRACTS.md). سه قرارداد Value Engine (ظرفیت، کنسلی/عدم‌حضور، پیگیری) در محتوا بدون تغییر؛ فقط ارجاعات IC و قرارداد Feed اصلاح شده‌اند.

---

## ۱ تا ۳. سه Value Engine اول

بدون تغییر محتوایی نسبت به سند اصلی — ورودی/تولیدکننده/وابستگی/خروجی/رویکرد اطمینان/هزینه/رفتار شکست هرکدام همان‌طور باقی می‌ماند. **تنها اصلاح:** خروجی هر سه اکنون رسماً «Event Candidate» نامیده می‌شود (نه «Event») و از طریق IC-۱۳ (فایل مستقل) ارسال می‌شود، نه یک مسیر توصیف‌شده‌ی غیررسمی.

## ۴. برداشت بازیابی درآمد (اصلاح‌شده)

طبق [OPPORTUNITY_PRODUCER_BOUNDARIES_v2.md](OPPORTUNITY_PRODUCER_BOUNDARIES_v2.md)، اکنون دو لایه: تجمیع خام (Capability ۱، صنعت‌کور) + تفسیر پولی (لایه‌ی Feature، صنعت‌محور). هیچ Event جدیدی نمی‌نویسد.

## ۵. بریفینگ فعالانه‌ی کسب‌وکار

بدون تغییر — همچنان یک نمای خواندن/Query، نه یک Capability یا خط‌لوله‌ی دوم.

## ۶. Opportunity Feed (اصلاح‌شده)

**قرارداد خواندن اصلاح‌شده:**

```json
{
  "opportunities_by_family": {
    "opportunity.capacity": [
      {
        "opportunity_correlation_id": "...",
        "state": "ACTIVE | EXPIRED",
        "materiality_score": 0.0,
        "materiality_basis": "...",
        "intended_audience": "owner_manager | receptionist_coordinator | both",
        "evidence_refs": ["..."],
        "event_time": "...",
        "expires_at": "... | null",
        "my_interaction_state": "NONE | SEEN | ACKNOWLEDGED | DISMISSED",
        "conversation_entry_point": "opportunity_correlation_id"
      }
    ],
    "opportunity.cancellation": [ "..." ],
    "opportunity.followup": [ "..." ]
  }
}
```

**تغییرات نسبت به نسخه‌ی اصلی:**
- خروجی اکنون بر اساس `domain_tag` گروه‌بندی شده (نه یک آرایه‌ی تخت) — پیامد مستقیم تصمیم عدم‌قابل‌مقایسه‌بودن Materiality بین خانواده‌ها.
- `state` اکنون فقط `ACTIVE`/`EXPIRED` است (وضعیت سراسری)؛ وضعیت تعامل شخصی در فیلد جداگانه‌ی `my_interaction_state` است.
- `id` قدیمی به `opportunity_correlation_id` تغییر نام یافت، سازگار با اصلاح هویت (سند A، نسخه‌ی اصلاح‌شده).

**قاعده‌ی بدون‌تغییر:** هیچ منطق کسب‌وکار در این قرارداد یا UI مصرف‌کننده‌اش قرار نمی‌گیرد.
