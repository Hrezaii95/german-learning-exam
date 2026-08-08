import { HubRoutePage } from "@/components/hubs/HubRoutePage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ListeningPage({ searchParams }: PageProps) {
  return <HubRoutePage hubId="listening" searchParams={searchParams} />;
}
