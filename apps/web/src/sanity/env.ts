export const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
export const sanityApiVersion = '2026-02-01';

export function isSanityConfigured(): boolean {
  return Boolean(sanityProjectId?.trim());
}
