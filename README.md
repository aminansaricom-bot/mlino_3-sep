# MLINO — Repository

این Repository شامل کد واقعی پروژه‌ی MLINO + مرجع معماری منجمد و تاریخچه‌ی هماهنگی است:

- **`implementation/`** — کد واقعی TypeScript (Foundation، Value Engines، Feed، Briefing)، تست‌ها (روی Postgres واقعی)، و اسناد تحویل هر فاز.
- **`ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/`** — معماری منجمد V1 (Kernel v1.3، Capability Map، Interaction Contracts v1.1، ADRها). **بالاترین سطح اقتدار پروژه — هرگز بدون فرآیند رسمی تغییر نکند.**
- **`AI_HANDOFF/`** — پروتکل و تاریخچه‌ی تحویل بین Claude (یونس) و بازبین مستقل (Codex/ممد)؛ شامل تمام گزارش‌های آرشیوی و دستورات اجراشده.

## سلسله‌مراتب اقتدار

Frozen Architecture > ADR/IC تایید‌شده > Implementation Design تایید‌شده > `implementation/shared-contracts/types.ts` (منجمد) > Feature Contracts > کد.

## وضعیت فعلی

آخرین وضعیت در `AI_HANDOFF/HANDOFF_STATE.md` و `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` ثبت شده است. کل مجموعه‌ی تست فعلی: **۱۱۸ تست، همگی سبز** (روی Postgres واقعی).

## راه‌اندازی محلی

```bash
cd implementation
npm install
npm run db:up
npx prisma migrate deploy
npx prisma generate
npm test
```
