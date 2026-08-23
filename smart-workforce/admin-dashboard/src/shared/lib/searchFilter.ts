/** Case-insensitive substring match across any number of fields — the
 *  shared predicate every list page's client-side search filter uses.
 *  An empty/whitespace-only query matches everything (i.e. "no filter"). */
export function matchesQuery(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => !!field && field.toLowerCase().includes(q));
}
