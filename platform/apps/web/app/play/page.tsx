import type { Metadata } from "next";
import { PlayHome } from "@/components/wortwerk/PlayHome";
export const metadata: Metadata = { title: "Wortwerk · Today" };
export default function PlayPage() { return <PlayHome />; }
