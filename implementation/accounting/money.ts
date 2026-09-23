// Money in the accounting module is always a whole number of Rials held in a JS number.
// Safe integers reach 9e15 Rials, far beyond any small-business book. Nothing here uses
// floating point for stored amounts: rates are basis points and every division rounds once.

import { AccountingError } from './errors';

export type Rial = number;

export function assertRial(value: unknown, field: string, { allowZero = false } = {}): Rial {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || (!allowZero && value === 0)) {
    throw new AccountingError('AMOUNT_INVALID', `${field} must be a ${allowZero ? 'non-negative' : 'positive'} whole number of Rials`);
  }
  return value;
}

/** Integer division rounded half-up (both operands non-negative). */
export function divideHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || numerator < 0 || denominator <= 0) {
    throw new AccountingError('AMOUNT_INVALID', 'rounding needs non-negative safe integers');
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  return remainder * 2 >= denominator ? quotient + 1 : quotient;
}

/** VAT rate in basis points: 1000 = 10%. Stored per business with an effective date, never hard-coded. */
export function assertRateBp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 5000) {
    throw new AccountingError('VAT_RATE_INVALID', 'VAT rate must be 0..5000 basis points');
  }
  return value;
}

/** VAT added on top of a net amount. */
export function vatOnNet(net: Rial, rateBp: number): Rial {
  return divideHalfUp(net * rateBp, 10_000);
}

/** VAT contained in a VAT-inclusive gross amount. */
export function vatInGross(gross: Rial, rateBp: number): Rial {
  return divideHalfUp(gross * rateBp, 10_000 + rateBp);
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    total += value;
    if (!Number.isSafeInteger(total)) throw new AccountingError('AMOUNT_INVALID', 'total exceeds the safe range');
  }
  return total;
}
