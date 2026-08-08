import { HubRoutePage } from "@/components/hubs/HubRoutePage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function PhrasesPage({ searchParams }: PageProps) {
  return <HubRoutePage hubId="phrases" searchParams={searchParams} />;
}
