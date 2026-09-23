// A small, fixed chart of accounts for an owner-run business (café, restaurant, shop).
// Codes are stable identifiers; posting rules refer to them by name through SYSTEM, never by literal.
// Business-agnostic: nothing here is specific to food, clinics or any other domain module.

export type AccountKind = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

/** Which sub-ledger dimension a line on this account must carry. */
export type AccountDimension = 'treasury' | 'party' | 'cheque' | null;

export type AccountDef = Readonly<{
  code: string;
  name: string;
  kind: AccountKind;
  /** Contra accounts (e.g. sales discounts) carry the opposite normal balance of their kind. */
  contra?: boolean;
  dimension: AccountDimension;
  /** Expense and revenue categories the owner can pick in the UI. */
  userSelectable?: boolean;
  active: boolean;
}>;

export const SYSTEM = {
  cash: '1101',
  bank: '1102',
  receivables: '1201',
  chequesReceived: '1202',
  inputVat: '1401',
  payables: '2101',
  chequesIssued: '2102',
  outputVat: '2201',
  capital: '3101',
  drawings: '3201',
  openingEquity: '3301',
  sales: '4101',
  salesDiscounts: '4102',
  otherIncome: '4201',
  bankFees: '6106',
} as const;

export const DEFAULT_CHART: readonly AccountDef[] = [
  { code: '1101', name: 'صندوق (نقد)', kind: 'asset', dimension: 'treasury', active: true },
  { code: '1102', name: 'بانک', kind: 'asset', dimension: 'treasury', active: true },
  { code: '1201', name: 'طلب از مشتری‌ها', kind: 'asset', dimension: 'party', active: true },
  { code: '1202', name: 'چک‌های دریافتی', kind: 'asset', dimension: 'cheque', active: true },
  { code: '1401', name: 'مالیات بر ارزش افزوده‌ی خرید (اعتبار)', kind: 'asset', dimension: null, active: true },
  { code: '2101', name: 'بدهی به تأمین‌کننده‌ها', kind: 'liability', dimension: 'party', active: true },
  { code: '2102', name: 'چک‌های پرداختنی', kind: 'liability', dimension: 'cheque', active: true },
  { code: '2201', name: 'مالیات بر ارزش افزوده‌ی فروش', kind: 'liability', dimension: null, active: true },
  { code: '3101', name: 'سرمایه', kind: 'equity', dimension: null, active: true },
  { code: '3201', name: 'برداشت مالک', kind: 'equity', contra: true, dimension: null, active: true },
  { code: '3301', name: 'مانده‌ی افتتاحیه', kind: 'equity', dimension: null, active: true },
  { code: '4101', name: 'فروش', kind: 'revenue', dimension: null, active: true },
  { code: '4102', name: 'تخفیف و برگشت از فروش', kind: 'revenue', contra: true, dimension: null, active: true },
  { code: '4201', name: 'درآمدهای دیگر', kind: 'revenue', dimension: null, userSelectable: true, active: true },
  { code: '5101', name: 'خرید مواد اولیه و کالا', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6101', name: 'حقوق و دستمزد', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6102', name: 'اجاره', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6103', name: 'آب، برق، گاز و تلفن', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6104', name: 'تبلیغات و بازاریابی', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6105', name: 'حمل و ارسال', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6106', name: 'کارمزد بانکی', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6107', name: 'تعمیر و نگهداری', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6108', name: 'بسته‌بندی و مصرفی', kind: 'expense', dimension: null, userSelectable: true, active: true },
  { code: '6199', name: 'سایر هزینه‌ها', kind: 'expense', dimension: null, userSelectable: true, active: true },
];

/** +1 when the account normally carries a debit balance, −1 for a credit balance. */
export function normalSign(account: AccountDef): 1 | -1 {
  const debitNormal = account.kind === 'asset' || account.kind === 'expense';
  return (debitNormal !== Boolean(account.contra)) ? 1 : -1;
}
