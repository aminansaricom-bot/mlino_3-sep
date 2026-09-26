/**
 * The time the freshness checks use. A phone's clock is often off by a minute or more (no automatic time); the
 * export is re-signed every minute and accepted only within ±30 s of «now», so a phone just a little slow rejected
 * every fresh export and showed no businesses at all. The server states its time in each response's Date header;
 * the offset from it corrects the phone's clock. Freshness is a correctness guard, not a security boundary: the
 * signature check is unchanged.
 */
let offsetMs = 0;

/** Learn the phone's clock offset from a response's Date header (1 s resolution; small offsets are ignored). */
export function noteServerDate(header: string | null, localNow = Date.now()): void {
  if (!header) return;
  const server = Date.parse(header);
  if (!Number.isFinite(server)) return;
  const offset = server - localNow;
  // Within 2 s is the header's own rounding plus the trip: keep the phone's time.
  offsetMs = Math.abs(offset) <= 2_000 ? 0 : offset;
}

/** Now, by the server's clock when known. */
export function serverNow(): number { return Date.now() + offsetMs; }

/** For tests. */
export function resetServerClock(): void { offsetMs = 0; }
