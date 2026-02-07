import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const cards = [
  {
    title: "Expense Tracking",
    description: "Add, edit, and delete expense records with category, date, payee, and notes.",
  },
  {
    title: "Income Tracking",
    description: "Optionally track income records for cashflow visibility.",
  },
  {
    title: "Net Worth Snapshots",
    description: "Optionally record monthly or yearly assets and liabilities snapshots.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Expense App 2</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Self-hosted Finance Dashboard</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Dashboard now supports expenses, incomes, and net worth snapshots with reporting charts and CSV export.
          Next steps are import workflows and operational hardening.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            href={session?.user?.id ? "/dashboard" : "/login"}
          >
            {session?.user?.id ? "Open Dashboard" : "Sign In"}
          </a>
          {!session?.user?.id ? (
            <a
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              href="/signup"
            >
              Create Account
            </a>
          ) : null}
          <a
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            href="/api/health"
          >
            API Health
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-slate-200 bg-white/85 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{card.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
