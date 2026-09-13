import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { decryptSecret, maskSecret } from "@/lib/crypto";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { RevealPassword } from "@/components/admin/RevealPassword";
import { getAdminSession } from "@/lib/auth/session";

type Props = { params: Promise<{ id: string }> };

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAdminSession();

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      connections: { orderBy: { updatedAt: "desc" } },
      logs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!account) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/accounts" className="text-sm text-[var(--accent)] hover:underline">
          ← К списку аккаунтов
        </Link>
        <h2 className="mt-3 text-xl font-semibold">{account.email}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {account.displayName || "Без имени"}
          {account.deviceId ? ` · device: ${account.deviceId}` : ""}
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Создан</dt>
            <dd className="font-mono">{new Date(account.createdAt).toLocaleString("ru-RU")}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Последняя активность</dt>
            <dd className="font-mono">
              {account.lastSeenAt
                ? new Date(account.lastSeenAt).toLocaleString("ru-RU")
                : "никогда"}
            </dd>
          </div>
        </dl>
      </div>

      <section>
        <h3 className="text-lg font-semibold">Подключения к 1С</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Учётные данные хранятся в БД в зашифрованном виде (AES-256-GCM)
        </p>
        <div className="mt-4 space-y-3">
          {account.connections.length === 0 ? (
            <p className="border border-[var(--line)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
              Подключений нет
            </p>
          ) : (
            account.connections.map((c) => {
              let masked = "••••••••";
              try {
                masked = maskSecret(decryptSecret(c.passwordEncrypted));
              } catch {
                masked = "[ошибка расшифровки]";
              }
              return (
                <article
                  key={c.id}
                  className="border border-[var(--line)] bg-[var(--surface)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.label || "Подключение 1С"}</p>
                      <p className="font-mono text-xs text-[var(--muted)]">{c.id}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <Field label="Сервер / URL" value={c.serverUrl} mono />
                    <Field label="База" value={c.baseName || "—"} mono />
                    <Field label="Пользователь 1С" value={c.username} mono />
                    <div>
                      <dt className="text-[var(--muted)]">Пароль 1С</dt>
                      <dd>
                        <RevealPassword
                          connectionId={c.id}
                          masked={masked}
                          csrfToken={session.csrfToken!}
                        />
                      </dd>
                    </div>
                    <Field label="Протокол" value={c.protocol} />
                    <Field
                      label="Последняя проверка"
                      value={
                        c.lastCheckedAt
                          ? new Date(c.lastCheckedAt).toLocaleString("ru-RU")
                          : "—"
                      }
                      mono
                    />
                  </dl>
                  {c.lastStatusMessage ? (
                    <p className="mt-3 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
                      {c.lastStatusMessage}
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Логи подключений</h3>
        <div className="mt-3 overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
          {account.logs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">Логов пока нет</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {account.logs.map((log) => (
                <li key={log.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <StatusBadge status={log.level} kind="level" />
                    <span className="font-mono">
                      {new Date(log.createdAt).toLocaleString("ru-RU")}
                    </span>
                    <span className="font-mono text-[var(--ink)]">{log.event}</span>
                  </div>
                  <p className="mt-1 text-sm">{log.message}</p>
                  {log.detailsJson ? (
                    <pre className="mt-2 overflow-x-auto bg-[var(--bg)] p-2 font-mono text-[11px] text-[var(--muted)]">
                      {log.detailsJson}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className={mono ? "font-mono break-all" : ""}>{value}</dd>
    </div>
  );
}
