import type { V2BusinessDirectoryRecord } from '../directory/contract';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { tr } from '../i18n';

type ShareRecord = PublicUiRecord | Pick<V2BusinessDirectoryRecord, 'name' | 'category'>;

export function businessShareText(record: ShareRecord): string {
  if ('id' in record) return [record.name, tr('{0} (حدسی)', tr(record.category.label)), tr('کشف با MLINO')].join('\n');
  const labels: Record<string, string> = { dental_clinic: tr('دندان‌پزشکی'), beauty_clinic: tr('زیبایی'), cafe: tr('کافه'), restaurant: tr('رستوران'), retail_shop: tr('فروشگاه') };
  return [record.name, labels[record.category] ?? record.category, tr('کشف با MLINO'), tr('داده‌ی آزمایشی MLINO')].join('\n');
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
