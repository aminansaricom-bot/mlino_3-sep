// Workspace = the demo stand-in for Core services the panel talks to: the organization and member,
// the module stores and the one write path per module. Pages and the assistant never write anywhere
// else: a manual form and an assistant-confirmed proposal call exactly the same commit functions.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearBook, DEFAULT_SETTINGS, loadBook, replay, saveBook, type BookData, type Op, type Settings } from './book';
import { generateSample } from './sample';
import { addAttachments, clearAttachments } from './attachments';
import { errorText, faNum, todayIso } from './format';
import type { Ledger } from './engine';
import type { Inventory } from './inventoryEngine';
import { clearInventory, generateInventorySample, loadInventory, replayInventory, runInvOp, saveInventory, salesFromAccountingOp, type InvData, type InvOp } from './modules/inventory/data';
import { InventoryError } from './inventoryEngine';
import { CrmError, type Crm, type Erasure } from './crmEngine';
import { clearCrm, eraseFromStore, generateCrmSample, loadCrm, replayCrm, runCrmOp, saveCrm, visitFromAccountingOp, type CrmData, type CrmOp } from './modules/crm/data';
import { invoiceTotals } from './engine';

/** Who acts. In the real product this comes from the Core session + membership, never from the page. */
export const DEMO_MEMBER = { id: 'member-owner', name: 'مالک کسب‌وکار', grants: ['founding'] } as const;

export type AuditEntry = Readonly<{ at: string; module: string; summary: string; authorizedBy: string; executedVia: 'manual' | 'assistant' }>;

type WorkspaceValue = {
  today: string;
  path: string;
  navigate: (path: string) => void;
  book: BookData;
  ledger: Ledger;
  inventory: Inventory;
  crm: Crm;
  commitCrm: (op: CrmOp, success: string, via?: AuditEntry['executedVia']) => string | null;
  eraseCustomer: (customerId: string, reason: Erasure['reason']) => string | null;
  commitAccounting: (op: Op, success: string, via?: AuditEntry['executedVia']) => string | null;
  commitInventory: (op: InvOp, success: string, via?: AuditEntry['executedVia']) => string | null;
  updateSettings: (settings: Settings) => void;
  resetDemo: () => void;
  attach: (docId: string, files: readonly File[]) => void;
  attachVersion: number;
  bumpAttachments: () => void;
  toast: string | null;
  notify: (message: string) => void;
  audit: readonly AuditEntry[];
};

const Ctx = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useWorkspace outside WorkspaceProvider');
  return value;
}

function initialBook(today: string): BookData {
  const stored = loadBook();
  if (stored) { try { replay(stored); return stored; } catch { /* start over */ } }
  const fresh = generateSample(today);
  saveBook(fresh);
  return fresh;
}

function initialInventory(book: BookData): InvData {
  const stored = loadInventory();
  if (stored) { try { replayInventory(stored); return stored; } catch { /* start over */ } }
  const fresh = generateInventorySample(book);
  saveInventory(fresh);
  return fresh;
}

function crmErrorText(error: unknown): string {
  if (error instanceof CrmError) {
    const map: Record<string, string> = {
      CONSENT_REQUIRED: 'بدون رضایت عضویت مشتری، هیچ اطلاعاتی نگه داشته نمی‌شود.',
      CONSENT_INACTIVE: 'رضایت این مشتری فعال نیست (منقضی شده). اول با رضایت تازه تمدید کن یا اطلاعات را حذف کن.',
      CONSENT_INVALID: 'رضایت کامل نیست یا مدتش بیش از ۲۴ ماه است.',
      CUSTOMER_UNKNOWN: 'این مشتری پیدا نشد.',
      CUSTOMER_EXISTS: 'این مشتری قبلاً ثبت شده.',
      SENSITIVE_CATEGORY: 'CRM برای دسته‌های حساس (مثل سلامت) خاموش است.',
      INPUT_INVALID: 'اطلاعات فرم درست نیست (نام، تلفن ۰۹… یا برچسب‌ها).',
      DATE_INVALID: 'تاریخ درست نیست.',
    };
    return map[error.code] ?? 'ثبت انجام نشد.';
  }
  return 'ثبت انجام نشد.';
}

function initialCrm(book: BookData, today: string): CrmData {
  const stored = loadCrm();
  if (stored) { try { replayCrm(stored); return stored; } catch { /* start over */ } }
  const fresh = generateCrmSample(book, today);
  saveCrm(fresh);
  return fresh;
}

