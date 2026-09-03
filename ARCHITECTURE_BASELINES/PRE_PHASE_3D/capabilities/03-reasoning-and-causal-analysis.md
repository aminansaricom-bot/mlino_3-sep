# Capability Specification — Reasoning & Causal Analysis

## Status
Frozen v1.0

---

## Purpose
انتخاب نهایی از میان کاندیدهای معنایی تولیدشده توسط Domain Adaptation؛ مصرف Projection (Capability Map v1.0 §2.3؛ Kernel بخش ۱۵، ۷، ۸).

---

## Responsibilities
- انتخاب کاندید نهایی از میان کاندیدهای معنایی تولیدشده توسط Domain Adaptation (Kernel بخش ۱۵: «استدلال فقط از میان کاندیدهای معنایی تولیدشده انتخاب می‌کند»).
- ثبت تصحیح تفکیک هویت پس از Admission به‌شکل یک Event مستقل از نوع Amendment که به Event اصلی ارجاع می‌دهد و نگاشت نهایی موجودیت را حمل می‌کند (Kernel بخش ۷، پاراگراف «تصحیح تفکیک هویت پس از Admission»).
- مصرف Projection تولیدشده توسط Memory & Knowledge (Kernel بخش ۸: «مصرف‌کنندگان (Reasoning، Prediction، Narrative، ارزیابی سیاست دسترسی) Projection را می‌خوانند»)؛ هرگز مستقیم Event Log را برای تشخیص بی‌اعتباری Projection زیر نظر نمی‌گیرد (Kernel بخش ۸، صریح).

---

## Non Responsibilities
- تولید کاندید معنایی — این وظیفه‌ی انحصاری Domain Adaptation & Semantic Translation است (Kernel بخش ۱۵؛ Capability Map §2.3، صریح).
- ساخت، ابطال یا نگهداری Projection — این مسئولیت Memory & Knowledge است (Kernel بخش ۸؛ Capability Map §2.1).
- ویرایش مستقیم Event اصلی — طبق INV-1 هیچ Event فیزیکی حذف/ویرایش نمی‌شود؛ تصحیح فقط از طریق Event مستقل نوع Amendment انجام می‌شود (Kernel بخش ۷؛ INV-1).

---

## Inputs

**Events Consumed:**

**GAP — Not defined by Kernel.**

Capability Map §2.3 صراحتاً می‌گوید: «فراتر از مصرف Projection (که خود یک Event نیست) مشخص نیست.»

**Non-Event Inputs:**
- **Projection** — تولیدشده توسط Memory & Knowledge، مصرف‌شده توسط این Capability (Kernel بخش ۸).
- **کاندیدهای معنایی** — تولیدشده توسط Domain Adaptation & Semantic Translation در لحظه‌ی Admission (Kernel بخش ۷، ۱۵).

---

## Outputs

**Events Produced:** یک Event مستقل از نوع **Amendment**، برای تصحیح تفکیک هویت پس از Admission؛ این Event به Event اصلی ارجاع می‌دهد و نگاشت نهایی موجودیت — یعنی کاندید نهایی انتخاب‌شده از میان کاندیدهای معنایی (Kernel بخش ۱۵) — را به‌عنوان بخشی از محتوای همین Event حمل می‌کند، نه به‌شکل مصنوع جداگانه (Kernel بخش ۷؛ Capability Map §2.3).

نام اختصاصی فراتر از نوع عمومی «Amendment» در Kernel تعریف نشده؛ طبق Kernel بخش ۴، فقدان نام اختصاصی، خودش یک GAP محسوب نمی‌شود («نام‌گذاری صریح فقط در مواردی الزامی است که یک Kernel Invariant صراحتاً آن را بخواهد»).

---

## Owned Concepts

**GAP — Not defined by Kernel.**

Capability Map §2.3 صراحتاً می‌گوید: «هیچ اقتدار انحصاری صریح در Kernel به این Capability نسبت داده نشده.»

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **Candidate Selector** — انتخاب کاندید نهایی از میان کاندیدهای معنایی تولیدشده توسط Domain Adaptation؛ تولید کاندید جدید نمی‌کند (Kernel بخش ۱۵).
- **Identity Correction Amendment Writer** — تولید Event مستقل نوع Amendment که به Event اصلی ارجاع می‌دهد و نگاشت نهایی موجودیت را حمل می‌کند (Kernel بخش ۷).
- **Projection Reader** — مصرف Projection از Memory & Knowledge؛ هرگز مستقیم Event Log را برای تشخیص بی‌اعتباری Projection رصد نمی‌کند (Kernel بخش ۸).

---

## State

**GAP — Not defined by Kernel.**

Kernel هیچ ساختار داخلی State (مشابه Event Log/Projection در Memory & Knowledge) برای این Capability تعریف نمی‌کند.

