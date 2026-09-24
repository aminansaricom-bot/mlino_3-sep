import { useState } from 'react';
import { Icon } from '../design/Icon';
import { businessShareText, shareBusiness, type ShareResult } from './shareBusiness';
import type { RichUiRecord } from '../components/businessView';
import { tr } from '../i18n';

export default function ShareBusinessAction({record}: {record: RichUiRecord}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShareResult | null>(null);
  const text = businessShareText(record);
  async function share() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await shareBusiness(text, {
        share: typeof navigator.share === 'function' ? data => navigator.share(data) : undefined,
        writeText: navigator.clipboard?.writeText ? value => navigator.clipboard.writeText(value) : undefined,
      }));
    } finally { setBusy(false); }
  }
  return <>
    <button className="share-action" disabled={busy} onClick={() => { void share(); }}><Icon name="share" />{busy ? tr('در حال آماده‌سازی…') : tr('اشتراک‌گذاری')}</button>
    {result === 'copied' && <p className="share-result" role="status">{tr('متن کپی شد.')}</p>}
    {result === 'shared' && <p className="share-result" role="status">{tr('متن به ابزار اشتراک‌گذاری تحویل داده شد.')}</p>}
    {result === 'manual' && <div className="share-result"><p role="status">{tr('اشتراک‌گذاری خودکار ممکن نیست؛ متن را انتخاب و کپی کن.')}</p><label>{tr('متن اشتراک‌گذاری')}<textarea readOnly value={text} rows={4} /></label></div>}
  </>;
}
