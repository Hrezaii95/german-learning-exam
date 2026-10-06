/** All C1 routes stay inside the host application's C1 workspace. */
export function c1Path(href: string, base = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH || ''): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  base = base.replace(/\/$/, '');
  if (base && (href === base || href.startsWith(base + '/'))) return href;
  if (/^\/(?:prepare\/c1|c1)(?:[/?#]|$)/.test(href)) return base + href;
  return base + '/prepare/c1' + (href === '/' ? '/' : href);
}

/** Keep scope, role and unrelated query values when selecting a task or page. */
export function c1Location(route: string, changes: Record<string, string | number | null>, current: string, base?: string): string {
  const url = new URL(current, 'https://lingovo.invalid');
  url.pathname = c1Path(route, base);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  return url.pathname + url.search + url.hash;
}

export function updateC1History(route: string, changes: Record<string, string | number | null>, mode: 'push' | 'replace' = 'push') {
  const next = c1Location(route, changes, window.location.href);
  const current = location.pathname + location.search + location.hash;
  if (next !== current) history[mode === 'push' ? 'pushState' : 'replaceState'](history.state, '', next);
}
