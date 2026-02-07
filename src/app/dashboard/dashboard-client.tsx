"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type Income = {
  id: string;
  amountCents: number;
  earnedOn: string;
  source: string;
  note: string | null;
};

type NetWorthSnapshot = {
  id: string;
  snapshotOn: string;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  note: string | null;
};

type SpendingSummary = {
  period: string;
  totalSpendingCents: number;
  totalIncomeCents: number;
  netCashflowCents: number;
};

type CashflowPoint = {
  period: string;
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCashflowCents: number;
};

type NetWorthTrendPoint = {
  period: string;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  snapshotOn: string;
};

type SpendingByCategoryPoint = {
  category: string | null;
  totalCents: number;
};

type YearOverYearSpend = {
  year: string;
  totalExpenseCents: number;
  changeAmountCents: number | null;
  changePercent: number | null;
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

type IncomeForm = {
  id: string | null;
  amount: string;
  earnedOn: string;
  source: string;
  note: string;
};

type NetWorthSnapshotForm = {
  id: string | null;
  snapshotOn: string;
  totalAssets: string;
  totalLiabilities: string;
  note: string;
};

type Filters = {
  from: string;
  to: string;
  categoryId: string;
  payee: string;
};

type IncomeFilters = {
  from: string;
  to: string;
  source: string;
};

type SnapshotFilters = {
  from: string;
  to: string;
};

type ReportFilters = {
  from: string;
  to: string;
  groupBy: "month" | "year";
};

type ExportEntity = "expenses" | "incomes" | "networth_snapshots";
type DashboardSectionId = "overview" | "reports" | "expenses" | "income" | "networth";

type ExpenseApi = Omit<Expense, "amountCents"> & { amountCents: number | string };
type IncomeApi = Omit<Income, "amountCents"> & { amountCents: number | string };
type NetWorthSnapshotApi = Omit<
  NetWorthSnapshot,
  "totalAssetsCents" | "totalLiabilitiesCents" | "netWorthCents"
> & {
  totalAssetsCents: number | string;
  totalLiabilitiesCents: number | string;
  netWorthCents: number | string;
};
type SpendingSummaryApi = Omit<
  SpendingSummary,
  "totalSpendingCents" | "totalIncomeCents" | "netCashflowCents"
> & {
  totalSpendingCents: number | string;
  totalIncomeCents: number | string;
  netCashflowCents: number | string;
};
type CashflowPointApi = Omit<CashflowPoint, "totalIncomeCents" | "totalExpenseCents" | "netCashflowCents"> & {
  totalIncomeCents: number | string;
  totalExpenseCents: number | string;
  netCashflowCents: number | string;
};
type NetWorthTrendPointApi = Omit<
  NetWorthTrendPoint,
  "totalAssetsCents" | "totalLiabilitiesCents" | "netWorthCents"
> & {
  totalAssetsCents: number | string;
  totalLiabilitiesCents: number | string;
  netWorthCents: number | string;
};
type SpendingByCategoryPointApi = Omit<SpendingByCategoryPoint, "totalCents"> & { totalCents: number | string };

const todayIso = new Date().toISOString().slice(0, 10);
const chartColors = ["#0f766e", "#0ea5e9", "#7c3aed", "#f97316", "#e11d48", "#0891b2", "#65a30d"];

function dollarsToCents(value: string, allowZero = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (allowZero ? parsed < 0 : parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatCurrencyCompact(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function buildYearOverYearSpend(rows: CashflowPoint[]) {
  const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));

  return sorted.map<YearOverYearSpend>((row, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    if (!previous) {
      return {
        year: row.period,
        totalExpenseCents: row.totalExpenseCents,
        changeAmountCents: null,
        changePercent: null,
      };
    }

    const delta = row.totalExpenseCents - previous.totalExpenseCents;
    const changePercent = previous.totalExpenseCents === 0 ? null : (delta / previous.totalExpenseCents) * 100;

    return {
      year: row.period,
      totalExpenseCents: row.totalExpenseCents,
      changeAmountCents: delta,
      changePercent,
    };
  });
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

const emptyExpenseForm: ExpenseForm = {
  id: null,
  amount: "",
  categoryId: "",
  spentOn: todayIso,
  payee: "",
  note: "",
};

const emptyIncomeForm: IncomeForm = {
  id: null,
  amount: "",
  earnedOn: todayIso,
  source: "",
  note: "",
};

const emptySnapshotForm: NetWorthSnapshotForm = {
  id: null,
  snapshotOn: todayIso,
  totalAssets: "",
  totalLiabilities: "",
  note: "",
};

const emptyFilters: Filters = {
  from: "",
  to: "",
  categoryId: "",
  payee: "",
};

const emptyIncomeFilters: IncomeFilters = {
  from: "",
  to: "",
  source: "",
};

const emptySnapshotFilters: SnapshotFilters = {
  from: "",
  to: "",
};

const defaultReportFilters: ReportFilters = {
  from: "",
  to: "",
  groupBy: "month",
};

const dashboardSections: Array<{ id: DashboardSectionId; label: string; shortLabel: string }> = [
  { id: "overview", label: "Overview", shortLabel: "OV" },
  { id: "reports", label: "Reports", shortLabel: "RP" },
  { id: "expenses", label: "Expenses", shortLabel: "EX" },
  { id: "income", label: "Income", shortLabel: "IN" },
  { id: "networth", label: "Net Worth", shortLabel: "NW" },
];

export default function DashboardClient({ userEmail }: DashboardClientProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [cashflowSeries, setCashflowSeries] = useState<CashflowPoint[]>([]);
  const [netWorthSeries, setNetWorthSeries] = useState<NetWorthTrendPoint[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategoryPoint[]>([]);
  const [yearOverYearSpend, setYearOverYearSpend] = useState<YearOverYearSpend[]>([]);
  const [monthSummary, setMonthSummary] = useState<SpendingSummary | null>(null);
  const [yearSummary, setYearSummary] = useState<SpendingSummary | null>(null);

  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(emptyIncomeForm);
  const [snapshotForm, setSnapshotForm] = useState<NetWorthSnapshotForm>(emptySnapshotForm);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [incomeFilters, setIncomeFilters] = useState<IncomeFilters>(emptyIncomeFilters);
  const [snapshotFilters, setSnapshotFilters] = useState<SnapshotFilters>(emptySnapshotFilters);
  const [reportFilters, setReportFilters] = useState<ReportFilters>(defaultReportFilters);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingIncomes, setIsLoadingIncomes] = useState(true);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(true);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);
  const [isSubmittingSnapshot, setIsSubmittingSnapshot] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isDesktopNavCollapsed, setIsDesktopNavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardSectionId>("overview");
  const expenseAmountInputRef = useRef<HTMLInputElement | null>(null);

  const isLoadingAny =
    isLoadingCategories ||
    isLoadingExpenses ||
    isLoadingIncomes ||
    isLoadingSnapshots ||
    isLoadingSummaries ||
    isLoadingReports;

  const customCategories = useMemo(() => categories.filter((category) => !category.isSystem), [categories]);

  const setRequestError = useCallback((loadError: unknown, fallback: string) => {
    const message = loadError instanceof Error ? loadError.message : fallback;
    setError(message);
  }, []);

  function scrollToSection(sectionId: DashboardSectionId) {
    setActiveSection(sectionId);
    setIsMobileNavOpen(false);

    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function startQuickAddExpense() {
    setExpenseForm((current) => ({
      ...emptyExpenseForm,
      categoryId: current.categoryId || categories[0]?.id || "",
      spentOn: todayIso,
    }));
    setError(null);
    scrollToSection("expenses");
    window.setTimeout(() => {
      expenseAmountInputRef.current?.focus();
    }, 260);
  }

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const result = await requestJson<{ data: Category[] }>("/api/categories");
      const nextCategories = result.data;
      setCategories(nextCategories);
      setExpenseForm((current) => {
        if (current.categoryId && nextCategories.some((category) => category.id === current.categoryId)) {
          return current;
        }

        return { ...current, categoryId: nextCategories[0]?.id ?? "" };
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const loadExpenses = useCallback(async (activeFilters: Filters) => {
    setIsLoadingExpenses(true);
    try {
      const params = new URLSearchParams();
      if (activeFilters.from) {
        params.set("from", activeFilters.from);
      }
      if (activeFilters.to) {
        params.set("to", activeFilters.to);
      }
      if (activeFilters.categoryId) {
        params.set("categoryId", activeFilters.categoryId);
      }
      if (activeFilters.payee) {
        params.set("payee", activeFilters.payee);
      }
      params.set("page", "1");
      params.set("pageSize", "50");

      const result = await requestJson<{ data: ExpenseApi[] }>(`/api/expenses?${params.toString()}`);
      setExpenses(
        result.data.map((expense) => ({
          ...expense,
          amountCents: Number(expense.amountCents),
        })),
      );
    } finally {
      setIsLoadingExpenses(false);
    }
  }, []);

  const loadIncomes = useCallback(async (activeFilters: IncomeFilters) => {
    setIsLoadingIncomes(true);
    try {
      const params = new URLSearchParams();
      if (activeFilters.from) {
        params.set("from", activeFilters.from);
      }
      if (activeFilters.to) {
        params.set("to", activeFilters.to);
      }
      if (activeFilters.source) {
        params.set("source", activeFilters.source);
      }
      params.set("page", "1");
      params.set("pageSize", "50");

      const result = await requestJson<{ data: IncomeApi[] }>(`/api/incomes?${params.toString()}`);
      setIncomes(
        result.data.map((income) => ({
          ...income,
          amountCents: Number(income.amountCents),
        })),
      );
    } finally {
      setIsLoadingIncomes(false);
    }
  }, []);

  const loadSnapshots = useCallback(async (activeFilters: SnapshotFilters) => {
    setIsLoadingSnapshots(true);
    try {
      const params = new URLSearchParams();
      if (activeFilters.from) {
        params.set("from", activeFilters.from);
      }
      if (activeFilters.to) {
        params.set("to", activeFilters.to);
      }
      params.set("page", "1");
      params.set("pageSize", "50");

      const result = await requestJson<{ data: NetWorthSnapshotApi[] }>(`/api/networth-snapshots?${params.toString()}`);
      setSnapshots(
        result.data.map((snapshot) => ({
          ...snapshot,
          totalAssetsCents: Number(snapshot.totalAssetsCents),
          totalLiabilitiesCents: Number(snapshot.totalLiabilitiesCents),
          netWorthCents: Number(snapshot.netWorthCents),
        })),
      );
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, []);

  const loadSummaries = useCallback(async () => {
    setIsLoadingSummaries(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [monthResult, yearResult] = await Promise.all([
        requestJson<{ data: SpendingSummaryApi }>(`/api/reports/spending-summary?year=${year}&month=${month}`),
        requestJson<{ data: SpendingSummaryApi }>(`/api/reports/spending-summary?year=${year}`),
      ]);

      setMonthSummary({
        ...monthResult.data,
        totalSpendingCents: Number(monthResult.data.totalSpendingCents),
        totalIncomeCents: Number(monthResult.data.totalIncomeCents),
        netCashflowCents: Number(monthResult.data.netCashflowCents),
      });

      setYearSummary({
        ...yearResult.data,
        totalSpendingCents: Number(yearResult.data.totalSpendingCents),
        totalIncomeCents: Number(yearResult.data.totalIncomeCents),
        netCashflowCents: Number(yearResult.data.netCashflowCents),
      });
    } finally {
      setIsLoadingSummaries(false);
    }
  }, []);

  const loadReports = useCallback(async (activeFilters: ReportFilters) => {
    setIsLoadingReports(true);
    try {
      const dateParams = new URLSearchParams();
      if (activeFilters.from) {
        dateParams.set("from", activeFilters.from);
      }
      if (activeFilters.to) {
        dateParams.set("to", activeFilters.to);
      }

      const cashflowParams = new URLSearchParams(dateParams);
      cashflowParams.set("groupBy", activeFilters.groupBy);

      const networthParams = new URLSearchParams(dateParams);
      networthParams.set("groupBy", activeFilters.groupBy);

      const yearlyCashflowParams = new URLSearchParams(dateParams);
      yearlyCashflowParams.set("groupBy", "year");

      const [cashflowResult, netWorthResult, byCategoryResult, yearlyCashflowResult] = await Promise.all([
        requestJson<{ data: CashflowPointApi[] }>(`/api/reports/cashflow?${cashflowParams.toString()}`),
        requestJson<{ data: NetWorthTrendPointApi[] }>(`/api/reports/networth-trend?${networthParams.toString()}`),
        requestJson<{ data: SpendingByCategoryPointApi[] }>(`/api/reports/spending-by-category?${dateParams.toString()}`),
        requestJson<{ data: CashflowPointApi[] }>(`/api/reports/cashflow?${yearlyCashflowParams.toString()}`),
      ]);

      const normalizedCashflow = cashflowResult.data.map((point) => ({
        ...point,
        totalIncomeCents: Number(point.totalIncomeCents),
        totalExpenseCents: Number(point.totalExpenseCents),
        netCashflowCents: Number(point.netCashflowCents),
      }));

      const normalizedYearlyCashflow = yearlyCashflowResult.data.map((point) => ({
        ...point,
        totalIncomeCents: Number(point.totalIncomeCents),
        totalExpenseCents: Number(point.totalExpenseCents),
        netCashflowCents: Number(point.netCashflowCents),
      }));

      setCashflowSeries(normalizedCashflow);
      setNetWorthSeries(
        netWorthResult.data.map((point) => ({
          ...point,
          totalAssetsCents: Number(point.totalAssetsCents),
          totalLiabilitiesCents: Number(point.totalLiabilitiesCents),
          netWorthCents: Number(point.netWorthCents),
        })),
      );
      setSpendingByCategory(
        byCategoryResult.data.map((point) => ({
          ...point,
          totalCents: Number(point.totalCents),
        })),
      );
      setYearOverYearSpend(buildYearOverYearSpend(normalizedYearlyCashflow));
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories().catch((loadError) => {
      setRequestError(loadError, "Failed to load categories.");
    });
  }, [loadCategories, setRequestError]);

  useEffect(() => {
    void loadExpenses(filters).catch((loadError) => {
      setRequestError(loadError, "Failed to load expenses.");
    });
  }, [filters, loadExpenses, setRequestError]);

  useEffect(() => {
    void loadIncomes(incomeFilters).catch((loadError) => {
      setRequestError(loadError, "Failed to load incomes.");
    });
  }, [incomeFilters, loadIncomes, setRequestError]);

  useEffect(() => {
    void loadSnapshots(snapshotFilters).catch((loadError) => {
      setRequestError(loadError, "Failed to load net worth snapshots.");
    });
  }, [snapshotFilters, loadSnapshots, setRequestError]);

  useEffect(() => {
    void loadSummaries().catch((loadError) => {
      setRequestError(loadError, "Failed to load summary cards.");
    });
  }, [loadSummaries, setRequestError]);

  useEffect(() => {
    void loadReports(reportFilters).catch((loadError) => {
      setRequestError(loadError, "Failed to load reports.");
    });
  }, [loadReports, reportFilters, setRequestError]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isMobileNavOpen]);

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
        ...emptyExpenseForm,
        categoryId: current.categoryId || categories[0]?.id || "",
      }));

      await Promise.all([loadExpenses(filters), loadSummaries(), loadReports(reportFilters)]);
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
      amount: centsToDollars(expense.amountCents),
      categoryId: expense.categoryId,
      spentOn: expense.spentOn,
      payee: expense.payee,
      note: expense.note ?? "",
    });
  }

  function cancelEdit() {
    setExpenseForm((current) => ({
      ...emptyExpenseForm,
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
      await Promise.all([loadExpenses(filters), loadSummaries(), loadReports(reportFilters)]);
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

  async function handleIncomeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountCents = dollarsToCents(incomeForm.amount);
    if (!amountCents) {
      setError("Income amount must be greater than 0.");
      return;
    }
    if (!incomeForm.earnedOn) {
      setError("Income date is required.");
      return;
    }

    setIsSubmittingIncome(true);
    try {
      const payload = {
        amountCents,
        earnedOn: incomeForm.earnedOn,
        source: incomeForm.source.trim(),
        note: incomeForm.note.trim() || undefined,
      };

      if (incomeForm.id) {
        await requestJson(`/api/incomes/${incomeForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/incomes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIncomeForm(emptyIncomeForm);
      await Promise.all([loadIncomes(incomeFilters), loadSummaries(), loadReports(reportFilters)]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save income.";
      setError(message);
    } finally {
      setIsSubmittingIncome(false);
    }
  }

  function beginIncomeEdit(income: Income) {
    setIncomeForm({
      id: income.id,
      amount: centsToDollars(income.amountCents),
      earnedOn: income.earnedOn,
      source: income.source,
      note: income.note ?? "",
    });
  }

  function cancelIncomeEdit() {
    setIncomeForm(emptyIncomeForm);
  }

  async function deleteIncome(incomeId: string) {
    const confirmed = window.confirm("Delete this income record?");
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await requestJson(`/api/incomes/${incomeId}`, { method: "DELETE" });
      await Promise.all([loadIncomes(incomeFilters), loadSummaries(), loadReports(reportFilters)]);
      if (incomeForm.id === incomeId) {
        cancelIncomeEdit();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete income.";
      setError(message);
    }
  }

  async function handleSnapshotSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const totalAssetsCents = dollarsToCents(snapshotForm.totalAssets, true);
    const totalLiabilitiesCents = dollarsToCents(snapshotForm.totalLiabilities, true);

    if (totalAssetsCents === null || totalLiabilitiesCents === null) {
      setError("Assets and liabilities must be valid amounts (0 or greater).");
      return;
    }
    if (!snapshotForm.snapshotOn) {
      setError("Snapshot date is required.");
      return;
    }

    setIsSubmittingSnapshot(true);
    try {
      const payload = {
        snapshotOn: snapshotForm.snapshotOn,
        totalAssetsCents,
        totalLiabilitiesCents,
        note: snapshotForm.note.trim() || undefined,
      };

      if (snapshotForm.id) {
        await requestJson(`/api/networth-snapshots/${snapshotForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/networth-snapshots", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setSnapshotForm(emptySnapshotForm);
      await Promise.all([loadSnapshots(snapshotFilters), loadReports(reportFilters)]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save net worth snapshot.";
      setError(message);
    } finally {
      setIsSubmittingSnapshot(false);
    }
  }

  function beginSnapshotEdit(snapshot: NetWorthSnapshot) {
    setSnapshotForm({
      id: snapshot.id,
      snapshotOn: snapshot.snapshotOn,
      totalAssets: centsToDollars(snapshot.totalAssetsCents),
      totalLiabilities: centsToDollars(snapshot.totalLiabilitiesCents),
      note: snapshot.note ?? "",
    });
  }

  function cancelSnapshotEdit() {
    setSnapshotForm(emptySnapshotForm);
  }

  async function deleteSnapshot(snapshotId: string) {
    const confirmed = window.confirm("Delete this net worth snapshot?");
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await requestJson(`/api/networth-snapshots/${snapshotId}`, { method: "DELETE" });
      await Promise.all([loadSnapshots(snapshotFilters), loadReports(reportFilters)]);
      if (snapshotForm.id === snapshotId) {
        cancelSnapshotEdit();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete net worth snapshot.";
      setError(message);
    }
  }

  function exportCsv(entity: ExportEntity, from: string, to: string) {
    const params = new URLSearchParams({ entity });
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }

    const anchor = document.createElement("a");
    anchor.href = `/api/export/csv?${params.toString()}`;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.20)_0,transparent_36%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,0.20)_0,transparent_30%),radial-gradient(circle_at_96%_78%,rgba(20,184,166,0.20)_0,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]">
      <div
        className={`fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm transition md:hidden ${
          isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileNavOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all duration-300 md:flex md:flex-col ${
          isDesktopNavCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          {isDesktopNavCollapsed ? (
            <span className="mx-auto rounded-xl bg-slate-900 px-2 py-1 text-xs font-semibold text-white">EA2</span>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Workspace</p>
              <p className="text-lg font-semibold text-slate-900">Finance Studio</p>
            </div>
          )}
          <button
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => setIsDesktopNavCollapsed((current) => !current)}
            type="button"
          >
            {isDesktopNavCollapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="space-y-2">
          {dashboardSections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-[0_14px_24px_-18px_rgba(15,23,42,0.8)]"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                type="button"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {section.shortLabel}
                </span>
                {!isDesktopNavCollapsed ? <span>{section.label}</span> : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/60 bg-white/90 p-5 shadow-[0_24px_70px_-26px_rgba(15,23,42,0.6)] backdrop-blur-xl transition-transform duration-300 md:hidden ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Navigate</p>
            <p className="text-lg font-semibold text-slate-900">Finance Studio</p>
          </div>
          <button
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>
        <nav className="space-y-2">
          {dashboardSections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-[0_14px_24px_-18px_rgba(15,23,42,0.8)]"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                type="button"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {section.shortLabel}
                </span>
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="grid grid-cols-3 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-[0_20px_50px_-26px_rgba(15,23,42,0.75)] backdrop-blur-xl">
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => setIsMobileNavOpen(true)}
            type="button"
          >
            Menu
          </button>
          <button
            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            onClick={startQuickAddExpense}
            type="button"
          >
            Add Expense
          </button>
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => scrollToSection("reports")}
            type="button"
          >
            Reports
          </button>
        </div>
      </div>

      <button
        aria-label="Quick add expense"
        className="fixed bottom-24 right-4 z-40 inline-flex h-14 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_20px_42px_-18px_rgba(15,23,42,0.75)] transition hover:bg-slate-700 md:bottom-6 md:right-6"
        onClick={startQuickAddExpense}
        type="button"
      >
        + Expense
      </button>

      <main
        className={`mx-auto min-h-screen max-w-[120rem] px-4 pb-32 pt-6 transition-all duration-300 sm:px-8 md:pb-8 ${
          isDesktopNavCollapsed ? "md:ml-20" : "md:ml-72"
        }`}
      >
        <header
          className="rounded-3xl border border-white/65 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-[0_28px_60px_-28px_rgba(2,6,23,0.8)]"
          id="overview"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium text-sky-100">Signed in as {userEmail}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Finance Command Center</h1>
                <p className="mt-1 text-sm text-sky-100/90">
                  Manage expenses, income, snapshots, and reports from one place.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="hidden rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/20 md:inline-flex"
                onClick={() => setIsDesktopNavCollapsed((current) => !current)}
                type="button"
              >
                {isDesktopNavCollapsed ? "Expand Menu" : "Collapse Menu"}
              </button>
              <button
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                onClick={() => signOut({ callbackUrl: "/login" })}
                type="button"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

      <section className="mt-5 grid scroll-mt-24 gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-sky-100/80 bg-gradient-to-br from-white to-sky-50 p-5 shadow-[0_22px_40px_-28px_rgba(2,6,23,0.7)]">
          <p className="text-sm font-medium text-slate-500">Current Month Spending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {monthSummary ? formatCurrency(monthSummary.totalSpendingCents) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Income: {monthSummary ? formatCurrency(monthSummary.totalIncomeCents) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Net cashflow: {monthSummary ? formatCurrency(monthSummary.netCashflowCents) : "--"}
          </p>
        </article>
        <article className="rounded-3xl border border-teal-100/80 bg-gradient-to-br from-white to-teal-50 p-5 shadow-[0_22px_40px_-28px_rgba(2,6,23,0.7)]">
          <p className="text-sm font-medium text-slate-500">Current Year Spending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {yearSummary ? formatCurrency(yearSummary.totalSpendingCents) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Income: {yearSummary ? formatCurrency(yearSummary.totalIncomeCents) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Net cashflow: {yearSummary ? formatCurrency(yearSummary.netCashflowCents) : "--"}
          </p>
        </article>
      </section>

      <section
        className="mt-6 scroll-mt-24 rounded-3xl border border-white/65 bg-white/80 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.65)] backdrop-blur"
        id="reports"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Reporting</h2>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-4">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setReportFilters((current) => ({ ...current, from: event.target.value }))}
              placeholder="From"
              type="date"
              value={reportFilters.from}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setReportFilters((current) => ({ ...current, to: event.target.value }))}
              placeholder="To"
              type="date"
              value={reportFilters.to}
            />
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) =>
                setReportFilters((current) => ({
                  ...current,
                  groupBy: event.target.value as ReportFilters["groupBy"],
                }))
              }
              value={reportFilters.groupBy}
            >
              <option value="month">Group by Month</option>
              <option value="year">Group by Year</option>
            </select>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              onClick={() => setReportFilters(defaultReportFilters)}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.6)]">
            <h3 className="text-base font-semibold text-slate-900">Cashflow (Income vs Expenses)</h3>
            <div className="mt-3 h-64 w-full">
              {cashflowSeries.length === 0 ? (
                <p className="text-sm text-slate-500">No cashflow data for selected filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(Number(value))} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(value) => `Period: ${String(value)}`}
                    />
                    <Legend />
                    <Line dataKey="totalIncomeCents" name="Income" stroke="#0ea5e9" strokeWidth={2} />
                    <Line dataKey="totalExpenseCents" name="Expenses" stroke="#f97316" strokeWidth={2} />
                    <Line dataKey="netCashflowCents" name="Net Cashflow" stroke="#0f766e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.6)]">
            <h3 className="text-base font-semibold text-slate-900">Net Worth Trend</h3>
            <div className="mt-3 h-64 w-full">
              {netWorthSeries.length === 0 ? (
                <p className="text-sm text-slate-500">No net worth snapshots for selected filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netWorthSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(Number(value))} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(value) => `Period: ${String(value)}`}
                    />
                    <Legend />
                    <Line dataKey="totalAssetsCents" name="Assets" stroke="#0ea5e9" strokeWidth={2} />
                    <Line dataKey="totalLiabilitiesCents" name="Liabilities" stroke="#ef4444" strokeWidth={2} />
                    <Line dataKey="netWorthCents" name="Net Worth" stroke="#0f766e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.6)]">
            <h3 className="text-base font-semibold text-slate-900">Spending by Category</h3>
            <div className="mt-3 h-64 w-full">
              {spendingByCategory.length === 0 ? (
                <p className="text-sm text-slate-500">No category spending data for selected filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingByCategory}
                      dataKey="totalCents"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => String(entry.category ?? "Unknown")}
                    >
                      {spendingByCategory.map((entry, index) => (
                        <Cell key={`${entry.category ?? "unknown"}-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(value) => `Category: ${String(value)}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {spendingByCategory.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="px-2 py-1 font-medium">Category</th>
                      <th className="px-2 py-1 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spendingByCategory.map((row) => (
                      <tr className="border-t border-slate-100" key={row.category ?? "unknown"}>
                        <td className="px-2 py-1">{row.category ?? "Unknown"}</td>
                        <td className="px-2 py-1">{formatCurrency(row.totalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>

          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.6)]">
            <h3 className="text-base font-semibold text-slate-900">Year-over-Year Spend</h3>
            <div className="mt-3 h-64 w-full">
              {yearOverYearSpend.length === 0 ? (
                <p className="text-sm text-slate-500">No year-over-year data for selected filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearOverYearSpend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(Number(value))} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(value) => `Year: ${String(value)}`}
                    />
                    <Legend />
                    <Bar dataKey="totalExpenseCents" fill="#f97316" name="Total Spend" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {yearOverYearSpend.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="px-2 py-1 font-medium">Year</th>
                      <th className="px-2 py-1 font-medium">Total Spend</th>
                      <th className="px-2 py-1 font-medium">Change</th>
                      <th className="px-2 py-1 font-medium">% Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearOverYearSpend.map((row) => {
                      const changeClass =
                        row.changeAmountCents === null
                          ? "text-slate-500"
                          : row.changeAmountCents > 0
                            ? "text-red-700"
                            : row.changeAmountCents < 0
                              ? "text-emerald-700"
                              : "text-slate-700";

                      return (
                        <tr className="border-t border-slate-100" key={row.year}>
                          <td className="px-2 py-1">{row.year}</td>
                          <td className="px-2 py-1">{formatCurrency(row.totalExpenseCents)}</td>
                          <td className={`px-2 py-1 ${changeClass}`}>
                            {row.changeAmountCents === null ? "--" : formatCurrency(row.changeAmountCents)}
                          </td>
                          <td className={`px-2 py-1 ${changeClass}`}>{formatPercent(row.changePercent)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section
        className="mt-6 grid scroll-mt-24 gap-4 rounded-3xl border border-white/65 bg-white/75 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.65)] backdrop-blur lg:grid-cols-[1.1fr,0.9fr]"
        id="expenses"
      >
        <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.6)]">
          <h2 className="text-lg font-semibold text-slate-900">{expenseForm.id ? "Edit Expense" : "Add Expense"}</h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={handleExpenseSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Amount</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                min="0.01"
                onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0.00"
                required
                ref={expenseAmountInputRef}
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
              <span className="mb-1 block text-sm text-slate-700">Payee (Optional)</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                onChange={(event) => setExpenseForm((current) => ({ ...current, payee: event.target.value }))}
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
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.6)]">
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

      <section className="mt-6 rounded-3xl border border-white/65 bg-white/80 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.65)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              onClick={() => setFilters(emptyFilters)}
              type="button"
            >
              Clear Filters
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              onClick={() => exportCsv("expenses", filters.from, filters.to)}
              type="button"
            >
              Export CSV
            </button>
          </div>
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
        {isLoadingAny ? <p className="mt-3 text-sm text-slate-600">Loading...</p> : null}

        <div className="mt-4 overflow-x-auto">
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses found for current filters.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Payee</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Note</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr className="border-t border-slate-100" key={expense.id}>
                    <td className="px-3 py-2">{expense.spentOn}</td>
                    <td className="px-3 py-2">{expense.payee || "--"}</td>
                    <td className="px-3 py-2">{expense.categoryName ?? "Unknown"}</td>
                    <td className="px-3 py-2">{formatCurrency(expense.amountCents)}</td>
                    <td className="hidden max-w-[280px] truncate px-3 py-2 text-slate-600 md:table-cell">
                      {expense.note ?? "--"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section
        className="mt-6 scroll-mt-24 rounded-3xl border border-white/65 bg-white/80 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.65)] backdrop-blur"
        id="income"
      >
        <h2 className="text-lg font-semibold text-slate-900">{incomeForm.id ? "Edit Income" : "Add Income"}</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleIncomeSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Amount</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              min="0.01"
              onChange={(event) => setIncomeForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={incomeForm.amount}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Earned On</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setIncomeForm((current) => ({ ...current, earnedOn: event.target.value }))}
              required
              type="date"
              value={incomeForm.earnedOn}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Source (Optional)</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setIncomeForm((current) => ({ ...current, source: event.target.value }))}
              type="text"
              value={incomeForm.source}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Note (Optional)</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setIncomeForm((current) => ({ ...current, note: event.target.value }))}
              type="text"
              value={incomeForm.note}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmittingIncome}
              type="submit"
            >
              {isSubmittingIncome ? "Saving..." : incomeForm.id ? "Update Income" : "Add Income"}
            </button>
            {incomeForm.id ? (
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                onClick={cancelIncomeEdit}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">Income Records</h3>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                onClick={() => setIncomeFilters(emptyIncomeFilters)}
                type="button"
              >
                Clear Filters
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                onClick={() => exportCsv("incomes", incomeFilters.from, incomeFilters.to)}
                type="button"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setIncomeFilters((current) => ({ ...current, from: event.target.value }))}
              placeholder="From"
              type="date"
              value={incomeFilters.from}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setIncomeFilters((current) => ({ ...current, to: event.target.value }))}
              placeholder="To"
              type="date"
              value={incomeFilters.to}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setIncomeFilters((current) => ({ ...current, source: event.target.value }))}
              placeholder="Source contains..."
              type="text"
              value={incomeFilters.source}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            {incomes.length === 0 ? (
              <p className="text-sm text-slate-500">No income records found for current filters.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Note</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => (
                    <tr className="border-t border-slate-100" key={income.id}>
                      <td className="px-3 py-2">{income.earnedOn}</td>
                      <td className="px-3 py-2">{income.source || "--"}</td>
                      <td className="px-3 py-2">{formatCurrency(income.amountCents)}</td>
                      <td className="hidden max-w-[280px] truncate px-3 py-2 text-slate-600 md:table-cell">
                        {income.note ?? "--"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                            onClick={() => beginIncomeEdit(income)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            onClick={() => void deleteIncome(income.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section
        className="mt-6 scroll-mt-24 rounded-3xl border border-white/65 bg-white/80 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.65)] backdrop-blur"
        id="networth"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          {snapshotForm.id ? "Edit Net Worth Snapshot" : "Add Net Worth Snapshot"}
        </h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleSnapshotSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Snapshot Date</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setSnapshotForm((current) => ({ ...current, snapshotOn: event.target.value }))}
              required
              type="date"
              value={snapshotForm.snapshotOn}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Total Assets</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              min="0"
              onChange={(event) => setSnapshotForm((current) => ({ ...current, totalAssets: event.target.value }))}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={snapshotForm.totalAssets}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Total Liabilities</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              min="0"
              onChange={(event) => setSnapshotForm((current) => ({ ...current, totalLiabilities: event.target.value }))}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={snapshotForm.totalLiabilities}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Note (Optional)</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setSnapshotForm((current) => ({ ...current, note: event.target.value }))}
              type="text"
              value={snapshotForm.note}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmittingSnapshot}
              type="submit"
            >
              {isSubmittingSnapshot ? "Saving..." : snapshotForm.id ? "Update Snapshot" : "Add Snapshot"}
            </button>
            {snapshotForm.id ? (
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                onClick={cancelSnapshotEdit}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">Net Worth Snapshots</h3>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                onClick={() => setSnapshotFilters(emptySnapshotFilters)}
                type="button"
              >
                Clear Filters
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                onClick={() => exportCsv("networth_snapshots", snapshotFilters.from, snapshotFilters.to)}
                type="button"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setSnapshotFilters((current) => ({ ...current, from: event.target.value }))}
              placeholder="From"
              type="date"
              value={snapshotFilters.from}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
              onChange={(event) => setSnapshotFilters((current) => ({ ...current, to: event.target.value }))}
              placeholder="To"
              type="date"
              value={snapshotFilters.to}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            {snapshots.length === 0 ? (
              <p className="text-sm text-slate-500">No net worth snapshots found for current filters.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Assets</th>
                    <th className="px-3 py-2 font-medium">Liabilities</th>
                    <th className="px-3 py-2 font-medium">Net Worth</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Note</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot) => (
                    <tr className="border-t border-slate-100" key={snapshot.id}>
                      <td className="px-3 py-2">{snapshot.snapshotOn}</td>
                      <td className="px-3 py-2">{formatCurrency(snapshot.totalAssetsCents)}</td>
                      <td className="px-3 py-2">{formatCurrency(snapshot.totalLiabilitiesCents)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(snapshot.netWorthCents)}</td>
                      <td className="hidden max-w-[280px] truncate px-3 py-2 text-slate-600 md:table-cell">
                        {snapshot.note ?? "--"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                            onClick={() => beginSnapshotEdit(snapshot)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            onClick={() => void deleteSnapshot(snapshot.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
    </div>
  );
}
