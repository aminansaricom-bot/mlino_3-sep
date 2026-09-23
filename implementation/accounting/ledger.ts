// The book of one organization. Invariants enforced on every posting:
//  - an entry has at least two lines, each line is a positive debit XOR a positive credit (whole Rials),
//    and the entry balances exactly;
//  - every account exists and is active; a line carries exactly the sub-ledger dimension its account
//    requires (cash box / bank account, customer / supplier, cheque) and nothing else;
//  - posted entries are never edited or deleted: a mistake is corrected by a reversal entry, once;
//  - nothing may be posted on or before the locked date (closed periods).
// A posting (entry + optional cheque change) is validated completely before anything is applied.

import { DEFAULT_CHART, SYSTEM, type AccountDef } from './chart';
import { AccountingError } from './errors';
import { assertIsoDate } from './jalali';
import { assertRial } from './money';
import type { Cheque, ChequeStatus, EntryDraft, JournalEntry, JournalLine, Party, Treasury } from './types';

export type ChequeOpen = Omit<Cheque, 'status' | 'openedBy' | 'settledBy'>;
export type Posting = Readonly<{
  draft: EntryDraft;
  /** A cheque recognised by this entry (received from a customer or issued to a supplier). */
  openCheque?: ChequeOpen;
  /** A cheque settled by this entry. */
  settleCheque?: Readonly<{ chequeId: string; status: Exclude<ChequeStatus, 'open' | 'void'> }>;
}>;

export type LedgerOptions = Readonly<{
  chart?: readonly AccountDef[];
  newId?: () => string;
  now?: () => Date;
}>;

let fallbackCounter = 0;
const defaultId = () => `e${Date.now().toString(36)}${(fallbackCounter += 1).toString(36)}`;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function assertId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ID.test(value)) throw new AccountingError('DOCUMENT_INVALID', `${field} must be 1..64 of [A-Za-z0-9_-]`);
  return value;
}

function assertText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AccountingError('DOCUMENT_INVALID', `${field} must be 1..${max} characters`);
  return value.trim();
}

export class Ledger {
  private readonly accounts = new Map<string, AccountDef>();
  private readonly parties = new Map<string, Party>();
  private readonly treasuries = new Map<string, Treasury>();
  private readonly cheques = new Map<string, Cheque>();
  private readonly entries: JournalEntry[] = [];
  private readonly entryIndex = new Map<string, JournalEntry>();
  private readonly reversedBy = new Map<string, string>();
  private lockedUntil: string | null = null;
  private readonly newId: () => string;
  private readonly now: () => Date;

  constructor(options: LedgerOptions = {}) {
    for (const account of options.chart ?? DEFAULT_CHART) {
      if (this.accounts.has(account.code)) throw new AccountingError('ACCOUNT_EXISTS', account.code);
      this.accounts.set(account.code, account);
    }
    for (const code of Object.values(SYSTEM)) if (!this.accounts.has(code)) throw new AccountingError('ACCOUNT_UNKNOWN', `system account ${code} missing from chart`);
    this.newId = options.newId ?? defaultId;
    this.now = options.now ?? (() => new Date());
  }

  // ---------- master data ----------

  addParty(party: Party): Party {
    assertId(party.id, 'party.id');
    if (this.parties.has(party.id)) throw new AccountingError('ID_EXISTS', `party ${party.id}`);
    if (!['customer', 'supplier', 'both'].includes(party.role)) throw new AccountingError('DOCUMENT_INVALID', 'party.role');
    const clean: Party = { id: party.id, name: assertText(party.name, 'party.name', 120), role: party.role, ...(party.phone ? { phone: assertText(party.phone, 'party.phone', 20) } : {}) };
    this.parties.set(clean.id, clean);
    return clean;
  }

  addTreasury(treasury: Treasury): Treasury {
    assertId(treasury.id, 'treasury.id');
    if (this.treasuries.has(treasury.id)) throw new AccountingError('ID_EXISTS', `treasury ${treasury.id}`);
    if (treasury.kind !== 'cash' && treasury.kind !== 'bank') throw new AccountingError('DOCUMENT_INVALID', 'treasury.kind');
    const clean: Treasury = { id: treasury.id, name: assertText(treasury.name, 'treasury.name', 80), kind: treasury.kind };
    this.treasuries.set(clean.id, clean);
    return clean;
  }

  /** Closes every period up to and including `until`. The lock only moves forward. */
  lockThrough(until: string): void {
    assertIsoDate(until, 'lock date');
    if (this.lockedUntil && until < this.lockedUntil) throw new AccountingError('PERIOD_LOCKED', `already locked through ${this.lockedUntil}`);
    this.lockedUntil = until;
  }

  // ---------- read side ----------

