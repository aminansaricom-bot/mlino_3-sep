export type AccountingErrorCode =
  | 'AMOUNT_INVALID'
  | 'VAT_RATE_INVALID'
  | 'DATE_INVALID'
  | 'ENTRY_UNBALANCED'
  | 'ENTRY_EMPTY'
  | 'LINE_INVALID'
  | 'ACCOUNT_UNKNOWN'
  | 'ACCOUNT_INACTIVE'
  | 'ACCOUNT_EXISTS'
  | 'PARTY_REQUIRED'
  | 'PARTY_UNKNOWN'
  | 'TREASURY_REQUIRED'
  | 'TREASURY_UNKNOWN'
  | 'CHEQUE_REQUIRED'
  | 'CHEQUE_UNKNOWN'
  | 'CHEQUE_EXISTS'
  | 'CHEQUE_TRANSITION'
  | 'DIMENSION_NOT_ALLOWED'
  | 'PERIOD_LOCKED'
  | 'ENTRY_UNKNOWN'
  | 'ENTRY_ALREADY_REVERSED'
  | 'ID_EXISTS'
  | 'DOCUMENT_INVALID';

/** Every rejection carries a stable code; messages are for developers, the UI maps codes to Persian text. */
export class AccountingError extends Error {
  constructor(readonly code: AccountingErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'AccountingError';
  }
}
