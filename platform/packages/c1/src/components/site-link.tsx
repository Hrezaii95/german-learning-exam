import type { ComponentProps } from 'react';
import { c1Path } from '../lib/navigation.js';
export { c1Path } from '../lib/navigation.js';
export default function SiteLink({href, ...props}: ComponentProps<'a'>) { return <a {...props} href={href ? c1Path(href) : href}/>; }
