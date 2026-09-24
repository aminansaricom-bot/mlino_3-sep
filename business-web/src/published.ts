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

/**
 * Whose business: the organization the logged-in member chose (membership, D-57) — never a name match.
 * Before anyone logs in, the panel shows one fictional demo business, by its id, and says so.
 */
export const DEMO_ORGANIZATION_ID = 'test-demo-07';

const cache = new Map<string, Promise<PublishedBusiness | null>>();

async function load(organizationId: string): Promise<PublishedBusiness | null> {
  const [b, c] = await Promise.all([
    fetch('/public-export/public-business.v1.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('business')))),
    fetch('/public-export/public-catalog.v1.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const record = (b.records as Array<Record<string, any>>).find((r) => r.business?.organization_id === organizationId);
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

export function usePublished(organizationId: string | null): PublishedState {
  const orgId = organizationId ?? DEMO_ORGANIZATION_ID;
  const [state, setState] = useState<PublishedState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    if (!cache.has(orgId)) cache.set(orgId, load(orgId));
    cache.get(orgId)!.then((business) => { if (live) setState({ status: 'ready', business }); })
      .catch(() => { cache.delete(orgId); if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, [orgId]);
  return state;
}

export const mediaUrl = (path: string) => `/public-export/${path}`;
export const priceLabel = (amount: string | null) => (amount === null ? 'قیمت با تماس' : `${new Intl.NumberFormat('fa-IR').format(Number(amount))} ریال`);
