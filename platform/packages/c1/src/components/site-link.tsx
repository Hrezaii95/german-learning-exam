import type { ComponentProps } from 'react';
export function c1Path(href: string) {
  const base = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH || '';
  if(href.startsWith('/c1/')) return base+href;
  return href.startsWith('/') && !href.startsWith('//') ? base + '/prepare/c1' + (href === '/' ? '/' : href) : href;
}
export default function SiteLink({href, ...props}: ComponentProps<'a'>) { return <a {...props} href={href ? c1Path(href) : href}/>; }
