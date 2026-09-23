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

/** Who acts. In the real product this comes from the Core session + membership, never from the page. */
export const DEMO_MEMBER = { id: 'member-owner', name: 'مالک کافه', grants: ['founding'] } as const;

export type AuditEntry = Readonly<{ at: string; module: string; summary: string; authorizedBy: string; executedVia: 'manual' | 'assistant' }>;

type WorkspaceValue = {
  today: string;
  path: string;
  navigate: (path: string) => void;
  book: BookData;
  ledger: Ledger;
  inventory: Inventory;
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
    record('حسابداری', success, via);
    setToast(sales.length ? `${success} مصرف انبار هم ثبت شد.` : success);
    return null;
  }, [book, invData, inventory, record]);

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
    today, path, navigate, book, ledger, inventory, commitAccounting, commitInventory,
    updateSettings: (settings) => { const next = { ...book, settings }; setBook(next); saveBook(next); setToast('تنظیمات ذخیره شد.'); },
    resetDemo: () => {
      clearBook(); clearInventory(); void clearAttachments().then(() => setAttachVersion((v) => v + 1));
      const fresh = generateSample(today); saveBook(fresh); setBook(fresh);
      const freshInv = generateInventorySample(fresh); saveInventory(freshInv); setInvData(freshInv);
      setAudit([]); setToast('داده‌های نمونه از نو ساخته شد.');
    },
    attach, attachVersion, bumpAttachments: () => setAttachVersion((v) => v + 1),
    toast, notify: setToast, audit,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { DEFAULT_SETTINGS };
