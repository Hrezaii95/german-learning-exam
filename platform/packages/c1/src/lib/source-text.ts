/** Display cleanup only: immutable source text/revision remains available separately. */
export function readableSourceText(text: string): string {
  return text
    .replace(/([\p{L}])[ \t]+-[ \t]*\n[ \t]*([\p{Ll}])/gu, '$1$2')
    .replace(/([\p{L}]{2,})-[ \t]*\n[ \t]*([\p{Ll}])/gu, '$1$2');
}
