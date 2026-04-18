/**
 * When the API has no phone, show a deterministic synthetic US-style number per row
 * (stable across re-renders; not "Unknown").
 */
export function displayPhoneOrSynthetic(seed: string, raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  if (t) return t;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const area = 200 + (u % 800);
  const mid = 200 + ((u >>> 10) % 800);
  const line = 1000 + ((u >>> 20) % 9000);
  return `+1 (${area}) ${String(mid).padStart(3, '0')}-${String(line).padStart(4, '0')}`;
}
