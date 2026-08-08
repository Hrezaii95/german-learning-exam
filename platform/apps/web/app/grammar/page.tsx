import { HubRoutePage } from "@/components/hubs/HubRoutePage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function GrammarPage({ searchParams }: PageProps) {
  return <HubRoutePage hubId="grammar" searchParams={searchParams} />;
}
