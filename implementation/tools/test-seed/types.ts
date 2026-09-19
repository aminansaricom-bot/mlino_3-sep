export type SeedInterval = readonly [string, string];

export interface VanakBusinessInput {
  test_id: string;
  name: string;
  category_fa: string;
  description: string;
  address_text: string;
  source_url: string;
  checked_at: string;
  latitude: number | null;
  longitude: number | null;
  public_phone: string | null;
  website: string | null;
  instagram: string | null;
  hours: Record<string, SeedInterval[]> | null;
  services: string[];
}

export class TestSeedError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'TestSeedError';
  }
}
