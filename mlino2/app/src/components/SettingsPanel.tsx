import { formatIso } from '../uiFormat';

/**
 * تنظیمات / Diagnostics — جایی که جزئیات فنی زندگی می‌کنند.
 *
 * پیش از این، این اطلاعات روی صفحه‌ی اصلی بود و اپ را شبیه داشبورد توسعه‌دهنده
 * می‌کرد. حذف نشدند — فقط جابه‌جا شدند، چون همچنان لازم‌اند: شفافیت موتور فهم
 * نیت یکی از الزامات بازبینی است و نباید از بین برود، فقط نباید جلوی چشم
 * کاربر عادی باشد.
 */

interface SettingsPanelProps {
  resolverInfo: string;
  lastSyncedAt: string | null;
  recordCount: number;
  tileStatus: 'loading' | 'ready' | 'error';
  onClose: () => void;
}

export default function SettingsPanel({
  resolverInfo,
  lastSyncedAt,
  recordCount,
  tileStatus,
  onClose,
}: SettingsPanelProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>تنظیمات و وضعیت</h3>
        <button className="panel-close" onClick={onClose} aria-label="بستن">
          ✕
        </button>
      </div>

      <div className="panel-body">
        <div className="section-title">وضعیت داده</div>
        <div className="diag-row">
          <span className="k">منبع داده</span>
          <span className="v">
            داده‌ی آزمایشی <span className="mock-badge">Mock</span>
          </span>
        </div>
        <div className="diag-row">
          <span className="k">تعداد کسب‌وکار</span>
          <span className="v">{recordCount.toLocaleString('fa-IR')}</span>
        </div>
        <div className="diag-row">
          <span className="k">آخرین به‌روزرسانی</span>
          <span className="v">{formatIso(lastSyncedAt ?? '')}</span>
        </div>

        <div className="section-title">موتور فهم نیت</div>
        <div className="diag-row">
          <span className="k">وضعیت</span>
          <span className="v">{resolverInfo}</span>
        </div>

        <div className="section-title">نقشه</div>
        <div className="diag-row">
          <span className="k">وضعیت کاشی‌ها</span>
          <span className="v">
            {tileStatus === 'ready'
              ? 'بارگذاری‌شده'
              : tileStatus === 'loading'
                ? 'در حال بارگذاری'
                : 'خطا در دریافت'}
          </span>
        </div>

        <p className="diag-note">
          داده‌های این نسخه آزمایشی‌اند و هنوز از سیستم واقعی کسب‌وکارها منتشر
          نشده‌اند. اعمال پلن در این نسخه سمت کلاینت است — یعنی تجربه‌ی کاربری،
          نه سازوکار امنیتی.
        </p>
      </div>
    </div>
  );
}
