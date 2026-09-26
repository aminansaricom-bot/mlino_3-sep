/**
 * «The latest request wins» (D-91): each search takes a ticket; an answer is shown only if its ticket is still the
 * newest, so a slow answer for an old photo can never overwrite the results of the new one. Cancelling (a new photo,
 * «لغو», leaving the step) also makes every earlier ticket stale.
 */
export function createLatest() {
  let n = 0;
  return {
    next: () => { n += 1; return n; },
    isCurrent: (ticket: number) => ticket === n,
    cancel: () => { n += 1; },
  };
}
