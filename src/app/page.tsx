import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const capabilityCards = [
  {
    title: "Fast Daily Entry",
    description: "Record expenses quickly with category, payee, date, and notes in one focused flow.",
    eyebrow: "Expenses",
  },
  {
    title: "Cashflow Visibility",
    description: "Track income and compare it against spending with monthly or yearly trends.",
    eyebrow: "Income",
  },
  {
    title: "Net Worth Direction",
    description: "Capture snapshots of assets and liabilities to measure progress over time.",
    eyebrow: "Net Worth",
  },
];

const highlights = [
  { label: "Self-hosted", value: "Data stays with you" },
  { label: "Scope", value: "Expenses + Income + Net Worth" },
  { label: "Reports", value: "Cashflow, categories, YoY trends" },
  { label: "Export", value: "CSV for all core entities" },
];

const quickLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Sign Up" },
  { href: "/api/health", label: "API Health" },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isSignedIn = Boolean(session?.user?.id);
  const primaryHref = session?.user?.id ? "/dashboard" : "/login";
  const primaryLabel = session?.user?.id ? "Open Dashboard" : "Sign In";
  const heroPrimaryButtonClass = isSignedIn
    ? "inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
    : "inline-flex items-center justify-center rounded-xl bg-sky-300 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_38px_-24px_rgba(56,189,248,0.95)] transition hover:bg-sky-200";
  const footerPrimaryButtonClass = isSignedIn
    ? "rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
    : "rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-7 text-white shadow-[0_34px_90px_-34px_rgba(2,6,23,0.92)] sm:p-10">
        <div className="absolute -left-16 -top-14 h-56 w-56 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div>
            <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
              Expense App 2
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Your personal finance command center, fully under your control.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100/95 sm:text-base">
              Track spending, optional income, and net worth from one place. Review trends with clear charts, export
              your data when needed, and keep the system self-hosted on your own infrastructure.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className={heroPrimaryButtonClass} href={primaryHref}>
                {primaryLabel}
              </a>
              {!session?.user?.id ? (
                <a
                  className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                  href="/signup"
                >
                  Create Account
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-100">Current Build</p>
            <ul className="mt-4 space-y-2 text-sm text-sky-50/95">
              <li>Phase 1 complete: auth, categories, expense CRUD and filters.</li>
              <li>Phase 2 complete: income + net worth snapshot workflows.</li>
              <li>Phase 3 complete: reporting charts + export-ready tables.</li>
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <a
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/20"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <article
            className="rounded-2xl border border-white/65 bg-white/85 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)] backdrop-blur"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-white/65 bg-white/85 p-6 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.75)] backdrop-blur sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">Core Capabilities</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Built for daily usage, not spreadsheet fatigue.
            </h2>
          </div>
          <a
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            href={primaryHref}
          >
            Start now
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {capabilityCards.map((card) => (
            <article
              className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-sky-50/80 p-5 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.7)]"
              key={card.title}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">{card.eyebrow}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/65 bg-white/85 p-6 text-center shadow-[0_22px_50px_-30px_rgba(15,23,42,0.75)] backdrop-blur sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Ready to track today&apos;s spending?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
          Open the dashboard and start with a quick expense entry. The interface is optimized for both desktop and
          mobile usage.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a className={footerPrimaryButtonClass} href={primaryHref}>
            {primaryLabel}
          </a>
          {!session?.user?.id ? (
            <a
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
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
    </main>
  );
}
