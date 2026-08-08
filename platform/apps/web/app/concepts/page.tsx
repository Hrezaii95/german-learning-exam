import { HubRoutePage } from "@/components/hubs/HubRoutePage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ConceptsPage({ searchParams }: PageProps) {
  return <HubRoutePage hubId="concepts" searchParams={searchParams} />;
}
