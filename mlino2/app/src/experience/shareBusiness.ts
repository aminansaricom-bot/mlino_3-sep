import type { V2BusinessDirectoryRecord } from '../directory/contract';
import { categoryLabel } from '../uiFormat';

export function businessShareText(record: Pick<V2BusinessDirectoryRecord, 'name' | 'category'>): string {
  return [record.name, categoryLabel(record.category), 'کشف با MLINO', 'داده‌ی آزمایشی MLINO'].join('\n');
}

export interface ShareDelivery {
  share?: (data: {text: string}) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'manual';

/** Native share stays inside the explicit click; cancellation never copies anything. */
export async function shareBusiness(text: string, delivery: ShareDelivery): Promise<ShareResult> {
  if (delivery.share) {
    try { await delivery.share({text}); return 'shared'; }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (delivery.writeText) {
    try { await delivery.writeText(text); return 'copied'; }
    catch { /* Offer readable text when clipboard permission is denied. */ }
  }
  return 'manual';
}