function invErrorText(error: unknown): string {
  if (error instanceof InventoryError) {
    const map: Record<string, string> = {
      INSUFFICIENT_STOCK: 'به این اندازه در انبار موجود نیست.',
      QTY_INVALID: 'مقدار باید عدد صحیح مثبت باشد.',
      VALUE_INVALID: 'مبلغ درست نیست.',
      ITEM_UNKNOWN: 'این کالا در انبار تعریف نشده.',
      ITEM_EXISTS: 'این کالا قبلاً تعریف شده.',
      RECIPE_INVALID: 'دستور مصرف درست نیست.',
      DATE_INVALID: 'تاریخ درست نیست.',
      INPUT_INVALID: 'اطلاعات کامل نیست.',
    };
    return map[error.code] ?? 'ثبت انجام نشد.';
  }
  return 'ثبت انجام نشد.';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => todayIso(), []);
  const [book, setBook] = useState<BookData>(() => initialBook(today));
  const [invData, setInvData] = useState<InvData>(() => initialInventory(book));
  const ledger = useMemo(() => replay(book), [book]);
  const inventory = useMemo(() => replayInventory(invData), [invData]);
  const [crmData, setCrmData] = useState<CrmData>(() => initialCrm(book, today));
  const crm = useMemo(() => replayCrm(crmData), [crmData]);
  const [path, setPath] = useState(() => location.pathname);
  const [toast, setToast] = useState<string | null>(null);
  const [attachVersion, setAttachVersion] = useState(0);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => { const onPop = () => setPath(location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); }, [toast]);

  const navigate = useCallback((to: string) => {
    if (to !== location.pathname) history.pushState(null, '', to);
    setPath(to);
    window.scrollTo({ top: 0 });
  }, []);

  const record = useCallback((module: string, summary: string, via: AuditEntry['executedVia']) => {
    setAudit((a) => [{ at: new Date().toISOString(), module, summary, authorizedBy: DEMO_MEMBER.name, executedVia: via }, ...a].slice(0, 50));
  }, []);

  const commitAccounting = useCallback((op: Op, success: string, via: AuditEntry['executedVia'] = 'manual'): string | null => {
    const next: BookData = { ...book, ops: [...book.ops, op] };
    try { replay(next); } catch (error) { return errorText(error); }
    setBook(next); saveBook(next);
    // Declared one-way module flow: an invoice's menu lines consume their recipes in the inventory module.
    const sales = salesFromAccountingOp(op, inventory);
    if (sales.length) {
      const nextInv: InvData = { ...invData, ops: [...invData.ops, ...sales] };
      try { replayInventory(nextInv); setInvData(nextInv); saveInventory(nextInv); } catch { /* sales never block the books */ }
    }
    // Declared one-way flow: an invoice to an accounting customer linked to an active member records a visit.
    let visited = false;
    if (op.k === 'invoice') {
      try {
        const total = invoiceTotals(op.input).total;
        const visits = visitFromAccountingOp(op, crm, total);
        if (visits.length) { const nextCrm: CrmData = { ...crmData, ops: [...crmData.ops, ...visits] }; replayCrm(nextCrm); setCrmData(nextCrm); saveCrm(nextCrm); visited = true; }
      } catch { /* a visit never blocks the books */ }
    }
    record('حسابداری', success, via);
    setToast([success, sales.length ? 'مصرف انبار هم ثبت شد.' : '', visited ? 'مراجعه‌ی مشتری عضو هم ثبت شد.' : ''].filter(Boolean).join(' '));
    return null;
  }, [book, invData, inventory, crm, crmData, record]);

  const commitCrm = useCallback((op: CrmOp, success: string, via: AuditEntry['executedVia'] = 'manual'): string | null => {
    const next: CrmData = { ...crmData, ops: [...crmData.ops, op] };
    try { const probe = replayCrm(crmData); runCrmOp(probe, op); } catch (error) { return crmErrorText(error); }
    setCrmData(next); saveCrm(next);
    if (op.k !== 'view') { record('مشتریان', success, via); setToast(success); }
    return null;
  }, [crmData, record]);

  const eraseCustomer = useCallback((customerId: string, reason: Erasure['reason']): string | null => {
    try {
      const next = eraseFromStore(crmData, crm, customerId, today, reason);
      replayCrm(next);
      setCrmData(next); saveCrm(next);
    } catch (error) { return crmErrorText(error); }
    record('مشتریان', 'اطلاعات یک مشتری به‌طور کامل حذف شد', 'manual');
    setToast('اطلاعات مشتری به‌طور کامل حذف شد؛ در دفتر حذف فقط یک شناسه‌ی بی‌نام ماند.');
    return null;
  }, [crmData, crm, today, record]);

  const commitInventory = useCallback((op: InvOp, success: string, via: AuditEntry['executedVia'] = 'manual'): string | null => {
    const next: InvData = { ...invData, ops: [...invData.ops, op] };
    try { const probe = replayInventory(invData); runInvOp(probe, op); } catch (error) { return invErrorText(error); }
    setInvData(next); saveInventory(next);
    record('انبار', success, via);
    setToast(success);
    return null;
  }, [invData, record]);

  const attach = useCallback((docId: string, files: readonly File[]) => {
    void addAttachments(docId, files)
      .then((r) => { setAttachVersion((v) => v + 1); setToast(r.rejected.length ? `پیوست ذخیره نشد: ${r.rejected[0]}` : `سند با ${faNum(r.added.length)} پیوست ثبت شد.`); })
      .catch(() => setToast('سند ثبت شد، ولی ذخیره‌ی پیوست روی این مرورگر ممکن نشد.'));
  }, []);

  const value: WorkspaceValue = {
    today, path, navigate, book, ledger, inventory, crm, commitCrm, eraseCustomer, commitAccounting, commitInventory,
    updateSettings: (settings) => { const next = { ...book, settings }; setBook(next); saveBook(next); setToast('تنظیمات ذخیره شد.'); },
    resetDemo: () => {
      clearBook(); clearInventory(); clearCrm(); void clearAttachments().then(() => setAttachVersion((v) => v + 1));
      const fresh = generateSample(today); saveBook(fresh); setBook(fresh);
      const freshInv = generateInventorySample(fresh); saveInventory(freshInv); setInvData(freshInv);
      clearCrm(); const freshCrm = generateCrmSample(fresh, today); saveCrm(freshCrm); setCrmData(freshCrm);
      setAudit([]); setToast('داده‌های نمونه از نو ساخته شد.');
    },
    attach, attachVersion, bumpAttachments: () => setAttachVersion((v) => v + 1),
    toast, notify: setToast, audit,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { DEFAULT_SETTINGS };
