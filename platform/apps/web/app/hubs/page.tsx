
import { LSpan, LStrong } from "@/components/i18n/LocalizedElements";
import type { Metadata } from "next";
import Link from "@/components/i18n/LocalizedLink";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubDirectoryView } from "@/components/hubs/HubViews";
import { loadLearnerHubProjection } from "@/lib/content/access";
import { pageMetadata } from "@/lib/content/page-metadata";
import { loadWordCards } from "@/lib/content/word-cards";

export const metadata: Metadata = pageMetadata(
  "Hubs",
  "Browse everything you are learning by type: words, verbs, grammar, phrases, listening and concepts.",
);

export default function HubsDirectoryPage() {
  const original = loadLearnerHubProjection();
  const vocabulary = { ...original.hubsById.vocabulary, itemCount: loadWordCards().cards.length };
  const projection = { ...original, hubs: original.hubs.map(h => h.id === "vocabulary" ? vocabulary : h), hubsById: { ...original.hubsById, vocabulary } };
  return (
    <ShellLayout current="hubs">
      <Link href="/cheat-sheets" className="country-hub-link"><LStrong>Cheat sheets</LStrong><LSpan>Countries, articles & languages · visual patterns and quick practice →</LSpan></Link>
      <Link href="/cheat-sheets/home" className="home-hub-link"><LStrong>Home & furniture</LStrong><LSpan>Illustrated vocabulary, plurals & pronouns · your next cheat sheet →</LSpan></Link>
      <HubDirectoryView projection={projection} />
    </ShellLayout>
  );
}
