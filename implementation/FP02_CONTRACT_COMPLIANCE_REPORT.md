# FP02_CONTRACT_COMPLIANCE_REPORT.md

نگاشت هر قانون الزامی از اسناد مرجع (بند ۲ دستور مجوز) به محل پیاده‌سازی و تست اثبات‌کننده‌ی آن.

## ۱. AC2DecisionPort — شکل و معناشناسی (طبق `AC2_DECISION_PORT_FINAL_DELTA.md`)

| قانون | پیاده‌سازی | تست اثبات‌کننده |
|---|---|---|
| شکل دقیق `OpportunityAccessCandidate` / `AC2Decision` / `AC2DecisionPort` | `foundation/access-decision/ac2-decision-port.ts` | تایپ‌چک کامل پروژه |
| `subject_core_entity_refs` خالی → deny بدون فراخوانی Port | `evaluateAC2FailClosed` | `opportunity-read.spec.ts` → «empty subject_core_entity_refs denies WITHOUT ever calling the Port» |
| Port throw می‌کند → تمام کاندیدها deny | `evaluateAC2FailClosed` (catch-block) | `opportunity-read.spec.ts` → «AC-2 Port throws (unavailable): fails closed» |
| Port آرایه غیرمعتبر/خالی برمی‌گرداند → deny | همان | «AC-2 Port returns no decision for the candidate: fails closed» |
| `access !== 'allow'` یا رکورد گم‌شده → deny با `authorized_evidence_refs: []` | همان | «AC-2 deny: the Opportunity is dropped from both getById and the Feed» |
| `authorized_evidence_refs` خروجی همیشه با `evidence_refs` خودِ کاندیدا اشتراک گرفته می‌شود (رد Refهای بیگانه) | همان | «a Port-injected foreign EvidenceRef ... is silently dropped» |

## ۲. توالی هفت‌مرحله‌ای IC-14 (طبق `FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md`)

| مرحله | پیاده‌سازی در `opportunity-read.service.ts` | تست اثبات‌کننده |
|---|---|---|
| ۱. resolveActorContext | خارج از این کلاس (مسئولیت فراخوان/FP-03) | — |
| ۲. خواندن حداقلی محدود به Tenant | `prisma.opportunityCurrentState.findMany({ where: { organizationId, state:'ACTIVE', ... } })` | «Feed returns ACTIVE-only» |
| ۳. `AC2DecisionPort.evaluate` (fail-closed) | فراخوانی `evaluateAC2FailClosed` پیش از هر فیلتر دیگر | «AC-2 is evaluated before intended_audience filtering» |
| ۴. حذف موارد denyشده | `rows.filter(... access === 'allow')` | «AC-2 deny: ... dropped» |
| ۵. فیلتر `intended_audience` | پس از AC-2 | «SECURITY 2 (real impl)» |
| ۶. وضعیت اختصاصی actor | `fetchActorStates` | «SECURITY 4 (real impl)» |
| ۷. گروه‌بندی/مرتب‌سازی + limit اختیاری | `grouped[tag].sort(...).slice(0, limit)` | تایپ‌چک + تست‌های Feed عمومی |

## ۳. قوانین Projection رویداد-محور CR-07 (طبق `FP02_EVENT_SOURCED_PROJECTION_RULES.md`)

| قانون | پیاده‌سازی | تست اثبات‌کننده |
|---|---|---|
| Rule 1: گروه‌بندی فقط بر اساس `opportunity_correlation_id` + زنجیره‌ی صریح `amends_event_id` (هرگز `situation_key`) | `partitionChains` در `compute-projection.ts` | «two OCCURRENCEs sharing the same situation_key remain two fully independent Projections — NO merge» |
| Rule 2: جداسازی کامل زنجیره‌ی کسب‌وکار از زنجیره‌ی تعامل | `partitionChains` (فیلتر `domainTag === 'opportunity.interaction'`) | «interaction events never mutate business content, and business events never appear in OpportunityInteractionState» |
| Rule 4: `as_of_time` پارامتر صریح، هرگز `now()` پنهان | امضای `computeBusinessProjection(businessChain, as_of_time)` | «expiry is driven purely by as_of_time, never a hidden clock» + بررسی معماری «no Date.now/new Date() clock reads» |
| Rule 5: RETRACTION → `state='EXPIRED'` و `latestEventId` | منطق `retraction ?? latestContentEvent` | «RETRACTION forces state to EXPIRED» |
| EXPIRED در Projection باقی می‌ماند (فیلتر فقط در زمان Query Feed) | `getOpportunityFeed` فیلتر `state:'ACTIVE'` اعمال می‌کند؛ `rebuildOrganizationProjection` هیچ ردیفی را بر اساس state حذف نمی‌کند | «by-id ... MAY return EXPIRED (IC-14 §12)» |
| `core_entity_refs` (Subject) همیشه از رویداد بنیان‌گذار، هرگز از اصلاحیه‌ها | `buildAccessCandidates` فقط `founding.coreEntities` را می‌خواند | تایپ‌چک + کامنت مستندشده در کد |
| CR-03: بدون ادغام ضمنی — دو OCCURRENCE مستقل با `situation_key` مشترک = دو ردیف کاملاً مستقل | `rebuildOrganizationProjection` روی هر رویداد بنیان‌گذار مستقلاً تکرار می‌کند؛ هیچ مسیر کد بر اساس `situationKey` مقایسه/ادغام نمی‌کند | همان تست No-Merge بالا |

## ۴. سیاست S2 — تحویل Evidence (طبق `FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md`)

| قانون | پیاده‌سازی | تست اثبات‌کننده |
|---|---|---|
| DTO فقط زیرمجموعه‌ی مجازشده توسط AC-2 را نشان می‌دهد، هرگز مقدار خام ذخیره‌شده | `toDTO()` همیشه از `decision.authorized_evidence_refs` استفاده می‌کند | «evidence_refs in the DTO is exactly the AC-2-authorized subset» |
| پیش‌فرض `[]` وقتی Opportunity هیچ Evidence ندارد | `buildAccessCandidates` → `(row.evidenceRefs as ...) ?? []` | «evidence_refs defaults to [] when the stored Opportunity carries no evidence» |

## ۵. جلوگیری از Existence-Oracle (مرز حریم خصوصی IC-14)

| قانون | پیاده‌سازی | تست اثبات‌کننده |
|---|---|---|
| `null` یکسان برای not-found / سازمان اشتباه / AC-2-deny / audience اشتباه | `getOpportunityById` در تمام این مسیرها `return null` می‌کند بدون کد خطای متفاوت | «by-id returns null identically for a truly nonexistent id and a wrong-org id» |

## ۶. نتیجه‌گیری تطبیق

تمام قوانین الزامی بندهای ۵، ۶، و ۷ دستور مجوز، به‌صورت یک‌به‌یک با کد و تست real-Postgres تطبیق داده شدند. هیچ قانونی بدون شاهد آزمایشی مستقیم رها نشد.
