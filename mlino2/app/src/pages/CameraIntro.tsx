import { useEffect, useState } from 'react';
import { AppHeader, Button } from '../design/ui';
import LiveIcon from '../live/icons';
import { tr } from '../i18n';

/**
 * Before the live storefront asks for the camera: what it is for, and a choice. The camera starts only after
 * «اجازه‌ی دوربین»; a phone that already allowed it goes straight in. «ادامه بدون دوربین» really opens the
 * storefront without the camera (no permission is asked), so saying no never blocks browsing.
 */
export default function CameraIntro({ onAllow, onWithout, onBack }: { onAllow: () => void; onWithout: () => void; onBack: () => void }) {
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
      <AppHeader title={<span id="camera-intro-title">{tr('ویترین زنده')}</span>} onBack={onBack} />
      <div className="rs-camera-art" aria-hidden="true"><span><LiveIcon name="camera" size={56} /></span></div>
      <div className="rs-card"><strong>{tr('نمایش در محیط اطراف')}</strong>
        <p>{tr('گوشی را به اطراف بگیر تا کسب‌وکارهای نزدیک در جهت تقریبی خودشان دیده شوند. تصویر زنده‌ی دوربین فقط روی گوشی نشان داده می‌شود؛ فقط وقتی خودت «جست‌وجو با این عکس» را بزنی، همان یک عکس برای پیدا کردن محصول فرستاده می‌شود.')}</p></div>
      <Button wide onClick={onAllow}>{tr('اجازه‌ی دوربین')}</Button>
      <Button wide variant="ghost" onClick={onWithout}>{tr('ادامه بدون دوربین')}</Button>
    </div>
  </section>;
}
