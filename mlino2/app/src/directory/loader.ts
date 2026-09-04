// loader.ts — نقطه‌ی ورود Snapshot به Cache (گزینه‌ی ۲ قرارداد: فایل Export دوره‌ای)
// داده‌ی فعلی Mock است؛ در آینده همین تابع به فایل/پاسخ واقعی V1 وصل می‌شود
// و فقط «منبع» عوض می‌شود — نه شکل داده و نه سرویس مصرف‌کننده.

/** نسخه‌ی Mock فاز ۱ — تنها جایی در کد V2 که نام «Mock» می‌آید */
export async function loadMockSnapshotRaw(): Promise<unknown> {
  const raw = (await import('./data/mock_dataset.json')).default;
  return raw;
}