---

## Public Interface

**Illustrative only. Kernel defines behaviour, not callable APIs.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities/Workflow تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Select Final Candidate** — انتخاب کاندید نهایی از میان کاندیدهای معنایی تولیدشده توسط Domain Adaptation (Kernel بخش ۱۵).
- **Record Identity Correction** — ثبت تصحیح تفکیک هویت به‌شکل Event مستقل نوع Amendment که به Event اصلی ارجاع می‌دهد (Kernel بخش ۷).
- **Read Projection** — مصرف Projection تولیدشده توسط Memory & Knowledge (Kernel بخش ۸).

**تصریح:** «Generate Semantic Candidate» عمداً در این فهرست نیامده — تولید کاندید معنایی، وظیفه‌ی انحصاری Domain Adaptation & Semantic Translation است، نه این Capability (Kernel بخش ۱۵؛ Capability Map §2.3 Non-Responsibilities).

---

## Internal Workflow

1. Domain Adaptation & Semantic Translation، در لحظه‌ی Admission، در صورت ابهام هویتی، چند کاندید معنایی تولید می‌کند (Kernel بخش ۷).
2. Reasoning، Projection ارائه‌شده توسط Memory & Knowledge را مصرف می‌کند (Kernel بخش ۸).
3. Candidate Selector از میان کاندیدهای معنایی تولیدشده توسط Domain Adaptation، کاندید نهایی را انتخاب می‌کند؛ خودش کاندید جدیدی تولید نمی‌کند (Kernel بخش ۱۵).
4. این انتخاب هرگز به‌شکل ویرایش مستقیم Event اصلی ثبت نمی‌شود، چون طبق INV-1 مجاز نیست (Kernel بخش ۷).
5. Identity Correction Amendment Writer یک Event مستقل از نوع Amendment می‌سازد که به Event اصلی ارجاع می‌دهد و نگاشت نهایی موجودیت (کاندید انتخاب‌شده) را حمل می‌کند (Kernel بخش ۷).
6. این Amendment، مانند هر Event دیگر، به Memory & Knowledge برای ثبت در Event Log منتقل می‌شود (Kernel بخش ۴، ۸).

---

## Failure Modes

**GAP — Not defined by Kernel.**

Kernel هیچ Failure Mode مشخصی (مثلاً ابهام حل‌نشدنی، فقدان کاندید معتبر برای انتخاب، یا خطای انتخاب کاندید نادرست) برای این Capability تعریف نمی‌کند، جز الزام عمومی INV-1 (عدم ویرایش مستقیم Event، صرفاً از طریق Amendment؛ Kernel بخش ۷).

---

## Extension Points

**GAP — Not defined by Kernel.**

Capability Map §2.3 صراحتاً این بند را GAP علامت زده است.

---

## Dependencies

**Domain Adaptation & Semantic Translation** — طبق Kernel بخش ۱۵ («استدلال فقط از میان کاندیدهای معنایی تولیدشده انتخاب می‌کند») و ماتریس وابستگی Capability Map §3.

---

## Known Gaps
- **Owned Concepts** — هیچ اقتدار انحصاری صریحی در Kernel به این Capability نسبت داده نشده (Capability Map §2.3؛ بند G6 در Capability Map §5).
- **Events Consumed** — فراتر از مصرف Projection، هیچ Event ورودی مشخصی تعریف نشده (Capability Map §2.3، صریح).
- **Extension Points** — هیچ نقطه‌ی توسعه‌ای برای این Capability در Kernel تعریف نشده (Capability Map §2.3، صریح).
- **Failure Modes** — هیچ رفتار مشخصی برای شکست انتخاب کاندید یا ابهام حل‌نشدنی تعریف نشده.
- **State** — هیچ ساختار داخلی State برای این Capability تعریف نشده.

---

## Engineering Notes
- از آنجا که خروجی Amendment این Capability باید تمام فیلدهای الزامی مدل جهانی Event را داشته باشد («هیچ Event بدون تمام فیلدهای بالا پذیرفته نمی‌شود»، Kernel بخش ۴)، جزئیات دقیق تولید و تکمیل این فیلدها تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد.
- از آنجا که این Capability صرفاً از میان کاندیدهای موجود انتخاب می‌کند و خودش کاندید تولید نمی‌کند (Kernel بخش ۱۵)، مکانیزم دقیق دریافت کاندیدها از Domain Adaptation & Semantic Translation، تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد.
- از آنجا که Owned Concepts این Capability به‌صراحت GAP است (Capability Map §2.3)، هیچ اقتدار انحصاری‌ای در این سند فرض نشده؛ تعیین دقیق مرزهای پیاده‌سازی این Capability، تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد.
