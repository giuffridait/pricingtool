// Generic "specificity matching" used by both price components and pricing
// rules: every defined field on `pattern` must equal the corresponding field
// on `context` for the pattern to be eligible; the number of defined fields
// that were checked is its specificity score (more specific = more precise =
// wins when multiple patterns are eligible for the same request).

export function matchSpecificity<T extends Record<string, unknown>>(
  pattern: Partial<T>,
  context: Partial<T>,
): number | null {
  let score = 0;
  for (const key of Object.keys(pattern) as (keyof T)[]) {
    const patternValue = pattern[key];
    if (patternValue === undefined || patternValue === null || patternValue === "") continue;
    const contextValue = context[key];
    if (contextValue === patternValue) {
      score += 1;
    } else {
      return null;
    }
  }
  return score;
}

export function isWithinValidity(validFrom?: string, validTo?: string, atDate?: string): boolean {
  const at = atDate ? new Date(atDate) : new Date();
  if (validFrom && at < new Date(validFrom)) return false;
  if (validTo && at > new Date(validTo)) return false;
  return true;
}
