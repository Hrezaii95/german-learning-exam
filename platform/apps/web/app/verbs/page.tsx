import { HubRoutePage } from "@/components/hubs/HubRoutePage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function VerbsPage({ searchParams }: PageProps) {
  return <HubRoutePage hubId="verbs" searchParams={searchParams} />;
}
