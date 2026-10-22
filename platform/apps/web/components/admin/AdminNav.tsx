import Link from "next/link";
import styles from "../account/Platform.module.css";
export function AdminNav() { return <nav className={styles.nav} aria-label="Admin sections"><Link href="/admin/">Overview</Link><Link href="/admin/users/">Users</Link><Link href="/admin/classes/">Classes</Link><Link href="/admin/packs/">Content packs</Link><Link href="/admin/flags/">Feature flags</Link><Link href="/admin/requests/">Data requests</Link><Link href="/admin/audit/">Audit log</Link><Link href="/admin/system/">System</Link></nav>; }
