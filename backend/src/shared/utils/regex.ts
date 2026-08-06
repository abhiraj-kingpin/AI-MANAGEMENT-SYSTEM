/** Escapes regex metacharacters in user-supplied search text before building a `RegExp` from it. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
