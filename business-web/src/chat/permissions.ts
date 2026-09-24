// Names the panel shows for permission keys. The keys themselves come from Core and the modules; unknown keys
// are shown as they are, never hidden, so a member always sees everything they hold.

export const ADMIN_KEYS = ['membership.create', 'membership.revoke', 'permission_grant.issue', 'permission_grant.revoke'] as const;

const LABELS: Record<string, string> = {
  'chat.reply': 'گفتگو با مشتری',
  'offer.manage': 'ساخت آفر',
  'publication.manage': 'انتشار',
  'plan.manage': 'تغییر پلن',
  'catalog_item.manage': 'محصولات و خدمات',
  'business_profile.manage': 'ویرایش ویترین',
  'capability.manage': 'قابلیت‌ها',
  'capability.confirm': 'تأیید قابلیت',
  'evidence.manage': 'مدارک',
  'evidence.confirm': 'تأیید مدرک',
  'membership.create': 'افزودن عضو',
  'membership.revoke': 'حذف عضو',
  'permission_grant.issue': 'دادن اجازه',
  'permission_grant.revoke': 'گرفتن اجازه',
  'identity_claim.submit': 'ادعای مالکیت',
  'identity_claim.review': 'بررسی ادعای مالکیت',
  'identity_verification.start': 'شروع احراز',
  'identity_verification.decide': 'تصمیم احراز',
  'organization.archive': 'بایگانی کسب‌وکار',
};

export const keyLabel = (key: string): string => LABELS[key] ?? key;
