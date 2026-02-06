"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type Category = {
  id: string;
  name: string;
  isSystem: boolean;
};

type Expense = {
  id: string;
  amountCents: number;
  categoryId: string;
  categoryName: string | null;
  spentOn: string;
  payee: string;
  note: string | null;
};

type SpendingSummary = {
  period: string;
  totalSpendingCents: number;
  totalIncomeCents: number;
  netCashflowCents: number;
};

type DashboardClientProps = {
  userEmail: string;
};

type ExpenseForm = {
  id: string | null;
  amount: string;
  categoryId: string;
  spentOn: string;
  payee: string;
  note: string;
};

type Filters = {
  from: string;
  to: string;
  categoryId: string;
  payee: string;
};

const todayIso = new Date().toISOString().slice(0, 10);

function dollarsToCents(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

const emptyForm: ExpenseForm = {
  id: null,
  amount: "",
  categoryId: "",
  spentOn: todayIso,
  payee: "",
  note: "",
};

const emptyFilters: Filters = {
  from: "",
  to: "",
  categoryId: "",
  payee: "",
};

export default function DashboardClient({ userEmail }: DashboardClientProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthSummary, setMonthSummary] = useState<SpendingSummary | null>(null);
  const [yearSummary, setYearSummary] = useState<SpendingSummary | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyForm);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customCategories = useMemo(() => categories.filter((category) => !category.isSystem), [categories]);

  const loadCategories = useCallback(async () => {
    const result = await requestJson<{ data: Category[] }>("/api/categories");
    setCategories(result.data);
    setExpenseForm((current) => {
      if (current.categoryId) {
        return current;
      }
      return {
        ...current,
        categoryId: result.data[0]?.id ?? "",
      };
    });
  }, []);

  const loadExpenses = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.from) {
      params.set("from", filters.from);
    }
    if (filters.to) {
      params.set("to", filters.to);
    }
    if (filters.categoryId) {
      params.set("categoryId", filters.categoryId);
    }
    if (filters.payee) {
      params.set("payee", filters.payee);
    }
    params.set("page", "1");
    params.set("pageSize", "50");

    const result = await requestJson<{ data: Expense[] }>(`/api/expenses?${params.toString()}`);
    setExpenses(result.data);
  }, [filters]);

  const loadSummaries = useCallback(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [monthResult, yearResult] = await Promise.all([
      requestJson<{ data: SpendingSummary }>(`/api/reports/spending-summary?year=${year}&month=${month}`),
      requestJson<{ data: SpendingSummary }>(`/api/reports/spending-summary?year=${year}`),
    ]);

    setMonthSummary(monthResult.data);
    setYearSummary(yearResult.data);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([loadCategories(), loadExpenses(), loadSummaries()]);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load dashboard data.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [loadCategories, loadExpenses, loadSummaries]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadExpenses().catch((loadError) => {
      const message = loadError instanceof Error ? loadError.message : "Failed to load expense list.";
      setError(message);
    });
  }, [filters, loadExpenses]);

  async function handleExpenseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountCents = dollarsToCents(expenseForm.amount);
    if (!amountCents) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!expenseForm.categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!expenseForm.spentOn) {
      setError("Please select a date.");
      return;
    }
    if (!expenseForm.payee.trim()) {
      setError("Payee is required.");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const payload = {
        amountCents,
        categoryId: expenseForm.categoryId,
        spentOn: expenseForm.spentOn,
        payee: expenseForm.payee.trim(),
        note: expenseForm.note.trim() || undefined,
      };

      if (expenseForm.id) {
        await requestJson(`/api/expenses/${expenseForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setExpenseForm((current) => ({
        ...emptyForm,
        categoryId: current.categoryId || categories[0]?.id || "",
      }));
      await Promise.all([loadExpenses(), loadSummaries()]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save expense.";
      setError(message);
    } finally {
      setIsSubmittingExpense(false);
    }
  }

  function beginEdit(expense: Expense) {
    setExpenseForm({
      id: expense.id,
      amount: (expense.amountCents / 100).toFixed(2),
      categoryId: expense.categoryId,
      spentOn: expense.spentOn,
      payee: expense.payee,
      note: expense.note ?? "",
    });
  }

  function cancelEdit() {
    setExpenseForm((current) => ({
      ...emptyForm,
      categoryId: current.categoryId || categories[0]?.id || "",
    }));
  }

  async function deleteExpense(expenseId: string) {
    const confirmed = window.confirm("Delete this expense?");
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await requestJson(`/api/expenses/${expenseId}`, { method: "DELETE" });
      await Promise.all([loadExpenses(), loadSummaries()]);
      if (expenseForm.id === expenseId) {
        cancelEdit();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete expense.";
      setError(message);
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      setError("Category name is required.");
      return;
    }

    setIsSubmittingCategory(true);
    setError(null);
    try {
      await requestJson("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewCategoryName("");
      await loadCategories();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create category.";
      setError(message);
    } finally {
      setIsSubmittingCategory(false);
    }
  }

  async function deleteCategory(categoryId: string) {
    const confirmed = window.confirm("Delete this custom category?");
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await requestJson(`/api/categories/${categoryId}`, { method: "DELETE" });
      await loadCategories();
      if (filters.categoryId === categoryId) {
        setFilters((current) => ({ ...current, categoryId: "" }));
      }
      if (expenseForm.categoryId === categoryId) {
        setExpenseForm((current) => ({ ...current, categoryId: "" }));
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete category.";
      setError(message);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-600">Signed in as {userEmail}</p>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Expense Dashboard</h1>
          </div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            onClick={() => signOut({ callbackUrl: "/login" })}
            type="button"
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Current Month Spending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {monthSummary ? formatCurrency(monthSummary.totalSpendingCents) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Net cashflow: {monthSummary ? formatCurrency(monthSummary.netCashflowCents) : "--"}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Current Year Spending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {yearSummary ? formatCurrency(yearSummary.totalSpendingCents) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Net cashflow: {yearSummary ? formatCurrency(yearSummary.netCashflowCents) : "--"}
          </p>
        </article>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <article className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {expenseForm.id ? "Edit Expense" : "Add Expense"}
          </h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={handleExpenseSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Amount (USD)</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                min="0.01"
                onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={expenseForm.amount}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Category</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                onChange={(event) => setExpenseForm((current) => ({ ...current, categoryId: event.target.value }))}
                required
                value={expenseForm.categoryId}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isSystem ? " (system)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Date</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                onChange={(event) => setExpenseForm((current) => ({ ...current, spentOn: event.target.value }))}
                required
                type="date"
                value={expenseForm.spentOn}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Payee</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                onChange={(event) => setExpenseForm((current) => ({ ...current, payee: event.target.value }))}
                required
                type="text"
                value={expenseForm.payee}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-slate-700">Note (Optional)</span>
              <textarea
                className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))}
                value={expenseForm.note}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSubmittingExpense}
                type="submit"
              >
                {isSubmittingExpense ? "Saving..." : expenseForm.id ? "Update Expense" : "Add Expense"}
              </button>
              {expenseForm.id ? (
                <button
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  onClick={cancelEdit}
                  type="button"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
          <form className="mt-3 flex gap-2" onSubmit={createCategory}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="New custom category"
              value={newCategoryName}
            />
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmittingCategory}
              type="submit"
            >
              Add
            </button>
          </form>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">System</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories
                  .filter((category) => category.isSystem)
                  .map((category) => (
                    <span key={category.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {category.name}
                    </span>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Custom</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {customCategories.length === 0 ? (
                  <span className="text-xs text-slate-500">No custom categories yet.</span>
                ) : (
                  customCategories.map((category) => (
                    <button
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                      key={category.id}
                      onClick={() => void deleteCategory(category.id)}
                      type="button"
                    >
                      {category.name} x
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            onClick={() => setFilters(emptyFilters)}
            type="button"
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            placeholder="From"
            type="date"
            value={filters.from}
          />
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            placeholder="To"
            type="date"
            value={filters.to}
          />
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
            value={filters.categoryId}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            onChange={(event) => setFilters((current) => ({ ...current, payee: event.target.value }))}
            placeholder="Payee contains..."
            type="text"
            value={filters.payee}
          />
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {isLoading ? <p className="mt-3 text-sm text-slate-600">Loading...</p> : null}

        <div className="mt-4 grid gap-3">
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses found for current filters.</p>
          ) : (
            expenses.map((expense) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:items-start sm:justify-between"
                key={expense.id}
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(expense.amountCents)}</p>
                  <p className="text-sm text-slate-700">
                    {expense.payee} • {expense.categoryName ?? "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">{expense.spentOn}</p>
                  {expense.note ? <p className="mt-1 text-sm text-slate-600">{expense.note}</p> : null}
                </div>
                <div className="mt-3 flex gap-2 sm:mt-0">
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                    onClick={() => beginEdit(expense)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    onClick={() => void deleteExpense(expense.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