  account(code: string): AccountDef {
    const account = this.accounts.get(code);
    if (!account) throw new AccountingError('ACCOUNT_UNKNOWN', code);
    return account;
  }
  party(id: string): Party {
    const party = this.parties.get(id);
    if (!party) throw new AccountingError('PARTY_UNKNOWN', id);
    return party;
  }
  treasury(id: string): Treasury {
    const treasury = this.treasuries.get(id);
    if (!treasury) throw new AccountingError('TREASURY_UNKNOWN', id);
    return treasury;
  }
  cheque(id: string): Cheque {
    const cheque = this.cheques.get(id);
    if (!cheque) throw new AccountingError('CHEQUE_UNKNOWN', id);
    return cheque;
  }
  entry(id: string): JournalEntry {
    const entry = this.entryIndex.get(id);
    if (!entry) throw new AccountingError('ENTRY_UNKNOWN', id);
    return entry;
  }
  listAccounts(): readonly AccountDef[] { return [...this.accounts.values()]; }
  listParties(): readonly Party[] { return [...this.parties.values()]; }
  listTreasuries(): readonly Treasury[] { return [...this.treasuries.values()]; }
  listCheques(): readonly Cheque[] { return [...this.cheques.values()]; }
  listEntries(): readonly JournalEntry[] { return this.entries; }
  isReversed(entryId: string): boolean { return this.reversedBy.has(entryId); }
  get lockedThrough(): string | null { return this.lockedUntil; }
  /** Treasury ledger account for a cash box or bank account. */
  treasuryAccount(treasuryId: string): string {
    return this.treasury(treasuryId).kind === 'cash' ? SYSTEM.cash : SYSTEM.bank;
  }

  // ---------- write side ----------

  commit(posting: Posting): JournalEntry {
    if (posting.draft.reversalOf !== undefined || posting.draft.source.type === 'reversal') throw new AccountingError('DOCUMENT_INVALID', 'use reverse() to cancel an entry');
    return this.apply(posting);
  }

  private apply(posting: Posting): JournalEntry {
    const { draft } = posting;
    const date = assertIsoDate(draft.date, 'entry date');
    if (this.lockedUntil && date <= this.lockedUntil) throw new AccountingError('PERIOD_LOCKED', `${date} is in a closed period (through ${this.lockedUntil})`);
    const description = assertText(draft.description, 'description', 200);
    if (draft.source.documentId !== undefined) assertId(draft.source.documentId, 'documentId');

    const opening = posting.openCheque ? this.validateChequeOpen(posting.openCheque) : null;
    const settling = posting.settleCheque ? this.cheque(posting.settleCheque.chequeId) : null;
    if (settling && settling.status !== 'open') throw new AccountingError('CHEQUE_TRANSITION', `cheque ${settling.id} is ${settling.status}`);

    if (draft.lines.length < 2) throw new AccountingError('ENTRY_EMPTY', 'an entry needs at least two lines');
    let debit = 0;
    let credit = 0;
    for (const line of draft.lines) {
      this.validateLine(line, opening);
      debit += line.debit;
      credit += line.credit;
    }
    if (!Number.isSafeInteger(debit) || debit !== credit) throw new AccountingError('ENTRY_UNBALANCED', `debit ${debit} ≠ credit ${credit}`);
    // A cheque account only moves when this posting opens or settles that cheque (or reverses an entry that did).
    for (const line of draft.lines) {
      if (line.chequeId && !draft.reversalOf && line.chequeId !== opening?.id && line.chequeId !== settling?.id) {
        throw new AccountingError('CHEQUE_TRANSITION', `cheque ${line.chequeId} can only move through its own open/settle posting`);
      }
    }
    if (opening && !draft.lines.some((line) => line.chequeId === opening.id)) throw new AccountingError('CHEQUE_REQUIRED', 'the opened cheque must appear on a line');
    if (settling && !draft.lines.some((line) => line.chequeId === settling.id)) throw new AccountingError('CHEQUE_REQUIRED', 'the settled cheque must appear on a line');

    const entry: JournalEntry = {
      id: assertId(this.newId(), 'entry id'),
      date,
      description,
      source: { ...draft.source },
      lines: draft.lines.map((line) => ({ ...line })),
      ...(draft.reversalOf ? { reversalOf: draft.reversalOf } : {}),
      postedAt: this.now().toISOString(),
    };
    if (this.entryIndex.has(entry.id)) throw new AccountingError('ID_EXISTS', `entry ${entry.id}`);

    // All checks passed: apply atomically.
    this.entries.push(entry);
    this.entryIndex.set(entry.id, entry);
    if (opening) this.cheques.set(opening.id, { ...opening, status: 'open', openedBy: entry.id });
    if (settling && posting.settleCheque) this.cheques.set(settling.id, { ...settling, status: posting.settleCheque.status, settledBy: entry.id });
    return entry;
  }

