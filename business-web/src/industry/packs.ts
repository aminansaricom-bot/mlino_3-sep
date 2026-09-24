// Trade packs: the words and switches that differ between kinds of business. Core names no trade (D-63); all trade
// vocabulary lives here, in the panel, and the member chooses the pack for their business. Nothing in a pack changes
// what the data means — only how the panel speaks and which optional tools it shows.

export type PackId = 'food' | 'retail' | 'services' | 'health' | 'general';

export type Pack = Readonly<{
  id: PackId;
  label: string;
  hint: string;
  /** What the published catalog is called: «منو»، «محصولات»، «خدمات». */
  catalog: string;
  /** Title of the catalog page. */
  catalogTitle: string;
  /** One entry of it: «قلم منو»، «کالا»، «خدمت». */
  item: string;
  /** Where the business meets customers, for sentences like «فرم در …». */
  place: string;
  /** Inventory «recipes»: each sold item consumes stock items (food, production). */
  recipes: boolean;
  /** Sensitive category (R8-a §3.10): CRM and chat stay off. */
  sensitive: boolean;
  /** Words the assistant reads as «buying goods/materials» for this trade. */
  purchaseWords: string;
  /** Example stock receipt for the assistant and its hints. */
  stockExample: string;
  /** Example offer title in the offer form. */
  offerExample: string;
}>;

export const PACKS: Readonly<Record<PackId, Pack>> = {
  food: {
    id: 'food', label: 'کافه، رستوران و غذا', hint: 'منو، دستور مصرف مواد، سفارش و فروش روزانه',
    catalog: 'منو', catalogTitle: 'محصولات و منو', item: 'قلم منو', place: 'کافه', recipes: true, sensitive: false,
    purchaseWords: 'شیر|قهوه|مواد|نان|شیرینی|میوه|گوشت|مرغ|برنج|سبزی|چای',
    stockExample: '۲۰ کیلو شیر وارد انبار شد به قیمت ۹ میلیون',
    offerExample: '۲۰٪ تخفیف ناهار دونفره',
  },
  retail: {
    id: 'retail', label: 'فروشگاه و خرده‌فروشی', hint: 'کالا، موجودی انبار، فروش و خرید از تأمین‌کننده',
    catalog: 'محصولات', catalogTitle: 'محصولات', item: 'کالا', place: 'فروشگاه', recipes: false, sensitive: false,
    purchaseWords: 'جنس|اجناس|بار|کالا|خرید از پخش|پخش',
    stockExample: '۲۰ عدد دفتر وارد انبار شد به قیمت ۴ میلیون',
    offerExample: '۱۵٪ تخفیف خرید دوم',
  },
  services: {
    id: 'services', label: 'خدمات (آرایشگاه، آموزش، تعمیر و…)', hint: 'فهرست خدمات، نوبت و مشتری، مواد مصرفی',
    catalog: 'خدمات', catalogTitle: 'خدمات', item: 'خدمت', place: 'محل کار', recipes: false, sensitive: false,
    purchaseWords: 'مواد مصرفی|لوازم|قطعه|قطعات',
    stockExample: '۱۰ عدد رنگ مو وارد انبار شد به قیمت ۵ میلیون',
    offerExample: '۲۰٪ تخفیف نوبت‌های صبح',
  },
  health: {
    id: 'health', label: 'سلامت (کلینیک، مطب، داروخانه)', hint: 'حوزه‌ی حساس: CRM و گفتگو خاموش می‌مانند',
    catalog: 'خدمات', catalogTitle: 'خدمات', item: 'خدمت', place: 'مطب', recipes: false, sensitive: true,
    purchaseWords: 'دارو|لوازم پزشکی|مواد مصرفی|تجهیزات',
    stockExample: '۵۰ عدد ماسک وارد انبار شد به قیمت ۲ میلیون',
    offerExample: 'مشاوره‌ی رایگان هفته‌ی اول',
  },
  general: {
    id: 'general', label: 'سایر کسب‌وکارها', hint: 'واژه‌های عمومی: محصولات و خدمات',
    catalog: 'محصولات و خدمات', catalogTitle: 'محصولات و خدمات', item: 'قلم', place: 'محل کسب‌وکار', recipes: false, sensitive: false,
    purchaseWords: 'خرید کالا|اجناس|مواد',
    stockExample: '۲۰ عدد کالا وارد انبار شد به قیمت ۴ میلیون',
    offerExample: '۱۰٪ تخفیف ویژه‌ی همسایه‌ها',
  },
};

export const PACK_IDS = Object.keys(PACKS) as PackId[];

/**
 * A first guess from what the business itself published (name and capabilities). Only a default: the member
 * confirms or changes it. Health words win, so a sensitive business is never shown CRM by mistake.
 */
export function guessPack(name: string, capabilities: readonly string[]): PackId {
  const text = [name, ...capabilities].join(' ');
  if (/دارو|پزشک|کلینیک|درمان|دندان|بیمارستان|آزمایشگاه|سلامت|مطب|فیزیوتراپی|بینایی|روان/.test(text)) return 'health';
  if (/کافه|قهوه|رستوران|غذا|نان|شیرینی|پیتزا|برگر|کباب|ساندویچ|سوخاری|آبمیوه|بستنی|فست ?فود|سفره/.test(text)) return 'food';
  if (/فروشگاه|سوپرمارکت|کتاب|پوشاک|لوازم|مارکت|بوتیک|عطر|موبایل/.test(text)) return 'retail';
  if (/آرایش|سالن|آموزش|تعمیر|خدمات|مشاوره|باشگاه|ورزش/.test(text)) return 'services';
  return 'general';
}
