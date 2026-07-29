export type PageId = 'home' | 'graphing' | 'calculators' | 'settings';

/** The small set of pages currently backed by real URLs. */
export function pageFromPath(pathname: string): PageId {
  const path = pathname.replace(/\/+$/, '');
  if (path.endsWith('/graphing')) return 'graphing';
  if (path.endsWith('/calculators')) return 'calculators';
  if (path.endsWith('/settings')) return 'settings';
  return 'home';
}

/** Keep links working both at the repository Pages path and at the root. */
export function pagePath(page: PageId): string {
  const pathname =
    typeof window === 'undefined' ? '' : window.location.pathname;
  const marker = '/longhand';
  const markerIndex = pathname.indexOf(marker);
  const root =
    markerIndex >= 0 ? pathname.slice(0, markerIndex + marker.length) : '';
  return page === 'home' ? `${root}/` : `${root}/${page}`;
}
