/** Types for `learner-language-rules.mjs`, so TypeScript gates can import it. */
export declare const LEARNER_LANGUAGE_RULES: ReadonlyArray<{
  code: string;
  pattern: RegExp;
}>;

export declare function learnerLanguageFindings(phrase: string): string[];
