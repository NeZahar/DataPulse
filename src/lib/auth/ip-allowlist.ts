/** Edge-safe IP allowlist check (no Node-only deps). */
export function isIpAllowed(ip: string): boolean {
  const allow = process.env.ADMIN_ALLOWED_IPS?.trim();
  if (!allow) return true;
  const list = allow.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(ip);
}