  /**
   * Cancels a posted entry by posting its mirror image. An entry can be reversed once; a reversal
   * cannot itself be reversed (post the document again instead). Cheques follow the reversal:
   * reversing the entry that opened a still-open cheque voids it, reversing a settlement reopens it.
   */
  reverse(entryId: string, date: string, reason: string): JournalEntry {
    const original = this.entry(entryId);
    if (original.reversalOf) throw new AccountingError('ENTRY_ALREADY_REVERSED', 'a reversal cannot be reversed');
    if (this.reversedBy.has(entryId)) throw new AccountingError('ENTRY_ALREADY_REVERSED', entryId);
    assertIsoDate(date, 'reversal date');
    if (date < original.date) throw new AccountingError('DATE_INVALID', 'a reversal cannot predate the entry it cancels');
    const opened = [...this.cheques.values()].find((cheque) => cheque.openedBy === entryId);
    const settled = [...this.cheques.values()].find((cheque) => cheque.settledBy === entryId);
    if (opened && opened.status !== 'open') throw new AccountingError('CHEQUE_TRANSITION', `reverse the settlement of cheque ${opened.id} first`);

    // Validate through commit (balance, lock, accounts); the cheque rows are adjusted after.
    const mirrored: EntryDraft = {
      date,
      description: `برگشت سند: ${assertText(reason, 'reason', 150)}`,
      source: { type: 'reversal', documentId: original.source.documentId },
      reversalOf: entryId,
      lines: original.lines.map((line) => ({ ...line, debit: line.credit, credit: line.debit })),
    };
    const reversal = this.apply({ draft: mirrored });
    this.reversedBy.set(entryId, reversal.id);
    if (opened) this.cheques.set(opened.id, { ...opened, status: 'void', settledBy: reversal.id });
    if (settled) {
      const { settledBy: _drop, ...rest } = settled;
      this.cheques.set(settled.id, { ...rest, status: 'open' });
    }
    return reversal;
  }

  // ---------- validation helpers ----------

  private validateChequeOpen(input: ChequeOpen): ChequeOpen {
    assertId(input.id, 'cheque.id');
    if (this.cheques.has(input.id)) throw new AccountingError('CHEQUE_EXISTS', input.id);
    if (input.direction !== 'received' && input.direction !== 'issued') throw new AccountingError('DOCUMENT_INVALID', 'cheque.direction');
    this.party(input.partyId);
    return {
      id: input.id,
      direction: input.direction,
      number: assertText(input.number, 'cheque.number', 40),
      ...(input.bank ? { bank: assertText(input.bank, 'cheque.bank', 60) } : {}),
      dueDate: assertIsoDate(input.dueDate, 'cheque.dueDate'),
      amount: assertRial(input.amount, 'cheque.amount'),
      partyId: input.partyId,
    };
  }

  private validateLine(line: JournalLine, opening: ChequeOpen | null): void {
    const account = this.account(line.account);
    if (!account.active) throw new AccountingError('ACCOUNT_INACTIVE', account.code);
    assertRial(line.debit, 'debit', { allowZero: true });
    assertRial(line.credit, 'credit', { allowZero: true });
    if ((line.debit > 0) === (line.credit > 0)) throw new AccountingError('LINE_INVALID', `line on ${account.code} must be a debit or a credit`);
    if (line.memo !== undefined && (typeof line.memo !== 'string' || line.memo.length > 200)) throw new AccountingError('LINE_INVALID', 'memo');

    const has = { treasury: line.treasuryId !== undefined, party: line.partyId !== undefined, cheque: line.chequeId !== undefined };
    for (const key of ['treasury', 'party', 'cheque'] as const) {
      if (has[key] && account.dimension !== key) throw new AccountingError('DIMENSION_NOT_ALLOWED', `${key} on account ${account.code}`);
    }
    if (account.dimension === 'treasury') {
      if (!line.treasuryId) throw new AccountingError('TREASURY_REQUIRED', account.code);
      if (this.treasuryAccount(line.treasuryId) !== account.code) throw new AccountingError('LINE_INVALID', `treasury ${line.treasuryId} does not belong on ${account.code}`);
    }
    if (account.dimension === 'party') {
      if (!line.partyId) throw new AccountingError('PARTY_REQUIRED', account.code);
      this.party(line.partyId);
    }
    if (account.dimension === 'cheque') {
      if (!line.chequeId) throw new AccountingError('CHEQUE_REQUIRED', account.code);
      const cheque = opening && opening.id === line.chequeId ? opening : this.cheque(line.chequeId);
      const expected = account.code === SYSTEM.chequesReceived ? 'received' : 'issued';
      if (cheque.direction !== expected) throw new AccountingError('LINE_INVALID', `cheque ${cheque.id} is ${cheque.direction}, account ${account.code} holds ${expected}`);
      if (line.debit + line.credit !== cheque.amount) throw new AccountingError('LINE_INVALID', `cheque line must carry the full cheque amount ${cheque.amount}`);
    }
  }
}
