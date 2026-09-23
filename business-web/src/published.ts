// What this business has published to V2, read from the signed public files served next to the panel.
// In the real product the panel reads Core directly; in the demo this is the honest stand-in: every
// product, photo and offer shown here is exactly what customers see in V2, nothing is invented.

import { useEffect, useState } from 'react';

export type PublishedItem = Readonly<{
  catalog_item_id: string; name: string; short_description: string | null; price_amount: string | null; price_currency: string | null;
  grouping_label: string | null; media: readonly { path: string; alt_text: string | null; width: number; height: number }[];
  available_from: string | null; available_until: string | null; published_at: string;
}>;
export type PublishedOffer = Readonly<{
  offer_id: string; name: string; short_description: string | null; price_amount: string | null; offer_shape: string;
  valid_from: string | null; valid_until: string | null; published_at: string; terms?: { summary?: string };
}>;
export type PublishedBusiness = Readonly<{
  organizationId: string; name: string; description: string | null; categoryLabel: string | null;
  location: { latitude: number; longitude: number; address: string | null } | null;
  hours: { weekly: readonly { day: number; intervals: readonly { open: string; close: string }[] }[] } | null;
  capabilities: readonly { capability_id: string; name: string }[];
  offers: readonly PublishedOffer[];
  items: readonly PublishedItem[];
  publishedAt: string | null;
}>;

export type PublishedState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; business: PublishedBusiness | null };

/** Demo: the panel's business is the signed demo café whose name matches. */
const DEMO_BUSINESS_NAME = /نیلوفر/;

let cache: Promise<PublishedBusiness | null> | null = null;

async function load(): Promise<PublishedBusiness | null> {
  const [b, c] = await Promise.all([
    fetch('/public-export/public-business.v1.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('business')))),
    fetch('/public-export/public-catalog.v1.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const record = (b.records as Array<Record<string, any>>).find((r) => DEMO_BUSINESS_NAME.test(r.business?.display_name ?? r.business?.name ?? ''));
  if (!record) return null;
  const biz = record.business ?? {};
  const orgId = biz.organization_id as string;
  const catalog = (c?.records as Array<Record<string, any>> | undefined)?.find((r) => r.organization_id === orgId);
  return {
    organizationId: orgId,
    name: String(biz.display_name ?? biz.name ?? ''),
    description: biz.description ?? null,
    categoryLabel: biz.category?.label ?? biz.category_label ?? null,
    location: biz.location && typeof biz.location.latitude === 'number' ? { latitude: biz.location.latitude, longitude: biz.location.longitude, address: biz.location.address_text ?? null } : null,
    hours: biz.business_hours ?? null,
    capabilities: (record.capabilities ?? []) as PublishedBusiness['capabilities'],
    offers: (record.offers ?? []) as PublishedOffer[],
    items: (catalog?.items ?? []) as PublishedItem[],
    publishedAt: biz.published_at ?? null,
  };
}

export function usePublished(): PublishedState {
  const [state, setState] = useState<PublishedState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    cache ??= load();
    cache.then((business) => { if (live) setState({ status: 'ready', business }); })
      .catch(() => { cache = null; if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, []);
  return state;
}

export const mediaUrl = (path: string) => `/public-export/${path}`;
export const priceLabel = (amount: string | null) => (amount === null ? 'قیمت با تماس' : `${new Intl.NumberFormat('fa-IR').format(Number(amount))} ریال`);
