import { HubRoutePage } from "@/components/hubs/HubRoutePage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function VocabularyPage({ searchParams }: PageProps) {
  return <HubRoutePage hubId="vocabulary" searchParams={searchParams} />;
}
