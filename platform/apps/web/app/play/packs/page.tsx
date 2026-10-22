import type { Metadata } from "next";
import { PlayPackSettings } from "@/components/wortwerk/PlayHome";
export const metadata: Metadata = { title: "Wortwerk · Content packs" };
export default function PacksPage() { return <PlayPackSettings />; }
