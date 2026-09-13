import { Suspense } from "react";
import AdminLoginPage from "./page-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-[var(--muted)]">
          Загрузка…
        </main>
      }
    >
      <AdminLoginPage />
    </Suspense>
  );
}
