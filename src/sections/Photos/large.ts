import { photoSrc } from '../../data/photos';

/** Full-size photos that have been fetched AND decoded, so they paint sharp on first frame. */
const decoded = new Set<string>();
const pending = new Map<string, Promise<void>>();

export const isDecoded = (slug: string) => decoded.has(slug);

/**
 * Fetch and decode a frame's full-size image ahead of time. Called when a print is
 * hovered, focused or pressed, and for the viewer's neighbours — so the viewer can
 * show the sharp photo straight away instead of a soft stand-in.
 */
export function preloadLarge(slug: string): Promise<void> {
  if (decoded.has(slug)) return Promise.resolve();
  let job = pending.get(slug);
  if (!job) {
    const img = new Image();
    img.decoding = 'async';
    img.src = photoSrc(slug, 'lg');
    job = img
      .decode()
      .then(() => {
        decoded.add(slug);
      })
      .catch(() => {
        // a failed decode is retried on the next request
      })
      .finally(() => pending.delete(slug));
    pending.set(slug, job);
  }
  return job;
}
