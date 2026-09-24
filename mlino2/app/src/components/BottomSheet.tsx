import type { ReactNode } from 'react';
import { tr } from '../i18n';

/**
 * Bottom Sheet سه‌حالته — بسته / نیمه / باز.
 *
 * عمداً بدون کتابخانه‌ی drag: لمس روی دستگیره حالت بعدی را انتخاب می‌کند و
 * دکمه هم هست، پس با صفحه‌کلید و صفحه‌خوان هم کار می‌کند. کشیدن با انگشت
 * تجربه‌ی بهتری می‌داد اما یا وابستگی جدید می‌خواست یا مدیریت دستی رویدادهای
 * لمسی که با اسکرول داخل Sheet تداخل می‌کند — که ارزش ریسکش را نداشت.
 */

export type SheetState = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  state: SheetState;
  onStateChange: (s: SheetState) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const NEXT: Record<SheetState, SheetState> = {
  peek: 'half',
  half: 'full',
  full: 'peek',
};

export default function BottomSheet({
  state,
  onStateChange,
  title,
  subtitle,
  children,
}: BottomSheetProps) {
  return (
    <section className={`sheet ${state}`}>
      <button
        className="sheet-grab"
        onClick={() => onStateChange(NEXT[state])}
        aria-label={
          state === 'full' ? tr('بستن فهرست نتایج') : tr('باز کردن بیشترِ فهرست نتایج')
        }
      >
        <div className="bar" />
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          {subtitle && <span className="sheet-sub">{subtitle}</span>}
        </div>
      </button>

      <div className="sheet-body">{children}</div>
    </section>
  );
}
