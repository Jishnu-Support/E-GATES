import { lazy } from 'react';

/**
 * Robust lazy loader with automatic chunk retry.
 * Recovers seamlessly from stale deployment chunks or network dips
 * so users never get stuck on a blank screen between page transitions.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const hasRefreshed = window.sessionStorage.getItem('lazy_chunk_retry_refreshed');

    try {
      const component = await componentImport();
      window.sessionStorage.removeItem('lazy_chunk_retry_refreshed');
      return component;
    } catch (error) {
      console.warn('Chunk load error occurred during navigation, auto-refreshing:', error);
      if (!hasRefreshed) {
        window.sessionStorage.setItem('lazy_chunk_retry_refreshed', 'true');
        window.location.reload();
        // Return a forever-pending promise so React stays calm while the browser reloads
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

export default lazyWithRetry;
