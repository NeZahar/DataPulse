const statusColors: Record<string, string> = {
  connected: "text-[var(--ok)] bg-[var(--ok)]/10",
  degraded: "text-[var(--warn)] bg-[var(--warn)]/10",
  error: "text-[var(--danger)] bg-[var(--danger)]/10",
  disconnected: "text-[var(--muted)] bg-[var(--muted)]/10",
  unknown: "text-[var(--muted)] bg-[var(--muted)]/10",
};

const levelColors: Record<string, string> = {
  debug: "text-[var(--muted)] bg-[var(--muted)]/10",
  info: "text-[var(--accent)] bg-[var(--accent-soft)]",
  warn: "text-[var(--warn)] bg-[var(--warn)]/10",
  error: "text-[var(--danger)] bg-[var(--danger)]/10",
};

const statusLabels: Record<string, string> = {
  connected: "подключено",
  degraded: "сбои",
  error: "ошибка",
  disconnected: "отключено",
  unknown: "неизвестно",
};

export function StatusBadge({
  status,
  kind = "status",
}: {
  status: string;
  kind?: "status" | "level";
}) {
  const colors = kind === "level" ? levelColors : statusColors;
  const label = kind === "level" ? status : statusLabels[status] || status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${
        colors[status] || colors.unknown
      }`}
    >
      {label}
    </span>
  );
}
