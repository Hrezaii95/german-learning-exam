export type { Locale } from './i18n.js';
export type View =
  | 'course'
  | 'today'
  | 'review'
  | 'cheat-sheets'
  | 'home'
  | 'library'
  | 'studio'
  | 'book'
  | 'practice'
  | 'vocabulary'
  | 'progress'
  | 'notebook'
  | 'teacher'
  | 'about';
export interface Job {
  job_id: string;
  status: string;
  revision: string | null;
  required_region_ids: string[];
  required_scopes: string[];
  spec_hash: string;
}
export interface Unit {
  unit_id: string;
  physical_index: number;
  printed_labels: string[];
  job_ids: string[];
  jobs: Job[];
}
export interface Source {
  source_id: string;
  sha256: string;
  collection: string;
  format: string;
  original_filename: string;
  path: string;
  bytes: number;
  units: Unit[];
  url: string | null;
  pages: string[];
  text: string | null;
  playback?: {
    url: string;
    sha256: string;
    kind: string;
    source_sha256: string;
    conversion: string[];
  };
}
export interface Enrichment {
  id: string;
  source_id: string;
  unit_id: string;
  source_sha256: string;
  status: 'pending' | 'accepted' | 'stale' | 'needs_attention';
  revision: string;
  reviewed_relationships: boolean;
  content_de: string;
  content_en?: string;
}
export function canPublishEnrichment(record: Enrichment, source: Source) {
  return (
    record.status === 'accepted' &&
    record.reviewed_relationships &&
    record.source_id === source.source_id &&
    record.source_sha256 === source.sha256 &&
    source.units.some((u) => u.unit_id === record.unit_id) &&
    Boolean(record.revision)
  );
}
