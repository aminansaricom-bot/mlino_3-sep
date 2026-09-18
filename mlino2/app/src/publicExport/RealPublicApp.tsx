import { useEffect, useMemo, useState } from 'react';
import { PublicExportConsumer, FETCH_INTERVAL_MS } from './consumer';
import type { PublicRecord } from './mapping';
import { trustBundleFromBuildJson } from './trustBundle';
import { FetchTransport } from './transport';

function configuredConsumer(): PublicExportConsumer | null {
  // Public keys and the URL are deployment configuration, never private signing material.
  const url = import.meta.env.VITE_PUBLIC_EXPORT_URL;
  const bundle = import.meta.env.VITE_PUBLIC_EXPORT_TRUST_BUNDLE;
  if (!url || !bundle) return null;
  try { return new PublicExportConsumer(new FetchTransport(url), trustBundleFromBuildJson(bundle)); }
  catch { return null; }
}

export default function RealPublicApp() {
  const consumer = useMemo(configuredConsumer, []);
  const [now, setNow] = useState(() => Date.now());
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    console.info('[public-export] real signed-artifact mode');
    if (!consumer) return;
    let active = true;
    const refresh = async () => {
      try { await consumer.refresh(); if (active) setRefreshFailed(false); }
      catch { if (active) setRefreshFailed(true); }
      if (active) setNow(Date.now());
    };
    void refresh();
    const polling = window.setInterval(() => { void refresh(); }, FETCH_INTERVAL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; window.clearInterval(polling); window.clearInterval(clock); };
  }, [consumer]);

  const records = consumer?.read(now) ?? [];
  const selected = selectedId ? records.find((item) => item.business.organization_id === selectedId) ?? null : null;
  const near = point && consumer ? consumer.findNear(point.latitude, point.longitude, 5000, now) : null;
  const shown = near?.map(({ record }) => record) ?? records;
  const valid = consumer?.hasValidSnapshot(now) ?? false;
  const locate = () => navigator.geolocation?.getCurrentPosition(
    ({ coords }) => setPoint({ latitude: coords.latitude, longitude: coords.longitude }),
    () => setPoint(null),
  );

  return <main dir="rtl" style={{ maxWidth: 760, margin: '0 auto', padding: 24, fontFamily: 'system-ui', lineHeight: 1.7 }}>
    <header><h1>ملینو</h1><p>اطلاعات عمومی تأییدشدهٔ کسب‌وکارها</p></header>
    {!valid && <p role="status">اطلاعات واقعی فعلاً در دسترس نیست. دادهٔ آزمایشی جای آن نمایش داده نمی‌شود.</p>}
    {valid && refreshFailed && <p role="status">دریافت تازه انجام نشد؛ نسخهٔ معتبر پیشین تا پایان اعتبارش نمایش داده می‌شود.</p>}
    {valid && <>
      <button type="button" onClick={locate}>نزدیک من</button>{' '}
      {point && <button type="button" onClick={() => setPoint(null)}>نمایش همه</button>}
      <p>{shown.length.toLocaleString('fa-IR')} کسب‌وکار</p>
      {shown.length === 0 && <p>موردی برای نمایش نیست.</p>}
      {shown.map((record) => <button key={record.business.organization_id} type="button"
        onClick={() => setSelectedId(record.business.organization_id)}
        style={{ display: 'block', width: '100%', textAlign: 'right', margin: '8px 0', padding: 12 }}>
        <strong>{record.business.name}</strong>
        {record.business.description && <span> — {record.business.description}</span>}
      </button>)}
    </>}
    {selected && <BusinessDetails record={selected} onClose={() => setSelectedId(null)} />}
  </main>;
}

function BusinessDetails({ record, onClose }: { record: PublicRecord; onClose: () => void }) {
  const { business, capabilities, offers } = record;
  return <section aria-label="جزئیات کسب‌وکار" style={{ borderTop: '1px solid #888', marginTop: 20 }}>
    <button type="button" onClick={onClose}>بستن</button>
    <h2>{business.name}</h2>
    {business.description && <p>{business.description}</p>}
    {business.location?.address_text && <p>نشانی: {business.location.address_text}</p>}
    {business.contact_information?.public_phone && <p>تلفن عمومی: {business.contact_information.public_phone}</p>}
    {business.contact_information?.public_email && <p>ایمیل عمومی: {business.contact_information.public_email}</p>}
    {business.links?.website && <p>وب‌سایت: {business.links.website}</p>}
    <h3>توانمندی‌ها</h3>
    {capabilities.length === 0 ? <p>توانمندی منتشرشده‌ای در دسترس نیست.</p> : <ul>{capabilities.map((item) =>
      <li key={item.capability_id}>{item.name}{item.short_description && ` — ${item.short_description}`}</li>)}</ul>}
    <h3>پیشنهادها</h3>
    {offers.length === 0 ? <p>پیشنهاد فعالی در دسترس نیست.</p> : <ul>{offers.map((item) =>
      <li key={item.offer_version_id}>
        <strong>{item.name}</strong>{item.short_description && ` — ${item.short_description}`}
        {item.price_amount && <span> · {item.price_amount} {item.price_currency ?? ''}</span>}
        {item.on_request && <span> · با درخواست</span>}
      </li>)}</ul>}
  </section>;
}
