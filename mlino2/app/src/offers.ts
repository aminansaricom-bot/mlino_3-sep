export type OfferStatus = 'active' | 'upcoming' | 'expired' | 'invalid';

/** Both boundaries are inclusive. Malformed or reversed intervals fail closed. */
export function offerStatus(validFrom: string, validUntil: string | null, now: number): OfferStatus {
  const start = Date.parse(validFrom);
  const end = validUntil === null ? Infinity : Date.parse(validUntil);
  if (!Number.isFinite(now) || !Number.isFinite(start) || Number.isNaN(end) || end < start) return 'invalid';
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

export function isOfferActiveAt(validFrom: string, validUntil: string | null, now: number): boolean {
  return offerStatus(validFrom, validUntil, now) === 'active';
}
