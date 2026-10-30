import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CircleHelp,
  Coffee,
  CreditCard,
  Gift,
  Home,
  LayoutDashboard,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  Zap,
  Users,
} from 'lucide-react';
import SharedMoney from './SharedMoneyLocal';
import { openStyledExport } from './styledExport';
import './app-ui.css';

type Frequency = 'Monthly' | 'Weekly' | 'Biweekly' | 'Irregular';
type Page =
  'Overview' | 'Salary planner' | 'Expenses' | 'Bills & calendar' | 'Goals & insights' | 'Shared money';
type Tx = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  note?: string;
};
type Bill = {
  id: string;
  title: string;
  category: string;
  amount: number;
  dueDate: string;
  recurring: boolean;
  paid: boolean;
  generatedFrom?: string;
};
type Goal = { id: string; title: string; target: number; saved: number; deadline: string; category: string };
type Plan = {
  income: number;
  frequency: Frequency;
  nextPayday: string;
  currency: string;
  allocations: Record<string, number>;
  setupDone?: boolean;
};
type Data = { plan: Plan; transactions: Tx[]; bills: Bill[]; goals: Goal[] };
const iso = (d: Date) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const daysFrom = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const uid = () => Math.random().toString(36).slice(2, 10);
const currencyOptions = ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES'];
const regionCurrency: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
};
const guessCurrency = () => {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return (region && regionCurrency[region]) || 'USD';
  } catch {
    return 'USD';
  }
};
const dayMs = 86400000;
const atNoon = (s: string) => new Date(s + 'T12:00:00');
const addDays = (s: string, n: number) => {
  const d = atNoon(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const addMonths = (s: string, n: number) => {
  const d = atNoon(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
};
const stepPayday = (s: string, f: Frequency, dir: 1 | -1 = 1) =>
  f === 'Weekly' ? addDays(s, 7 * dir) : f === 'Biweekly' ? addDays(s, 14 * dir) : addMonths(s, dir);
/** The pay cycle that contains `today`: [start, end), where `end` is the next payday on or after today. */
function getCycle(plan: Plan, today: string) {
  let end = plan.nextPayday || today;
  for (let guard = 0; end < today && guard < 500; guard++) end = stepPayday(end, plan.frequency);
  const start =
    plan.frequency === 'Irregular' ? today.slice(0, 8) + '01' : stepPayday(end, plan.frequency, -1);
  const total = Math.max(1, Math.round((atNoon(end).getTime() - atNoon(start).getTime()) / dayMs));
  const daysLeft = Math.max(1, Math.round((atNoon(end).getTime() - atNoon(today).getTime()) / dayMs));
  return { start, end, total, daysLeft, day: Math.min(total, Math.max(1, total - daysLeft + 1)) };
}
const cssVar = (name: string, fallback: string) =>
  (typeof window !== 'undefined' &&
    getComputedStyle(document.documentElement).getPropertyValue(name).trim()) ||
  fallback;
const longDate = (s: string) =>
  atNoon(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const categories = [
  'Housing',
  'Food & groceries',
  'Transport',
  'Utilities',
  'Family & giving',
  'Health',
  'Personal',
  'Subscriptions',
  'Savings',
  'Other',
];
const defaultData: Data = {
  plan: {
    income: 0,
    frequency: 'Monthly',
    nextPayday: daysFrom(7),
    currency: guessCurrency(),
    setupDone: false,
    allocations: {
      Housing: 0,
      'Food & groceries': 0,
      Transport: 0,
      Utilities: 0,
      'Family & giving': 0,
      Health: 0,
      Personal: 0,
      Subscriptions: 0,
      Savings: 0,
      Other: 0,
    },
  },
  transactions: [],
  bills: [],
  goals: [],
};
function readData(): Data {
  try {
    const s = localStorage.getItem('payday-data-v1');
    if (s) {
      const d = JSON.parse(s);
      return { ...defaultData, ...d, plan: { ...defaultData.plan, ...d.plan } };
    }
  } catch {}
  return defaultData;
}
const icons: Record<string, typeof Home> = {
  Housing: Home,
  'Food & groceries': ShoppingBag,
  Transport: ArrowRight,
  Utilities: Zap,
  'Family & giving': Gift,
  Health: CircleHelp,
  Personal: Coffee,
  Subscriptions: CreditCard,
  Savings: Target,
  Other: MoreHorizontal,
  Income: ArrowDownLeft,
};
const dateLabel = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
const blankForm = () => ({
  title: '',
  category: 'Food & groceries',
  amount: '',
  date: iso(new Date()),
  type: 'expense' as 'income' | 'expense',
  note: '',
  dueDate: daysFrom(7),
  recurring: true,
  target: '',
  saved: '',
  deadline: daysFrom(180),
});
function Dashboard() {
  const [data, setData] = useState<Data>(readData);
  const [page, setPage] = useState<Page>(() =>
    window.location.hash === '#shared' ? 'Shared money' : 'Overview',
  );
  const [modal, setModal] = useState<'transaction' | 'bill' | 'goal' | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All categories');
  const [showPaid, setShowPaid] = useState(false);
  const [calendarView, setCalendarView] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<Tx | null>(null);
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [undo, setUndo] = useState<null | (() => void)>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem('payday-data-v1', JSON.stringify(data));
    } catch {
      setToast("We couldn't save your changes. Try again before leaving this page.");
    }
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(
      () => {
        setToast('');
        setUndo(null);
      },
      undo ? 7000 : 2800,
    );
    return () => window.clearTimeout(t);
  }, [toast, undo]);
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#shared') setPage('Shared money');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const clear = () => setPrintReceipt(null);
    window.addEventListener('afterprint', clear);
    return () => window.removeEventListener('afterprint', clear);
  }, []);
  const printTransaction = (t: Tx) => {
    setPrintReceipt(t);
    window.setTimeout(() => window.print(), 250);
  };
  const exportCurrentPage = () => {
    const currency = data.plan.currency;
    const money = (n: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currencyDisplay: 'narrowSymbol',
        currency,
        maximumFractionDigits: 2,
      }).format(n);
    const expenseRows = (rows: Tx[]) =>
      rows.map((t) => ({
        date: new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        description: t.title,
        category: t.category,
        type: t.type === 'income' ? 'Money in' : 'Money out',
        amount: (t.type === 'income' ? '+' : '−') + money(t.amount),
        note: t.note || 'None',
      }));
    const billRows = (rows: Bill[]) =>
      rows
        .slice()
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map((b) => ({
          bill: b.title,
          category: b.category,
          due: new Date(b.dueDate + 'T12:00:00').toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          amount: money(b.amount),
          frequency: b.recurring ? 'Repeats monthly' : 'One-off',
          status: b.paid ? 'Paid' : b.dueDate < iso(new Date()) ? 'Overdue' : 'Unpaid',
        }));
    const allocationRows = Object.entries(data.plan.allocations).map(([category, planned]) => ({
      category,
      planned: money(Number(planned)),
      spent: money(
        cycleTx
          .filter((t) => t.type === 'expense' && t.category === category)
          .reduce((sum, t) => sum + t.amount, 0),
      ),
      remaining: money(
        Number(planned) -
          cycleTx
            .filter((t) => t.type === 'expense' && t.category === category)
            .reduce((sum, t) => sum + t.amount, 0),
      ),
    }));
    const sections: import('./styledExport').ExportSection[] = [];
    const summary: { label: string; value: string; detail?: string }[] = [];
    if (page === 'Overview') {
      summary.push(
        { label: 'Planned income', value: money(data.plan.income), detail: data.plan.frequency + ' income' },
        {
          label: 'Recorded spending',
          value: money(spent),
          detail: data.transactions.filter((t) => t.type === 'expense').length + ' expenses',
        },
        {
          label: 'Available after bills',
          value: money(spendable),
          detail: money(reserved) + ' reserved for upcoming bills',
        },
      );
      sections.push({
        title: 'Budget at a glance',
        description: 'Planned category amounts compared with recorded expenses.',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'planned', label: 'Planned', align: 'right' },
          { key: 'spent', label: 'Spent', align: 'right' },
          { key: 'remaining', label: 'Difference', align: 'right' },
        ],
        rows: allocationRows,
      });
      sections.push({
        title: 'Recent money activity',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Amount', align: 'right' },
        ],
        rows: expenseRows([...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)),
      });
      sections.push({
        title: 'Upcoming bills',
        columns: [
          { key: 'bill', label: 'Bill' },
          { key: 'due', label: 'Due date' },
          { key: 'frequency', label: 'Pattern' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'status', label: 'Status' },
        ],
        rows: billRows(upcoming),
      });
    } else if (page === 'Salary planner') {
      summary.push(
        { label: 'Expected income', value: money(data.plan.income), detail: data.plan.frequency + ' income' },
        {
          label: 'Allocated',
          value: money(allocated),
          detail: Math.round((allocated / Math.max(1, data.plan.income)) * 100) + '% of income',
        },
        {
          label: 'Unallocated',
          value: money(data.plan.income - allocated),
          detail: allocated > data.plan.income ? 'Allocations exceed income' : 'Available to assign',
        },
      );
      sections.push({
        title: 'Salary plan',
        description:
          'Your saved income allocation. Negative differences mean spending is above the category plan.',
        paragraphs: [
          'Next expected payday: ' +
            new Date(data.plan.nextPayday + 'T12:00:00').toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
        ],
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'planned', label: 'Planned', align: 'right' },
          { key: 'spent', label: 'Spent', align: 'right' },
          { key: 'remaining', label: 'Difference', align: 'right' },
        ],
        rows: allocationRows,
      });
    } else if (page === 'Expenses') {
      const selected = txs;
      summary.push(
        {
          label: 'Matching records',
          value: String(selected.length),
          detail: 'Current search and category filters',
        },
        {
          label: 'Expenses shown',
          value: money(selected.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)),
          detail: 'Money out',
        },
        {
          label: 'Income shown',
          value: money(selected.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)),
          detail: 'Money in',
        },
      );
      sections.push({
        title: 'Transaction ledger',
        description: 'Includes the transactions matching your current search and category filters.',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'note', label: 'Note' },
        ],
        rows: expenseRows(selected),
      });
    } else if (page === 'Bills & calendar') {
      summary.push(
        {
          label: 'Unpaid bills',
          value: String(data.bills.filter((b) => !b.paid).length),
          detail: 'All bills not marked paid',
        },
        { label: 'Upcoming amount', value: money(reserved), detail: 'Due today or later' },
        {
          label: 'Marked paid',
          value: money(data.bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0)),
          detail: 'Recorded paid bills',
        },
      );
      sections.push({
        title: 'Bills and commitments',
        description: 'Payment status reflects what you have marked in Soma.',
        columns: [
          { key: 'bill', label: 'Bill' },
          { key: 'category', label: 'Category' },
          { key: 'due', label: 'Due date' },
          { key: 'frequency', label: 'Pattern' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'status', label: 'Status' },
        ],
        rows: billRows(data.bills),
      });
    } else {
      const saved = data.goals.reduce((sum, g) => sum + g.saved, 0),
        target = data.goals.reduce((sum, g) => sum + g.target, 0);
      summary.push(
        { label: 'Saved so far', value: money(saved), detail: 'Across all goals' },
        { label: 'Combined target', value: money(target), detail: data.goals.length + ' goals' },
        {
          label: 'Still to go',
          value: money(data.goals.reduce((sum, g) => sum + Math.max(0, g.target - g.saved), 0)),
          detail: 'Across all goals',
        },
      );
      sections.push({
        title: 'Savings goals',
        description: 'Progress based on the targets and contributions recorded in Soma.',
        columns: [
          { key: 'goal', label: 'Goal' },
          { key: 'category', label: 'Category' },
          { key: 'target', label: 'Target', align: 'right' },
          { key: 'saved', label: 'Saved', align: 'right' },
          { key: 'remaining', label: 'Remaining', align: 'right' },
          { key: 'deadline', label: 'Target date' },
        ],
        rows: data.goals.map((g) => ({
          goal: g.title,
          category: g.category,
          target: money(g.target),
          saved: money(g.saved),
          remaining: money(Math.max(0, g.target - g.saved)),
          deadline: new Date(g.deadline + 'T12:00:00').toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        })),
      });
    }
    openStyledExport({
      title:
        page === 'Overview'
          ? 'Your money overview'
          : page === 'Salary planner'
            ? 'Your salary plan'
            : page === 'Expenses'
              ? 'Your transaction statement'
              : page === 'Bills & calendar'
                ? 'Bills and commitments'
                : 'Savings goals',
      subtitle: 'A clear, printable snapshot of the information you have recorded in Soma.',
      type: page,
      currency,
      summary,
      sections,
    });
  };
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currencyDisplay: 'narrowSymbol',
      currency: data.plan.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const today = iso(new Date());
  const cycle = getCycle(data.plan, today);
  const allocated = Object.values(data.plan.allocations).reduce((s, n) => s + n, 0);
  const spent = data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cycleTx = data.transactions.filter((t) => t.date >= cycle.start && t.date < cycle.end);
  const cycleSpent = cycleTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cycleRecordedIncome = cycleTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const cycleIncome = Math.max(data.plan.income, cycleRecordedIncome);
  const unpaidBills = data.bills.filter((b) => !b.paid);
  const byDue = (a: Bill, b: Bill) => a.dueDate.localeCompare(b.dueDate);
  const overdue = unpaidBills.filter((b) => b.dueDate < today).sort(byDue);
  const upcoming = unpaidBills.filter((b) => b.dueDate >= today).sort(byDue);
  const dueBeforePayday = unpaidBills.filter((b) => b.dueDate < cycle.end).sort(byDue);
  const reserved = dueBeforePayday.reduce((s, b) => s + b.amount, 0);
  const balance = Math.max(0, cycleIncome - cycleSpent);
  const daysLeft = cycle.daysLeft;
  const spendable = Math.max(0, balance - reserved);
  const daily = spendable / daysLeft;
  const showSetup =
    !data.plan.setupDone &&
    data.plan.income === 0 &&
    !data.transactions.length &&
    !data.bills.length &&
    !data.goals.length;
  const totalSaved = data.goals.reduce((s, g) => s + g.saved, 0);
  const txs = useMemo(
    () =>
      data.transactions
        .filter(
          (t) =>
            (t.title + ' ' + t.category).toLowerCase().includes(search.toLowerCase()) &&
            (filter === 'All categories' || t.category === filter),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.transactions, search, filter],
  );
  const go = (p: Page) => {
    setPage(p);
  };
  const updatePlan = (p: Partial<Plan>) => setData((d) => ({ ...d, plan: { ...d.plan, ...p } }));
  const open = (kind: 'transaction' | 'bill' | 'goal', item?: Tx | Bill | Goal) => {
    setEditing(item?.id || null);
    setErrors({});
    const f = blankForm();
    if (item) {
      f.title = item.title;
      if ('type' in item) {
        f.category = item.category;
        f.amount = String(item.amount);
        f.date = item.date;
        f.type = item.type;
        f.note = item.note || '';
      } else if ('dueDate' in item) {
        f.category = item.category;
        f.amount = String(item.amount);
        f.dueDate = item.dueDate;
        f.recurring = item.recurring;
      } else {
        f.category = item.category;
        f.target = String(item.target);
        f.saved = String(item.saved);
        f.deadline = item.deadline;
      }
    }
    setForm(f);
    setModal(kind);
  };
  const save = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Add a name or description.';
    if (modal !== 'goal' && !(Number(form.amount) > 0)) e.amount = 'Enter an amount greater than zero.';
    if (modal === 'goal' && !(Number(form.target) > 0)) e.target = 'Enter a target greater than zero.';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (modal === 'transaction') {
      const t: Tx = {
        id: editing || uid(),
        title: form.title.trim(),
        category: form.type === 'income' ? 'Income' : form.category,
        amount: Number(form.amount),
        date: form.date,
        type: form.type,
        note: form.note,
      };
      setData((d) => ({
        ...d,
        transactions: editing
          ? d.transactions.map((x) => (x.id === editing ? t : x))
          : [t, ...d.transactions],
      }));
    } else if (modal === 'bill') {
      const b: Bill = {
        id: editing || uid(),
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        recurring: form.recurring,
        paid: editing ? data.bills.find((x) => x.id === editing)?.paid || false : false,
      };
      setData((d) => ({
        ...d,
        bills: editing ? d.bills.map((x) => (x.id === editing ? b : x)) : [b, ...d.bills],
      }));
    } else if (modal === 'goal') {
      const g: Goal = {
        id: editing || uid(),
        title: form.title.trim(),
        target: Number(form.target),
        saved: Math.max(0, Number(form.saved) || 0),
        deadline: form.deadline,
        category: form.category,
      };
      setData((d) => ({
        ...d,
        goals: editing ? d.goals.map((x) => (x.id === editing ? g : x)) : [g, ...d.goals],
      }));
    }
    setModal(null);
    setEditing(null);
    setToast('Saved.');
  };
  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };
  const remove = (kind: 'transaction' | 'bill' | 'goal', key: string) => {
    const field = kind === 'transaction' ? 'transactions' : kind === 'bill' ? 'bills' : 'goals';
    const list = data[field] as { id: string; title: string }[];
    const index = list.findIndex((x) => x.id === key);
    const item = list[index];
    if (!item) return;
    setData((d) => ({ ...d, [field]: (d[field] as { id: string }[]).filter((x) => x.id !== key) }));
    setUndo(
      () => () =>
        setData((d) => {
          const arr = [...(d[field] as unknown[])];
          arr.splice(Math.min(index, arr.length), 0, item);
          return { ...d, [field]: arr };
        }),
    );
    setToast('Removed "' + item.title + '".');
  };
  const togglePaid = (b: Bill) =>
    setData((d) => {
      const marking = !b.paid;
      let bills = d.bills.map((x) => (x.id === b.id ? { ...x, paid: marking } : x));
      if (b.recurring) {
        const nextDue = addMonths(b.dueDate, 1);
        const child = bills.find((x) => x.generatedFrom === b.id);
        if (marking && !child && !bills.some((x) => x.title === b.title && x.dueDate === nextDue)) {
          bills = [
            {
              id: uid(),
              title: b.title,
              category: b.category,
              amount: b.amount,
              dueDate: nextDue,
              recurring: true,
              paid: false,
              generatedFrom: b.id,
            },
            ...bills,
          ];
        }
        if (!marking && child && !child.paid) bills = bills.filter((x) => x.id !== child.id);
      }
      return { ...d, bills };
    });
  const downloadBackup = () => {
    let shared: unknown = null;
    try {
      shared = JSON.parse(localStorage.getItem('payday-shared-money-local-v1') || 'null');
    } catch {}
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), planner: data, sharedMoney: shared }, null, 2)],
      {
        type: 'application/json',
      },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'soma-backup-' + today + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const nav = [
    { label: 'Overview' as Page, icon: LayoutDashboard },
    { label: 'Salary planner' as Page, icon: Wallet },
    { label: 'Expenses' as Page, icon: ReceiptText },
    { label: 'Bills & calendar' as Page, icon: CalendarDays },
    { label: 'Goals & insights' as Page, icon: Target },
    { label: 'Shared money' as Page, icon: Users },
  ];
  const titles: Record<Page, { title: string; desc: string }> = {
    Overview: { title: 'Overview', desc: 'Where you stand until your next payday.' },
    'Salary planner': { title: 'Salary plan', desc: 'Decide where each payday goes.' },
    Expenses: { title: 'Expenses', desc: 'Everything that came in and went out.' },
    'Bills & calendar': { title: 'Bills and calendar', desc: 'What is due, and what you have paid.' },
    'Goals & insights': { title: 'Goals', desc: 'What you are saving toward.' },
    'Shared money': { title: 'Shared money', desc: 'Split costs with the people you share them with.' },
  };
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand-row app-home-brand" href="/" aria-label="Soma homepage">
          <div className="brand-mark">
            <Wallet size={18} />
          </div>
          <div className="brand">
            soma<span>.</span>
          </div>
        </a>
        <div>
          <nav className="nav-list" aria-label="Main">
            {nav.map((n) => (
              <button
                key={n.label}
                className={'nav-item ' + (page === n.label ? 'active' : '')}
                aria-current={page === n.label ? 'page' : undefined}
                onClick={() => go(n.label)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <n.icon size={17} />
                </span>
                {navShort[n.label] ?? n.label}
                {n.label === 'Bills & calendar' && overdue.length > 0 && (
                  <span className="nav-badge" role="img" aria-label={overdue.length + ' overdue'}>
                    {overdue.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setPrefsOpen(true)}>
            <span className="nav-icon" aria-hidden="true">
              <Settings size={17} />
            </span>
            Preferences
          </button>
          <a className="nav-item" href="/">
            <span className="nav-icon" aria-hidden="true">
              <Home size={17} />
            </span>
            Back to homepage
          </a>
          <div className="profile">
            <div className="avatar">
              <Wallet size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Money workspace</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                Personal data stays on this device
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <a className="topbar-home-link" href="/" aria-label="Back to Soma homepage">
              <ArrowLeft size={15} />
              <span>Back to homepage</span>
            </a>
            <span className="topbar-divider" aria-hidden="true"></span>
            <div className="crumb">
              Your money <span style={{ margin: '0 7px', color: 'var(--color-ink-muted)' }}>/</span>{' '}
              <strong>{page}</strong>
            </div>
          </div>
          <div className="top-actions">
            <button
              className="icon-btn bell"
              aria-label={overdue.length ? 'Bills, ' + overdue.length + ' overdue' : 'Bills'}
              onClick={() => go('Bills & calendar')}
            >
              <Bell size={16} />
              {overdue.length > 0 && (
                <span className="nav-badge nav-badge-dot" aria-hidden="true">
                  {overdue.length}
                </span>
              )}
            </button>
          </div>
        </header>
        <div className="content">
          {page !== 'Shared money' && (
            <div className="page-heading">
              <div>
                <h1>{titles[page].title}</h1>
                <p>{titles[page].desc}</p>
              </div>
              <div className="heading-actions">
                <button type="button" className="secondary print-page-button" onClick={exportCurrentPage}>
                  <Printer size={15} /> Export report
                </button>
                {(page === 'Overview' || page === 'Expenses') && (
                  <button type="button" className="primary" onClick={() => open('transaction')}>
                    <Plus size={15} /> Add transaction
                  </button>
                )}
              </div>
            </div>
          )}
          {page === 'Shared money' && <SharedMoney />}
          {page === 'Overview' && (
            <>
              {showSetup ? (
                <Setup
                  plan={data.plan}
                  onSave={(p) => {
                    updatePlan(p);
                    setToast('Plan saved.');
                  }}
                  onSkip={() => updatePlan({ setupDone: true })}
                  onShared={() => {
                    updatePlan({ setupDone: true });
                    go('Shared money');
                  }}
                />
              ) : (
                <section className="cycle-hero" aria-labelledby="cycle-title">
                  <div className="cycle-main">
                    <h2 id="cycle-title">Free to spend per day</h2>
                    <div className="cycle-number">{fmt(daily)}</div>
                    <p>
                      {cycleIncome > 0
                        ? 'Until payday on ' +
                          longDate(cycle.end) +
                          ', ' +
                          cycle.daysLeft +
                          (cycle.daysLeft === 1 ? ' day away.' : ' days away.')
                        : 'Add your income in Salary planner to see a daily number.'}
                    </p>
                  </div>
                  <div className="cycle-side">
                    <div
                      className="cycle-bar"
                      role="img"
                      aria-label={'Day ' + cycle.day + ' of ' + cycle.total + ' in this pay cycle'}
                    >
                      <i style={{ width: (cycle.day / cycle.total) * 100 + '%' }} />
                    </div>
                    <div className="cycle-bar-labels">
                      <span>
                        Day {cycle.day} of {cycle.total}
                      </span>
                      <span>Soma {dateLabel(cycle.end)}</span>
                    </div>
                    <dl className="cycle-sums">
                      <div>
                        <dt>Left after spending</dt>
                        <dd>{fmt(balance)}</dd>
                      </div>
                      <div>
                        <dt>Bills before payday</dt>
                        <dd>{fmt(reserved)}</dd>
                      </div>
                      <div>
                        <dt>Free to spend</dt>
                        <dd>{fmt(spendable)}</dd>
                      </div>
                    </dl>
                  </div>
                  <details className="cycle-how">
                    <summary>How is this worked out?</summary>
                    <p>
                      Income this cycle is your planned income or what you recorded since the cycle began,
                      whichever is higher. Soma subtracts what you spent this cycle, then the unpaid bills
                      due before your next payday, and divides the rest by the days left. Log a bill as an
                      expense when you pay it, so it counts as spending.
                    </p>
                  </details>
                </section>
              )}
              {!showSetup && (
                <>
                  {overdue.length > 0 && (
                    <div className="notice notice-warn" role="status">
                      <span>
                        {overdue.length === 1 ? '1 bill is' : overdue.length + ' bills are'} overdue (
                        {fmt(overdue.reduce((s, b) => s + b.amount, 0))}).
                      </span>
                      <button type="button" className="text-link" onClick={() => go('Bills & calendar')}>
                        Review bills
                      </button>
                    </div>
                  )}
                  <div className="metric-grid metric-grid-three">
                    <Metric
                      label="Income this cycle"
                      value={fmt(cycleIncome)}
                      note={
                        cycleRecordedIncome > data.plan.income
                          ? 'Using what you recorded'
                          : data.plan.frequency + ' income, planned'
                      }
                      icon={ArrowDownLeft}
                      positive
                    />
                    <Metric
                      label="Spent this cycle"
                      value={fmt(cycleSpent)}
                      note={
                        Math.round((cycleSpent / Math.max(1, cycleIncome)) * 100) + '% of income this cycle'
                      }
                      icon={ArrowUpRight}
                    />
                    <Metric
                      label="Bills before payday"
                      value={fmt(reserved)}
                      note={dueBeforePayday.length + ' unpaid'}
                      icon={CalendarDays}
                    />
                  </div>
                  <div className="grid-two">
                    <section className="panel">
                      <Head
                        title="Your spending, at a glance"
                        subtitle="Daily spending over the last 7 days."
                      />
                      <div style={{ height: 230 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={Array.from({ length: 7 }, (_, i) => {
                              const d = new Date();
                              d.setDate(d.getDate() - 6 + i);
                              const k = iso(d);
                              return {
                                day: d.toLocaleDateString('en', { weekday: 'short' }),
                                spending: data.transactions
                                  .filter((t) => t.type === 'expense' && t.date === k)
                                  .reduce((s, t) => s + t.amount, 0),
                              };
                            })}
                            margin={{ top: 12, right: 4, left: -16, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="0%"
                                  stopColor={cssVar('--color-accent', '#6246ea')}
                                  stopOpacity={0.22}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={cssVar('--color-accent', '#6246ea')}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke={cssVar('--color-line', '#e4ddf4')} vertical={false} />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 13, fill: cssVar('--color-ink-muted', '#655d7d') }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 13, fill: cssVar('--color-ink-muted', '#655d7d') }}
                              tickFormatter={(v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v)}
                            />
                            <Tooltip
                              formatter={(v) => fmt(Number(v))}
                              contentStyle={{
                                border: '1px solid ' + cssVar('--color-line', '#e4ddf4'),
                                borderRadius: 9,
                                fontSize: 13,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="spending"
                              stroke={cssVar('--color-accent', '#6246ea')}
                              fill="url(#fillSpend)"
                              strokeWidth={2.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                    <section className="panel">
                      <Head
                        title="Your plan by category"
                        subtitle="Planned vs. spent this pay cycle."
                        action="Edit plan"
                        onAction={() => go('Salary planner')}
                      />
                      <div className="budget-list">
                        {Object.entries(data.plan.allocations)
                          .filter(([, v]) => v > 0)
                          .slice(0, 6)
                          .map(([cat, budget]) => {
                            const used = cycleTx
                              .filter((t) => t.type === 'expense' && t.category === cat)
                              .reduce((s, t) => s + t.amount, 0);
                            const pct = (used / Math.max(1, budget)) * 100;
                            return (
                              <div key={cat}>
                                <div className="budget-head">
                                  <strong>{cat}</strong>
                                  <span style={{ color: 'var(--muted)' }}>
                                    {fmt(used)} / {fmt(budget)}
                                  </span>
                                </div>
                                <div className="track">
                                  <div
                                    className={'fill ' + (pct > 100 ? 'over' : pct > 80 ? 'warn' : '')}
                                    style={{ width: Math.min(100, pct) + '%' }}
                                  />
                                </div>
                                <div className="budget-foot">
                                  <span>{pct > 100 ? 'Over plan' : Math.round(pct) + '% used'}</span>
                                  <span>{fmt(Math.max(0, budget - used))} left</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  </div>
                  <div className="grid-two">
                    <section className="panel">
                      <Head
                        title="Recent activity"
                        subtitle="The latest money in and money out."
                        action="All expenses"
                        onAction={() => go('Expenses')}
                      />
                      <div className="activity">
                        {[...data.transactions]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 5)
                          .map((t) => {
                            const Icon = icons[t.category] || Wallet;
                            return (
                              <Activity
                                key={t.id}
                                icon={Icon}
                                title={t.title}
                                meta={t.category + ' · ' + dateLabel(t.date)}
                                amount={(t.type === 'income' ? '+' : '−') + fmt(t.amount)}
                                positive={t.type === 'income'}
                              />
                            );
                          })}
                        {!data.transactions.length && (
                          <div className="empty">
                            No transactions yet. Add income or an expense to start tracking your money.
                          </div>
                        )}
                      </div>
                    </section>
                    <section className="panel">
                      <Head
                        title="Coming up"
                        subtitle="Unpaid bills on your radar."
                        action="View calendar"
                        onAction={() => go('Bills & calendar')}
                      />
                      {[...overdue, ...upcoming].slice(0, 4).map((b) => (
                        <div className="activity-row" key={b.id}>
                          <div className="activity-icon">
                            <CalendarDays size={16} />
                          </div>
                          <div className="activity-main">
                            <div className="activity-title">{b.title}</div>
                            <div className="activity-meta">
                              {b.dueDate < today ? 'Overdue, due ' : 'Due '}
                              {dateLabel(b.dueDate)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="amount">{fmt(b.amount)}</div>
                            <button className="text-link" onClick={() => togglePaid(b)}>
                              Mark paid
                            </button>
                          </div>
                        </div>
                      ))}
                      {!upcoming.length && !overdue.length && (
                        <div className="empty">No unpaid bills coming up.</div>
                      )}
                      <div className="divider" />
                      <div className="budget-head">
                        <strong>Savings across goals</strong>
                        <strong>{fmt(totalSaved)}</strong>
                      </div>
                      <button className="text-link" onClick={() => go('Goals & insights')}>
                        See your goals <ArrowRight size={12} />
                      </button>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
          {page === 'Salary planner' && (
            <Planner data={data} fmt={fmt} updatePlan={updatePlan} setToast={setToast} />
          )}
          {page === 'Expenses' && (
            <>
              <div className="metric-grid">
                <Metric
                  label="Transactions"
                  value={String(data.transactions.length)}
                  note="All income and expenses"
                  icon={ReceiptText}
                />
                <Metric
                  label="Recorded expenses"
                  value={fmt(spent)}
                  note="Across all dates"
                  icon={ArrowUpRight}
                />
                <Metric
                  label="Income recorded"
                  value={fmt(
                    data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                  )}
                  note="Salary and other income"
                  icon={ArrowDownLeft}
                  positive
                />
                <Metric
                  label="Filtered total"
                  value={fmt(txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                  note={txs.length + ' matching transactions'}
                  icon={Search}
                />
              </div>
              <section className="panel">
                <Head
                  title="All transactions"
                  subtitle="Record every inflow and outflow to keep your plan useful."
                />
                <div className="filters">
                  <input
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option>All categories</option>
                    {['Income', ...categories].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSearch('');
                      setFilter('All categories');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>TRANSACTION</th>
                        <th>CATEGORY</th>
                        <th>DATE</th>
                        <th>AMOUNT</th>
                        <th>TYPE</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.title}</strong>
                            {t.note && (
                              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                                {t.note}
                              </div>
                            )}
                          </td>
                          <td>{t.category}</td>
                          <td>{dateLabel(t.date)}</td>
                          <td style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--green)' : '' }}>
                            {t.type === 'income' ? '+' : '−'}
                            {fmt(t.amount)}
                          </td>
                          <td>
                            <span className={'pill ' + (t.type === 'income' ? 'paid' : '')}>
                              {t.type === 'income' ? 'Money in' : 'Money out'}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="small-btn"
                                aria-label="Print transaction receipt"
                                title="Print receipt"
                                onClick={() => printTransaction(t)}
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                className="small-btn"
                                aria-label="Edit transaction"
                                onClick={() => open('transaction', t)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="small-btn"
                                aria-label="Delete transaction"
                                onClick={() => remove('transaction', t.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!txs.length && (
                    <div className="empty">
                      No matching transactions. Try another search or add a transaction.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
          {page === 'Bills & calendar' && (
            <Bills
              data={data}
              fmt={fmt}
              showPaid={showPaid}
              setShowPaid={setShowPaid}
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              togglePaid={togglePaid}
              open={open}
              remove={remove}
            />
          )}
          {page === 'Goals & insights' && (
            <Goals data={data} fmt={fmt} open={open} remove={remove} update={setData} />
          )}
          <footer className="app-footer">
            <div className="app-footer-top">
              <a className="app-footer-brand" href="/">
                soma<span>.</span>
              </a>
              <p>Shared costs and personal plans, with your numbers and decisions in view.</p>
              <a className="app-footer-home" href="/">
                <Home size={14} /> Back to homepage <ArrowRight size={14} />
              </a>
            </div>
            <div className="app-footer-links">
              <div>
                <strong>Explore Soma</strong>
                <a href="/">Home</a>
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
              </div>
              <div>
                <strong>Information</strong>
                <a href="/terms">Terms of Service</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/legal">Legal information</a>
              </div>
            </div>
            <div className="app-footer-bottom">
              <span>© {new Date().getFullYear()} Soma. All rights reserved.</span>
              <span>Money planning tools, not financial advice.</span>
            </div>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Main">
        {nav.map((n) => (
          <button
            key={n.label}
            className={page === n.label ? 'active' : ''}
            aria-current={page === n.label ? 'page' : undefined}
            onClick={() => go(n.label)}
          >
            <n.icon />
            {n.label === 'Bills & calendar' && overdue.length > 0 && (
              <i className="mobile-dot" role="img" aria-label={overdue.length + ' overdue'} />
            )}
            <span>
              {n.label === 'Salary planner'
                ? 'Plan'
                : n.label === 'Bills & calendar'
                  ? 'Bills'
                  : n.label === 'Goals & insights'
                    ? 'Goals'
                    : n.label === 'Overview'
                      ? 'Home'
                      : n.label === 'Shared money'
                        ? 'Shared'
                        : 'Expenses'}
            </span>
          </button>
        ))}
      </nav>
      <Modal open={!!modal} onClose={closeModal} labelledBy="modal-title">
        {modal && (
          <form
            className="modal"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="modal-head">
              <div>
                <h2 id="modal-title">
                  {editing ? 'Edit ' : 'Add '}
                  {modal === 'transaction' ? 'transaction' : modal === 'bill' ? 'a bill' : 'a savings goal'}
                </h2>
              </div>
              <button type="button" className="icon-btn" onClick={closeModal} aria-label="Close">
                <X size={17} />
              </button>
            </div>
            <p>
              {modal === 'transaction'
                ? 'Record money coming in or going out. Your overview updates automatically.'
                : modal === 'bill'
                  ? 'Add a payment to keep its due date and amount in view.'
                  : 'Give a goal a target and a date to work towards.'}
            </p>
            {modal === 'transaction' && (
              <div className="form-grid">
                <Field
                  label="Description"
                  error={errors.title}
                  value={form.title}
                  onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                  placeholder="e.g. Groceries, freelance payment"
                  full
                />
                <SelectField
                  label="Type"
                  value={form.type === 'income' ? 'Money in' : 'Money out'}
                  options={['Money out', 'Money in']}
                  onChange={(v) => setForm((f) => ({ ...f, type: v === 'Money in' ? 'income' : 'expense' }))}
                />
                <Field
                  label="Amount"
                  error={errors.amount}
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  type="number"
                  placeholder="0"
                />
                <SelectField
                  label="Category"
                  value={form.category}
                  options={categories.filter((c) => c !== 'Savings')}
                  onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                />
                <Field
                  label="Date"
                  value={form.date}
                  onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                  type="date"
                />
                <Field
                  label="Note (optional)"
                  value={form.note}
                  onChange={(v) => setForm((f) => ({ ...f, note: v }))}
                  placeholder="Add a little context"
                  full
                />
              </div>
            )}
            {modal === 'bill' && (
              <div className="form-grid">
                <Field
                  label="Bill name"
                  error={errors.title}
                  value={form.title}
                  onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                  placeholder="e.g. Electricity"
                  full
                />
                <Field
                  label="Amount"
                  error={errors.amount}
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  type="number"
                  placeholder="0"
                />
                <SelectField
                  label="Category"
                  value={form.category}
                  options={categories.filter((c) => c !== 'Savings')}
                  onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                />
                <Field
                  label="Due date"
                  value={form.dueDate}
                  onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                  type="date"
                  full
                />
                <SelectField
                  label="Payment pattern"
                  value={form.recurring ? 'Repeats monthly' : 'One-off'}
                  options={['Repeats monthly', 'One-off']}
                  onChange={(v) => setForm((f) => ({ ...f, recurring: v === 'Repeats monthly' }))}
                  full
                />
              </div>
            )}
            {modal === 'goal' && (
              <div className="form-grid">
                <Field
                  label="Goal name"
                  error={errors.title}
                  value={form.title}
                  onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                  placeholder="e.g. Emergency fund"
                  full
                />
                <Field
                  label="Target amount"
                  error={errors.target}
                  value={form.target}
                  onChange={(v) => setForm((f) => ({ ...f, target: v }))}
                  type="number"
                  placeholder="0"
                />
                <Field
                  label="Already saved"
                  value={form.saved}
                  onChange={(v) => setForm((f) => ({ ...f, saved: v }))}
                  type="number"
                  placeholder="0"
                />
                <Field
                  label="Target date"
                  value={form.deadline}
                  onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
                  type="date"
                  full
                />
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="primary">
                <Check size={15} /> Save
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={prefsOpen} onClose={() => setPrefsOpen(false)} labelledBy="prefs-title">
        {prefsOpen && (
          <div className="modal">
            <div className="modal-head">
              <h2 id="prefs-title">Preferences</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPrefsOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
            <div className="form-grid">
              <SelectField
                label="Currency"
                value={data.plan.currency}
                options={currencyOptions}
                onChange={(v) => updatePlan({ currency: v })}
                full
              />
              <p className="helper full">
                Changing the currency changes the symbol only. Amounts are not converted.
              </p>
            </div>
            <h3 className="modal-subhead">Your data</h3>
            <p className="helper">
              Everything is saved in this browser on this device. Download a backup before you clear browser
              data or switch devices.
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={downloadBackup}>
                Download backup
              </button>
              <button type="button" className="primary" onClick={() => setPrefsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
      {toast && (
        <div className="toast" role="status">
          {toast}
          {undo && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                undo();
                setUndo(null);
                setToast('Restored.');
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
      {printReceipt && <ReceiptPrint transaction={printReceipt} fmt={fmt} />}
    </div>
  );
}
function ReceiptPrint({ transaction, fmt }: { transaction: Tx; fmt: (n: number) => string }) {
  return (
    <article className="print-receipt">
      <div className="receipt-brand">
        <span className="receipt-mark">
          <Wallet size={19} />
        </span>
        <span>
          soma<span className="receipt-dot">.</span>
        </span>
      </div>
      <p className="receipt-kicker">TRANSACTION RECORD</p>
      <h1>{transaction.type === 'income' ? 'Money received' : 'Payment record'}</h1>
      <p className="receipt-intro">A personal record generated from your Soma planner.</p>
      <div className="receipt-amount">
        {transaction.type === 'income' ? '+' : '−'}
        {fmt(transaction.amount)}
      </div>
      <div className="receipt-status">
        <Check size={14} /> Recorded in Soma
      </div>
      <div className="receipt-details">
        <div>
          <span>Description</span>
          <strong>{transaction.title}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{transaction.category}</strong>
        </div>
        <div>
          <span>Date</span>
          <strong>
            {new Date(transaction.date + 'T12:00:00').toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </strong>
        </div>
        <div>
          <span>Type</span>
          <strong>{transaction.type === 'income' ? 'Money in' : 'Money out'}</strong>
        </div>
        {transaction.note && (
          <div>
            <span>Note</span>
            <strong>{transaction.note}</strong>
          </div>
        )}
        <div>
          <span>Record ID</span>
          <strong>{transaction.id}</strong>
        </div>
      </div>
      <div className="receipt-footer">
        <span>SOMA · YOUR MONEY, MORE CLEARLY</span>
        <span>This is a personal record, not a bank-issued receipt or proof of payment.</span>
      </div>
    </article>
  );
}
function Metric({
  label,
  value,
  note,
  icon: Icon,
  positive = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  positive?: boolean;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <div className="metric-icon">
          <Icon size={15} />
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className={'metric-note ' + (positive ? 'positive' : '')}>{note}</div>
    </div>
  );
}
function Head({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-link" onClick={onAction}>
          {action} <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
        </button>
      )}
    </div>
  );
}
function Activity({
  icon: Icon,
  title,
  meta,
  amount,
  positive = false,
}: {
  icon: typeof Wallet;
  title: string;
  meta: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <div className="activity-row">
      <div className="activity-icon">
        <Icon size={16} />
      </div>
      <div className="activity-main">
        <div className="activity-title">{title}</div>
        <div className="activity-meta">{meta}</div>
      </div>
      <div className="amount" style={{ color: positive ? 'var(--green)' : '' }}>
        {amount}
      </div>
    </div>
  );
}
const navShort: Record<string, string> = {
  'Salary planner': 'Salary plan',
  'Bills & calendar': 'Bills',
  'Goals & insights': 'Goals',
};
function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      if (window.matchMedia('(hover: hover)').matches) {
        d.querySelector<HTMLElement>('input, select, textarea')?.focus();
      }
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal-dialog"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
function Setup({
  plan,
  onSave,
  onSkip,
  onShared,
}: {
  plan: Plan;
  onSave: (p: Partial<Plan>) => void;
  onSkip: () => void;
  onShared: () => void;
}) {
  const id = useId();
  const [currency, setCurrency] = useState(plan.currency);
  const [frequency, setFrequency] = useState<Frequency>(plan.frequency);
  const [income, setIncome] = useState('');
  const [payday, setPayday] = useState(plan.nextPayday);
  const [error, setError] = useState('');
  return (
    <section className="panel setup" aria-labelledby={id + 'h'}>
      <h2 id={id + 'h'}>Set up your plan</h2>
      <p className="helper">
        Four details give you a daily spending number. You can change any of them later.
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(income);
          if (!(n > 0)) {
            setError('Enter what you usually receive each payday.');
            return;
          }
          onSave({ currency, frequency, income: n, nextPayday: payday, setupDone: true });
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor={id + 'c'}>Currency</label>
            <select id={id + 'c'} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencyOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={id + 'f'}>How are you paid?</label>
            <select
              id={id + 'f'}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              <option value="Monthly">Monthly</option>
              <option value="Biweekly">Every two weeks</option>
              <option value="Weekly">Weekly</option>
              <option value="Irregular">It varies</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={id + 'i'}>Usual amount per payday</label>
            <input
              id={id + 'i'}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0"
              value={income}
              aria-invalid={!!error}
              aria-describedby={error ? id + 'e' : undefined}
              onChange={(e) => {
                setIncome(e.target.value);
                setError('');
              }}
            />
            {error && (
              <p className="field-error" id={id + 'e'}>
                {error}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor={id + 'd'}>Next payday</label>
            <input id={id + 'd'} type="date" value={payday} onChange={(e) => setPayday(e.target.value)} />
          </div>
        </div>
        <div className="modal-actions setup-actions">
          <button type="button" className="secondary" onClick={onSkip}>
            Skip for now
          </button>
          <button type="submit" className="primary">
            <Check size={15} /> Save and continue
          </button>
        </div>
      </form>
      <p className="helper setup-shared">
        Splitting costs with other people?{' '}
        <button type="button" className="text-link" onClick={onShared}>
          Start in Shared money
        </button>
      </p>
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  full = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  full?: boolean;
  error?: string;
}) {
  const id = useId();
  return (
    <div className={'field ' + (full ? 'full' : '')}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? 'any' : undefined}
        placeholder={placeholder}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? id + 'e' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p className="field-error" id={id + 'e'}>
          {error}
        </p>
      )}
    </div>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
  full = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  full?: boolean;
}) {
  const id = useId();
  return (
    <div className={'field ' + (full ? 'full' : '')}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
function Planner({
  data,
  fmt,
  updatePlan,
  setToast,
}: {
  data: Data;
  fmt: (n: number) => string;
  updatePlan: (p: Partial<Plan>) => void;
  setToast: (s: string) => void;
}) {
  const [income, setIncome] = useState(String(data.plan.income));
  const [frequency, setFrequency] = useState<Frequency>(data.plan.frequency);
  const [nextPayday, setNextPayday] = useState(data.plan.nextPayday);
  const [allocations, setAllocations] = useState({ ...data.plan.allocations });
  useEffect(() => {
    setIncome(String(data.plan.income));
    setFrequency(data.plan.frequency);
    setNextPayday(data.plan.nextPayday);
    setAllocations({ ...data.plan.allocations });
  }, [data.plan]);
  const total = Object.values(allocations).reduce((s, n) => s + Number(n || 0), 0);
  const inc = Number(income) || 0;
  const save = () => {
    if (inc <= 0) {
      setToast('Enter a valid income amount.');
      return;
    }
    updatePlan({
      income: inc,
      frequency,
      nextPayday,
      allocations: Object.fromEntries(
        Object.entries(allocations).map(([k, v]) => [k, Math.max(0, Number(v) || 0)]),
      ),
    });
    setToast('Salary plan saved.');
  };
  return (
    <div className="grid-two">
      <section className="panel">
        <Head
          title="Start with your income"
          subtitle="Use take-home pay. If your income varies, start with a conservative estimate."
        />
        <div className="form-grid">
          <Field label="Expected income" value={income} onChange={setIncome} type="number" />
          <div className="field">
            <label>How often do you get paid?</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Biweekly</option>
              <option>Irregular</option>
            </select>
          </div>
          <Field label="Next expected payday" value={nextPayday} onChange={setNextPayday} type="date" full />
        </div>
        <div className="divider" />
        <Head
          title="Give it a purpose"
          subtitle="Adjust your allocations. Zero is fine if a category does not apply."
        />
        {categories.map((c) => (
          <div className="allocation" key={c}>
            <div>
              <label>{c}</label>
              <div className="track" style={{ marginTop: 7 }}>
                <div
                  className="fill"
                  style={{
                    width: Math.min(100, (Number(allocations[c] || 0) / Math.max(1, inc)) * 100) + '%',
                  }}
                />
              </div>
            </div>
            <input
              aria-label={c + ' allocation'}
              type="number"
              min="0"
              value={allocations[c] ?? 0}
              onChange={(e) => setAllocations((a) => ({ ...a, [c]: Number(e.target.value) }))}
            />
          </div>
        ))}
        <div className="total-row">
          <span>Total allocated</span>
          <span style={{ color: total > inc ? 'var(--color-danger)' : 'var(--green)' }}>{fmt(total)}</span>
        </div>
        <div
          className="total-row"
          style={{
            background: total > inc ? 'var(--color-danger-soft)' : 'var(--color-ground)',
            fontWeight: 500,
          }}
        >
          <span>{total > inc ? 'Over your income' : 'Still unallocated'}</span>
          <strong>{fmt(Math.abs(inc - total))}</strong>
        </div>
        {total > inc && (
          <div className="notice">
            Your allocations exceed your expected income. Adjust them before saving.
          </div>
        )}
        <div className="modal-actions">
          <button className="primary" onClick={save}>
            <Check size={15} /> Save salary plan
          </button>
        </div>
      </section>
      <aside className="panel">
        <Head title="Your plan, at a glance" subtitle="The biggest pieces of your plan." />
        <div className="metric-value">{fmt(inc)}</div>
        <div className="metric-note">{frequency} income</div>
        <div className="divider" />
        {Object.entries(allocations)
          .filter(([, v]) => Number(v) > 0)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 8)
          .map(([k, v]) => (
            <div className="budget-head" key={k}>
              <span>{k}</span>
              <strong>{Math.round((Number(v) / Math.max(1, inc)) * 100)}%</strong>
            </div>
          ))}
        <div className="divider" />
        <p className="helper">
          For irregular income, build your baseline around a lower, realistic estimate. Add each payment as it
          arrives so your overview reflects what you actually received.
        </p>
      </aside>
    </div>
  );
}
function Bills({
  data,
  fmt,
  showPaid,
  setShowPaid,
  calendarView,
  setCalendarView,
  togglePaid,
  open,
  remove,
}: {
  data: Data;
  fmt: (n: number) => string;
  showPaid: boolean;
  setShowPaid: (v: boolean) => void;
  calendarView: boolean;
  setCalendarView: (v: boolean) => void;
  togglePaid: (b: Bill) => void;
  open: (k: 'transaction' | 'bill' | 'goal', i?: Tx | Bill | Goal) => void;
  remove: (k: 'transaction' | 'bill' | 'goal', id: string) => void;
}) {
  const bills = data.bills
    .filter((b) => showPaid || !b.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const due = data.bills
    .filter((b) => !b.paid && b.dueDate >= iso(new Date()))
    .reduce((s, b) => s + b.amount, 0);
  const [monthOffset, setMonthOffset] = useState(0);
  const todayDate = new Date();
  const first = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset, 1);
  const now = first;
  const offset = first.getDay();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  return (
    <>
      <div className="metric-grid">
        <Metric
          label="Overdue"
          value={fmt(
            data.bills
              .filter((b) => !b.paid && b.dueDate < iso(new Date()))
              .reduce((s, b) => s + b.amount, 0),
          )}
          note={
            data.bills.filter((b) => !b.paid && b.dueDate < iso(new Date())).length +
            ' unpaid past their due date'
          }
          icon={ReceiptText}
        />
        <Metric
          label="Upcoming commitments"
          value={fmt(due)}
          note="Unpaid, due today or later"
          icon={CalendarDays}
        />
        <Metric
          label="Repeating bills"
          value={String(data.bills.filter((b) => b.recurring).length)}
          note="Repeat costs to keep in view"
          icon={CreditCard}
        />
        <Metric
          label="Marked paid"
          value={fmt(data.bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0))}
          note="Recorded paid amounts"
          icon={Check}
          positive
        />
      </div>
      <section className="panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Head title="Bills & commitments" subtitle="Mark a bill paid when you have actually paid it." />
          <div style={{ display: 'flex', gap: 7 }}>
            <button className={calendarView ? 'secondary' : 'primary'} onClick={() => setCalendarView(false)}>
              List
            </button>
            <button className={calendarView ? 'primary' : 'secondary'} onClick={() => setCalendarView(true)}>
              Calendar
            </button>
            <button className="primary" onClick={() => open('bill')}>
              <Plus size={14} /> Add bill
            </button>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, margin: '14px 0' }}>
          <input type="checkbox" checked={showPaid} onChange={(e) => setShowPaid(e.target.checked)} /> Show
          bills already marked paid
        </label>
        {!calendarView ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BILL</th>
                  <th>DUE DATE</th>
                  <th>AMOUNT</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.title}</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{b.category}</div>
                    </td>
                    <td>{dateLabel(b.dueDate)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(b.amount)}</td>
                    <td>{b.recurring ? 'Repeats monthly' : 'One-off'}</td>
                    <td>
                      <span className={'pill ' + (b.paid ? 'paid' : 'due')}>
                        {b.paid ? 'Paid' : b.dueDate < iso(new Date()) ? 'Overdue' : 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="small-btn"
                          aria-label={b.paid ? 'Mark unpaid' : 'Mark paid'}
                          onClick={() => togglePaid(b)}
                        >
                          <Check size={13} />
                        </button>
                        <button className="small-btn" aria-label="Edit bill" onClick={() => open('bill', b)}>
                          <Pencil size={13} />
                        </button>
                        <button
                          className="small-btn"
                          aria-label="Delete bill"
                          onClick={() => remove('bill', b.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bills.length && (
              <div className="empty">
                No bills added yet. Add a bill to keep its due date and payment status in view.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="month-nav">
              <button
                type="button"
                className="small-btn"
                aria-label="Previous month"
                onClick={() => setMonthOffset((m) => m - 1)}
              >
                <ArrowLeft size={14} />
              </button>
              <h3>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <button
                type="button"
                className="small-btn"
                aria-label="Next month"
                onClick={() => setMonthOffset((m) => m + 1)}
              >
                <ArrowRight size={14} />
              </button>
              {monthOffset !== 0 && (
                <button type="button" className="text-link" onClick={() => setMonthOffset(0)}>
                  This month
                </button>
              )}
            </div>
            <div className="calendar">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="helper" style={{ textAlign: 'center' }}>
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                const match = data.bills.filter(
                  (b) =>
                    day > 0 &&
                    day <= days &&
                    Number(b.dueDate.slice(8, 10)) === day &&
                    b.dueDate.slice(0, 7) === iso(first).slice(0, 7),
                );
                return (
                  <div
                    key={i}
                    className={
                      'cal-cell ' +
                      (day < 1 || day > days ? 'muted' : '') +
                      (monthOffset === 0 && day === todayDate.getDate() ? ' today' : '')
                    }
                  >
                    {day > 0 && day <= days ? day : ''}
                    {match.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          marginTop: 4,
                          color: b.paid ? 'var(--color-success)' : 'var(--color-warning)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <i
                          className="bill-dot"
                          style={{ background: b.paid ? 'var(--color-success)' : '' }}
                        />
                        {b.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="helper" style={{ marginTop: 12 }}>
              The calendar shows bills due in the selected month. Use list view to edit details and update
              payment status.
            </p>
          </>
        )}
      </section>
    </>
  );
}
function Goals({
  data,
  fmt,
  open,
  remove,
  update,
}: {
  data: Data;
  fmt: (n: number) => string;
  open: (k: 'transaction' | 'bill' | 'goal', i?: Tx | Bill | Goal) => void;
  remove: (k: 'transaction' | 'bill' | 'goal', id: string) => void;
  update: Dispatch<SetStateAction<Data>>;
}) {
  const totalSaved = data.goals.reduce((s, g) => s + g.saved, 0);
  const target = data.goals.reduce((s, g) => s + g.target, 0);
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const contribute = (g: Goal) => {
    const amount = Number(contributions[g.id] || 0);
    if (amount <= 0) return;
    update((d) => ({
      ...d,
      goals: d.goals.map((x) => (x.id === g.id ? { ...x, saved: Math.min(x.target, x.saved + amount) } : x)),
    }));
    setContributions((v) => ({ ...v, [g.id]: '' }));
  };
  const top = categories
    .filter((c) => c !== 'Savings')
    .map((c) => ({
      name: c,
      amount: data.transactions
        .filter((t) => t.type === 'expense' && t.category === c)
        .reduce((s, t) => s + t.amount, 0),
      budget: data.plan.allocations[c] || 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  return (
    <>
      <div className="metric-grid">
        <Metric
          label="Saved towards goals"
          value={fmt(totalSaved)}
          note="Across all active goals"
          icon={Target}
          positive
        />
        <Metric
          label="Combined target"
          value={fmt(target)}
          note={data.goals.length + ' active goals'}
          icon={TrendingUp}
        />
        <Metric
          label="Still to go"
          value={fmt(data.goals.reduce((s, g) => s + Math.max(0, g.target - g.saved), 0))}
          note="Across tracked goals"
          icon={ArrowRight}
        />
        <Metric
          label="Income allocation"
          value={fmt(Object.values(data.plan.allocations).reduce((s, n) => s + n, 0))}
          note="Your current salary plan"
          icon={Wallet}
        />
      </div>
      <section className="panel" style={{ marginBottom: 15 }}>
        <Head
          title="Your savings goals"
          subtitle="Add contributions when you set money aside."
          action="Create a goal"
          onAction={() => open('goal')}
        />
        <div className="goal-grid">
          {data.goals.map((g) => {
            const pct = Math.min(100, (g.saved / Math.max(1, g.target)) * 100);
            return (
              <div className="goal-tile" key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="metric-icon">
                    <Target size={17} />
                  </div>
                  <button className="small-btn" aria-label="Edit goal" onClick={() => open('goal', g)}>
                    <Pencil size={13} />
                  </button>
                </div>
                <h3>{g.title}</h3>
                <p>
                  {g.category} · Target {dateLabel(g.deadline)}
                </p>
                <div className="goal-amount">{fmt(g.saved)}</div>
                <div className="goal-sub">of {fmt(g.target)} saved</div>
                <div className="track">
                  <div className="fill" style={{ width: pct + '%' }} />
                </div>
                <div className="goal-progress">
                  <span>{Math.round(pct)}% there</span>
                  <span>{fmt(Math.max(0, g.target - g.saved))} to go</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                  <input
                    aria-label={'Contribution to ' + g.title}
                    type="number"
                    min="1"
                    placeholder="Contribution amount"
                    value={contributions[g.id] || ''}
                    onChange={(e) => setContributions((v) => ({ ...v, [g.id]: e.target.value }))}
                    style={{
                      minWidth: 0,
                      width: '100%',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      padding: 8,
                      fontSize: 12,
                    }}
                  />
                  <button className="primary" style={{ padding: '8px 10px' }} onClick={() => contribute(g)}>
                    Add
                  </button>
                  <button className="small-btn" aria-label="Delete goal" onClick={() => remove('goal', g.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {!data.goals.length && (
            <div className="empty">No savings goals yet. Set a target to start tracking your progress.</div>
          )}
        </div>
      </section>
      <div className="grid-two">
        <section className="panel">
          <Head title="Spending patterns" subtitle="Categories with the highest recorded outflow." />
          {top.map((c) => (
            <div key={c.name} style={{ marginBottom: 16 }}>
              <div className="budget-head">
                <strong>{c.name}</strong>
                <span>{fmt(c.amount)}</span>
              </div>
              <div className="track">
                <div
                  className={'fill ' + (c.amount > c.budget ? 'over' : '')}
                  style={{ width: Math.min(100, (c.amount / Math.max(1, c.budget)) * 100) + '%' }}
                />
              </div>
              <div className="budget-foot">
                <span>
                  {c.amount > c.budget
                    ? 'Above plan'
                    : Math.round((c.amount / Math.max(1, c.budget)) * 100) + '% of allocation'}
                </span>
                <span>Plan: {fmt(c.budget)}</span>
              </div>
            </div>
          ))}
        </section>
        <section className="panel">
          <Head title="A small money lesson" subtitle="One useful habit to try." />
          <div className="insight">
            <div className="insight-icon">
              <Lightbulb size={17} />
            </div>
            <div>
              <h3>Plan for irregular months</h3>
              <p>
                If your income changes month to month, build your baseline around a conservative estimate.
                Treat income above that baseline as money to allocate intentionally, rather than money already
                promised to future spending.
              </p>
            </div>
          </div>
          <div className="insight">
            <div className="insight-icon">
              <TrendingUp size={17} />
            </div>
            <div>
              <h3>Small costs have a long tail</h3>
              <p>
                A {fmt(2000)} weekly expense adds up to {fmt(104000)} over a year. Seeing the yearly total can
                help you decide whether it is worth it to you.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Dashboard;
