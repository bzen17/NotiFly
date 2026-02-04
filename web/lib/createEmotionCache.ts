import createCache from '@emotion/cache';

export default function createEmotionCache() {
  let insertionPoint: HTMLElement | null = null;
  if (typeof document !== 'undefined') {
    insertionPoint = document.querySelector('meta[name="emotion-insertion-point"]');
  }

  return createCache({ key: 'mui', insertionPoint: insertionPoint ?? undefined });
}
