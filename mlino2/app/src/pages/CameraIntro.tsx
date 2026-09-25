import { useEffect, useState } from 'react';
import { AppHeader, Button } from '../design/ui';
import LiveIcon from '../live/icons';
import { tr } from '../i18n';

/**
 * Before the live storefront asks for the camera: what it is for, and a choice. The camera starts only after
 * «اجازه‌ی دوربین»; a phone that already allowed it goes straight in. Without a camera the storefront still opens
 * (cards over a plain background), so saying no never blocks browsing.
 */
export default function CameraIntro({ onAllow, onLater }: { onAllow: () => void; onLater: () => void }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let alive = true;
    navigator.permissions?.query({ name: 'camera' as PermissionName })
      .then((p) => { if (!alive) return; if (p.state === 'granted') onAllow(); else setChecked(true); })
      .catch(() => { if (alive) setChecked(true); });
    if (!navigator.permissions) setChecked(true);
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!checked) return null;
  return <section className="rs-layer" role="dialog" aria-modal="true" aria-labelledby="camera-intro-title">
    <div className="rs-inner">
      <AppHeader title={<span id="camera-intro-title">{tr('ویترین زنده')}</span>} onBack={onLater} />
      <div className="rs-camera-art" aria-hidden="true"><span><LiveIcon name="camera" size={56} /></span></div>
      <div className="rs-card"><strong>{tr('نمایش در محیط اطراف')}</strong>
        <p>{tr('گوشی را به اطراف بگیر تا کسب‌وکارها و محصولات نزدیک در جهت خودشان دیده شوند. برای این کار دسترسی دوربین لازم است؛ تصویر دوربین از گوشی بیرون نمی‌رود.')}</p></div>
      <Button wide onClick={onAllow}>{tr('اجازه‌ی دوربین')}</Button>
      <Button wide variant="ghost" onClick={onLater}>{tr('بعداً')}</Button>
      <p className="rs-lead"><small>{tr('اگر دوربین در دسترس نباشد، ویترین بدون تصویر دوربین باز می‌شود.')}</small></p>
    </div>
  </section>;
}
