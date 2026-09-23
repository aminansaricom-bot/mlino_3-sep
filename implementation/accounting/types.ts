import type { Rial } from './money';

export type PartyRole = 'customer' | 'supplier' | 'both';
export type Party = Readonly<{ id: string; name: string; role: PartyRole; phone?: string }>;

export type TreasuryKind = 'cash' | 'bank';
/** A cash box or a bank account. Cash lines post to 1101, bank lines to 1102, both carry the treasury id. */
export type Treasury = Readonly<{ id: string; name: string; kind: TreasuryKind }>;

export type ChequeDirection = 'received' | 'issued';
export type ChequeStatus = 'open' | 'cleared' | 'bounced' | 'void';
export type Cheque = Readonly<{
  id: string;
  direction: ChequeDirection;
  number: string;
  bank?: string;
  /** Due date on the cheque (ISO). */
  dueDate: string;
  amount: Rial;
  partyId: string;
  status: ChequeStatus;
  /** Entry that recognised the cheque, and the one that settled it. */
  openedBy: string;
  settledBy?: string;
}>;

export type JournalLine = Readonly<{
  account: string;
  debit: Rial;
  credit: Rial;
  partyId?: string;
  treasuryId?: string;
  chequeId?: string;
  memo?: string;
}>;

export type SourceType =
  | 'opening'
  | 'sale_invoice'
  | 'daily_sales'
  | 'expense'
  | 'receipt'
  | 'payment'
  | 'cheque_cleared'
  | 'cheque_bounced'
  | 'transfer'
  | 'owner_contribution'
  | 'owner_withdrawal'
  | 'other_income'
  | 'reversal';

export type JournalEntry = Readonly<{
  id: string;
  /** Accounting date (ISO Gregorian). */
  date: string;
  description: string;
  source: Readonly<{ type: SourceType; documentId?: string }>;
  lines: readonly JournalLine[];
  /** Set on a reversal entry: the entry it cancels. */
  reversalOf?: string;
  /** Wall-clock time of posting, for the audit trail. */
  postedAt: string;
}>;

/** What posting rules return; the ledger assigns id and postedAt and validates everything. */
export type EntryDraft = Omit<JournalEntry, 'id' | 'postedAt'>;
