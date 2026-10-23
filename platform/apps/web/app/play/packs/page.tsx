import type { Metadata } from "next";
import { PlayPackSettings } from "@/components/wortwerk/PackPicker";
export const metadata: Metadata = { title: "Wortwerk · Content packs" };
export default function PacksPage() { return <PlayPackSettings />; }
