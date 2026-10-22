/** A stable one-in-five offer; accepting a Run bonus always remains optional. */
export function boundedRunBonus(sessionId: string): { eligible: boolean; extraTasks: 0 | 3; xpCap: 0 | 30 } {
  let hash = 2166136261;
  for (const char of `bonus:${sessionId}`) { hash ^= char.codePointAt(0)!; hash = Math.imul(hash, 16777619); }
  const eligible = !!sessionId && (hash >>> 0) % 5 === 0;
  return { eligible, extraTasks: eligible ? 3 : 0, xpCap: eligible ? 30 : 0 };
}
