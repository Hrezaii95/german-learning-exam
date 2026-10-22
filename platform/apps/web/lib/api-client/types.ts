export type ClassDto = { id: string; name: string; teacherId: string; teacherName?: string; bookId: string; position: { lesson: number | null; page: number | null }; leaderboardEnabled: boolean; createdAt: string; archivedAt: string | null; joinCode?: string };
export type AssignmentDto = { id: string; classId: string; title: string; scope: Record<string, unknown>; skills: string[]; itemCount: number; dueAt: string | null; createdAt: string; overdue: boolean; progress?: ProgressDto };
export type ProgressDto = { assignmentId: string; answered: number; correct: number; completed: boolean; bySkill: Record<string, { answered: number; correct: number }> };
export type RosterDto = { id: string; displayName: string; username: string; memberRole: string; joinedAt: string; lastActiveAt: string | null };
export type TrickyDto = { itemId: string; answered: number; incorrect: number; missRate: number };
export type PositionDto = { book?: string; lesson?: number; page?: number; followClassId?: string | null };
export const SKILLS = ["meaning", "gender", "plural", "listening", "grammar", "reading", "writing", "speaking"] as const;
export function playAssignmentHref(assignment: Pick<AssignmentDto, "id" | "scope">): string {
  const bytes = new TextEncoder().encode(JSON.stringify(assignment.scope));
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  const scope = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `/play/run?scope=${scope}&assignment=${encodeURIComponent(assignment.id)}`;
}
