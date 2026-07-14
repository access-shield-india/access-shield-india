import { createClient } from 'next-sanity';
import { isSanityConfigured, sanityApiVersion, sanityDataset, sanityProjectId } from './env';

/** Sanity client for server-side fetches in the Next.js marketing app. */
export const sanityClient = isSanityConfigured()
  ? createClient({
      projectId: sanityProjectId!,
      dataset: sanityDataset,
      apiVersion: sanityApiVersion,
      useCdn: true,
    })
  : null;
