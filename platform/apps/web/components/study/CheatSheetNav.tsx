import Link from "next/link";
export function CheatSheetNav({current}:{current:"countries"|"home"}) {
  return <nav className="cheat-sheet-switcher" aria-label="Choose a cheat sheet"><Link href="/cheat-sheets" aria-current={current==="countries"?"page":undefined}>01 · Countries & languages</Link><Link href="/cheat-sheets/home" aria-current={current==="home"?"page":undefined}>02 · Home & furniture</Link></nav>;
}
