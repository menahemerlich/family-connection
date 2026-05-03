export function parseFamilyJoin(
  raw: unknown,
): { id: string; name: string } | null {
  const f = Array.isArray(raw)
    ? (raw[0] as { id: string; name: string } | undefined)
    : (raw as { id: string; name: string } | null);
  return f ? { id: f.id, name: f.name } : null;
}
