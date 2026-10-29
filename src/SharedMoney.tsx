import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { ArrowDownLeft, ArrowLeftRight, Check, Copy, HeartHandshake, LogIn, LogOut, Mail, Plus, RefreshCw, ShieldCheck, Users, Wallet } from 'lucide-react';
import './shared-money.css';

type Space = { id: string; name: string; currency: string; created_by: string };
type Member = { user_id: string; email: string; role: string };
type Expense = { id: string; space_id: string; title: string; amount: number; category: string; expense_date: string; paid_by: string; payer_email?: string; splits?: Split[] };
type Split = { id: string; expense_id: string; user_id: string; email?: string; amount: number };
type Invitation = { id: string; space_id: string; email: string; token: string; accepted_at: string | null; space?: Space };
type Settlement = { id: string; space_id: string; payer_id: string; payee_id: string; amount: number; note: string | null; settled_on: string; payer_email?: string; payee_email?: string };
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (value: string) => new Date(value + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const amount = (value: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
const moneyId = () => Math.random().toString(36).slice(2, 10);

export default function SharedMoney() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [spaceName, setSpaceName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Groceries');
  const [expenseDate, setExpenseDate] = useState(today());
  const [paidBy, setPaidBy] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [expenseNote, setExpenseNote] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [view, setView] = useState<'overview' | 'expenses' | 'people' | 'settlements'>('overview');
  const [inviteToken, setInviteToken] = useState('');

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadSpaces = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from('shared_members').select('space_id, shared_spaces(id,name,currency,created_by)').eq('user_id', user.id);
    if (error) { setMessage(error.message); return; }
    const found = (data ?? []).map((row: any) => row.shared_spaces).filter(Boolean) as Space[];
    setSpaces(found);
    if (!spaceId && found.length) setSpaceId(found[0].id);
    if (spaceId && !found.some(s => s.id === spaceId)) setSpaceId(found[0]?.id ?? '');
  }, [user, spaceId]);

  const loadSpaceData = useCallback(async () => {
    if (!supabase || !user || !spaceId) { setMembers([]); setExpenses([]); setSettlements([]); return; }
    const [m, e, st] = await Promise.all([
      supabase.from('shared_members').select('user_id,email,role').eq('space_id', spaceId),
      supabase.from('shared_expenses').select('id,space_id,title,amount,category,expense_date,paid_by').eq('space_id', spaceId).order('expense_date', { ascending: false }),
      supabase.from('shared_settlements').select('id,space_id,payer_id,payee_id,amount,note,settled_on').eq('space_id', spaceId).order('settled_on', { ascending: false })
    ]);
    if (m.error || e.error || st.error) { setMessage(m.error?.message || e.error?.message || st.error?.message || 'Could not load this shared space.'); return; }
    const memberRows = (m.data ?? []) as Member[];
    setMembers(memberRows);
    const expenseRows = (e.data ?? []) as Expense[];
    const ids = expenseRows.map(x => x.id);
    const splitResult = ids.length ? await supabase.from('shared_expense_splits').select('id,expense_id,user_id,amount').in('expense_id', ids) : { data: [], error: null };
    if (splitResult.error) { setMessage(splitResult.error.message); return; }
    const emailById = new Map(memberRows.map(x => [x.user_id, x.email]));
    setExpenses(expenseRows.map(x => ({ ...x, payer_email: emailById.get(x.paid_by) ?? 'Member', splits: (splitResult.data ?? []).filter((s: Split) => s.expense_id === x.id).map((s: Split) => ({ ...s, email: emailById.get(s.user_id) ?? 'Member' })) })));
    setSettlements(((st.data ?? []) as Settlement[]).map(x => ({ ...x, payer_email: emailById.get(x.payer_id) ?? 'Member', payee_email: emailById.get(x.payee_id) ?? 'Member' })));
  }, [user, spaceId]);

  const loadInvitations = useCallback(async () => {
    if (!supabase || !user?.email) return;
    const { data, error } = await supabase.from('shared_invitations').select('id,space_id,email,token,accepted_at,shared_spaces(id,name,currency,created_by)').eq('email', user.email.toLowerCase()).is('accepted_at', null);
    if (error) { setMessage(error.message); return; }
    setInvitations((data ?? []).map((x: any) => ({ ...x, space: x.shared_spaces })));
  }, [user]);

  useEffect(() => { void loadSpaces(); void loadInvitations(); }, [loadSpaces, loadInvitations]);
  useEffect(() => { void loadSpaceData(); }, [loadSpaceData]);
  useEffect(() => { const token = new URLSearchParams(window.location.search).get('invite'); if (token) setInviteToken(token); }, []);

  const notify = (text: string) => setMessage(text);
  const run = async (work: () => Promise<void>) => { setBusy(true); setMessage(''); try { await work(); } catch (error) { notify(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); } finally { setBusy(false); } };
  const authenticate = () => run(async () => {
    if (!supabase) return;
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (result.error) throw result.error;
    if (authMode === 'signup' && !result.data.session) notify('Check your email for the confirmation link, then come back to sign in.');
    else { setUser(result.data.user); notify(authMode === 'signup' ? 'Account created. You can start a shared space.' : 'You are signed in.'); }
  });

  const createSpace = () => run(async () => {
    if (!supabase || !user) return;
    const name = spaceName.trim();
    if (!name) throw new Error('Give your shared space a name.');
    const { data: created, error } = await supabase.from('shared_spaces').insert({ name, currency, created_by: user.id }).select('id,name,currency,created_by').single();
    if (error) throw error;
    const { error: memberError } = await supabase.from('shared_members').insert({ space_id: created.id, user_id: user.id, email: user.email?.toLowerCase(), role: 'owner' });
    if (memberError) throw memberError;
    setSpaces(prev => [...prev, created as Space]); setSpaceId(created.id); setSpaceName(''); setView('overview'); notify('Shared space created.');
  });

  const sendInvite = () => run(async () => {
    if (!supabase || !user || !spaceId) return;
    const target = inviteEmail.trim().toLowerCase();
    if (!target || !target.includes('@')) throw new Error('Enter a valid email address.');
    if (target === user.email?.toLowerCase()) throw new Error('You are already in this space.');
    const { data: existing } = await supabase.from('shared_members').select('user_id').eq('space_id', spaceId).eq('email', target).maybeSingle();
    if (existing) throw new Error('That person is already a member.');
    const { data: invite, error } = await supabase.from('shared_invitations').insert({ space_id: spaceId, email: target, invited_by: user.id }).select('token').single();
    if (error) throw error;
    const link = window.location.origin + '/app?invite=' + invite.token;
    setInviteLink(link); setInviteEmail(''); notify('Invitation created. Share the private link with the invited email address.');
  });

  const acceptInvite = () => run(async () => {
    if (!supabase || !user?.email || !inviteToken) return;
    const { data: invitation, error } = await supabase.from('shared_invitations').select('id,space_id,email,accepted_at').eq('token', inviteToken).single();
    if (error) throw new Error('Invitation not found or you do not have access to it.');
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) throw new Error('Sign in with the email address this invitation was sent to.');
    if (invitation.accepted_at) throw new Error('This invitation has already been accepted.');
    const { error: updateError } = await supabase.from('shared_invitations').update({ accepted_at: new Date().toISOString(), accepted_by: user.id }).eq('id', invitation.id);
    if (updateError) throw updateError;
    const { error: memberError } = await supabase.from('shared_members').insert({ space_id: invitation.space_id, user_id: user.id, email: user.email.toLowerCase(), role: 'member' });
    if (memberError) throw memberError;
    setInviteToken(''); window.history.replaceState({}, '', '/app'); setSpaceId(invitation.space_id); await loadSpaces(); await loadSpaceData(); await loadInvitations(); notify('You joined the shared space.');
  });

  const saveExpense = () => run(async () => {
    if (!supabase || !user || !spaceId) return;
    const total = Number(expenseAmount);
    if (!expenseTitle.trim() || !Number.isFinite(total) || total <= 0) throw new Error('Enter an expense description and an amount greater than zero.');
    const participants = Array.from(new Set([user.id, ...selectedPeople]));
    const { data: expense, error } = await supabase.from('shared_expenses').insert({ space_id: spaceId, title: expenseTitle.trim(), amount: total, category: expenseCategory, expense_date: expenseDate, paid_by: paidBy || user.id, created_by: user.id, note: expenseNote.trim() || null }).select('id').single();
    if (error) throw error;
    const share = Math.round((total / participants.length) * 100) / 100;
    const splits = participants.map((id, index) => ({ expense_id: expense.id, user_id: id, amount: index === participants.length - 1 ? Math.round((total - share * (participants.length - 1)) * 100) / 100 : share }));
    const { error: splitError } = await supabase.from('shared_expense_splits').insert(splits);
    if (splitError) { await supabase.from('shared_expenses').delete().eq('id', expense.id); throw splitError; }
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNote(''); setSelectedPeople([]); setPaidBy(user.id);
    await loadSpaceData(); setView('expenses'); notify('Expense added and split equally.');
  });

  const saveSettlement = () => run(async () => {
    if (!supabase || !user || !spaceId) return;
    const value = Number(settleAmount);
    if (!settleTo || settleTo === user.id || !Number.isFinite(value) || value <= 0) throw new Error('Choose another member and enter a valid amount.');
    const { error } = await supabase.from('shared_settlements').insert({ space_id: spaceId, payer_id: user.id, payee_id: settleTo, amount: value, note: settleNote.trim() || null, settled_on: today(), created_by: user.id });
    if (error) throw error;
    setSettleAmount(''); setSettleNote(''); await loadSpaceData(); notify('Settlement recorded. This records a payment; it does not move money.');
  });

  const balanceRows = useMemo(() => {
    const totals = new Map(members.map(m => [m.user_id, 0]));
    expenses.forEach(e => {
      totals.set(e.paid_by, (totals.get(e.paid_by) ?? 0) + Number(e.amount));
      (e.splits ?? []).forEach(s => totals.set(s.user_id, (totals.get(s.user_id) ?? 0) - Number(s.amount)));
    });
    settlements.forEach(s => { totals.set(s.payer_id, (totals.get(s.payer_id) ?? 0) - Number(s.amount)); totals.set(s.payee_id, (totals.get(s.payee_id) ?? 0) + Number(s.amount)); });
    return members.map(m => ({ ...m, balance: Math.round((totals.get(m.user_id) ?? 0) * 100) / 100 }));
  }, [members, expenses, settlements]);
  const selectedSpace = spaces.find(s => s.id === spaceId);
  const totalExpenses = expenses.reduce((sum, x) => sum + Number(x.amount), 0);
  const myBalance = balanceRows.find(x => x.user_id === user?.id)?.balance ?? 0;
  const currencyCode = selectedSpace?.currency ?? currency;
  const debts = useMemo(() => {
    const debtors = balanceRows.filter(x => x.balance < -0.005).map(x => ({ ...x, remaining: -x.balance }));
    const creditors = balanceRows.filter(x => x.balance > 0.005).map(x => ({ ...x, remaining: x.balance }));
    const result: { from: string; to: string; amount: number }[] = [];
    debtors.forEach(debtor => creditors.forEach(creditor => {
      if (debtor.remaining < 0.005 || creditor.remaining < 0.005) return;
      const value = Math.min(debtor.remaining, creditor.remaining);
      result.push({ from: debtor.user_id, to: creditor.user_id, amount: Math.round(value * 100) / 100 });
      debtor.remaining -= value; creditor.remaining -= value;
    }));
    return result;
  }, [balanceRows]);

  if (!supabase) return <section className="shared-page"><div className="shared-topline"><span className="shared-icon"><Users size={19}/></span><span>PAYDAY / SHARED MONEY</span></div><div className="shared-setup"><div className="shared-kicker">ONE HOUSEHOLD. ONE CLEAR PICTURE.</div><h1>Make shared expenses feel less complicated.</h1><p>Payday Shared Money brings partners and households onto the same page about bills, everyday spending and who owes what.</p><div className="shared-feature-grid"><div><Wallet/><strong>Shared expense ledger</strong><span>Record household costs and see each person's share.</span></div><div><ArrowLeftRight/><strong>Clear balances</strong><span>See who should pay whom, then record settlements.</span></div><div><ShieldCheck/><strong>Private by design</strong><span>Each shared space is protected by account-based access rules.</span></div></div><div className="shared-config-note"><strong>One setup step remains</strong><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your deployment environment, then run the SQL migration at <code>supabase/migrations/202610290001_shared_money.sql</code> in your Supabase project.</p><p>Cloud sharing is intentionally disabled until the database and access policies are configured.</p></div></div></section>;

  if (authLoading) return <section className="shared-page"><div className="shared-loading"><RefreshCw className="spin"/><span>Opening your shared money space…</span></div></section>;
  if (!user) return <section className="shared-page"><div className="shared-topline"><span className="shared-icon"><Users size={19}/></span><span>PAYDAY / SHARED MONEY</span></div><div className="shared-auth-layout"><div className="shared-auth-copy"><div className="shared-kicker">MONEY WORKS BETTER WHEN IT'S SHARED CLEARLY</div><h1>Less “who paid last?” More being on the same page.</h1><p>Track the household bills, split shared costs and keep an honest running balance with the people you live with.</p><div className="shared-trust"><ShieldCheck size={17}/> Your private money stays separate from shared spaces.</div></div><form className="shared-auth-card" onSubmit={e => { e.preventDefault(); void authenticate(); }}><div className="shared-kicker">{authMode === 'signup' ? 'GET STARTED' : 'WELCOME BACK'}</div><h2>{authMode === 'signup' ? 'Create your Payday account' : 'Sign in to Payday'}</h2><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters"/></label><button className="shared-primary" disabled={busy} type="submit"><LogIn size={16}/>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button><button className="shared-switch" type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'New to Payday? Create an account'}</button>{message && <p className="shared-message" role="status">{message}</p>}</form></div></section>;

  return <section className="shared-page">
    <div className="shared-topline"><span className="shared-icon"><Users size={19}/></span><span>PAYDAY / SHARED MONEY</span><span className="shared-top-spacer"/><span className="shared-account">{user.email}</span><button className="shared-quiet-button" onClick={() => void supabase.auth.signOut()}><LogOut size={14}/> Sign out</button></div>
    {inviteToken && <div className="shared-invite-banner"><div><strong>You have a shared-space invitation.</strong><span>Accept it to join the household using this account.</span></div><button className="shared-primary compact" onClick={() => void acceptInvite()} disabled={busy}>Accept invitation</button></div>}
    {message && <div className="shared-message shared-flash" role="status">{message}</div>}
    <div className="shared-heading"><div><div className="shared-kicker">MAKE ROOM FOR SHARED LIFE</div><h1>Money is easier when everyone is on the same page.</h1><p>Keep household spending visible, split costs fairly and settle balances without mental maths.</p></div><button className="shared-quiet-button" onClick={() => { void loadSpaces(); void loadSpaceData(); void loadInvitations(); }}><RefreshCw size={14}/> Refresh</button></div>
    {invitations.length > 0 && <div className="shared-pending"><Mail size={17}/><div><strong>{invitations.length} invitation{invitations.length === 1 ? '' : 's'} waiting</strong><span>Open the private invitation link from the person who invited you to join.</span></div></div>}
    <div className="shared-workspace">
      <aside className="shared-space-rail"><div className="shared-section-label">YOUR SHARED SPACES</div>{spaces.map(s => <button key={s.id} className={'shared-space-choice ' + (s.id === spaceId ? 'active' : '')} onClick={() => { setSpaceId(s.id); setInviteLink(''); }}><span className="shared-space-avatar"><HeartHandshake size={16}/></span><span><strong>{s.name}</strong><small>{s.currency} · {members.length || 'Shared'} members</small></span></button>)}{!spaces.length && <p className="shared-empty-small">Your shared spaces will appear here.</p>}<div className="shared-create-space"><strong>Start a shared space</strong><input value={spaceName} onChange={e => setSpaceName(e.target.value)} placeholder="e.g. Our household"/><select value={currency} onChange={e => setCurrency(e.target.value)}><option value="NGN">Nigerian naira (NGN)</option><option value="USD">US dollar (USD)</option><option value="GBP">Pound sterling (GBP)</option><option value="GHS">Ghanaian cedi (GHS)</option><option value="KES">Kenyan shilling (KES)</option><option value="EUR">Euro (EUR)</option></select><button className="shared-primary" onClick={() => void createSpace()} disabled={busy}><Plus size={15}/> Create space</button></div></aside>
      <div className="shared-main">
      {!selectedSpace ? <div className="shared-empty-state"><span className="shared-empty-art"><Users size={26}/></span><h2>Start with the people you share life with.</h2><p>Create a space for your household, invite your partner or housemates, then start recording shared costs.</p></div> : <>
        <div className="shared-space-heading"><div><span className="shared-live-dot"/> SHARED SPACE<h2>{selectedSpace.name}</h2><p>{members.length} member{members.length === 1 ? '' : 's'} · Created for real-life costs, not perfect spreadsheets.</p></div><button className="shared-quiet-button" onClick={() => setView('people')}><Users size={15}/> Manage people</button></div>
        <nav className="shared-tabs" aria-label="Shared money sections">{([{id:'overview',label:'Overview'},{id:'expenses',label:'Expenses'},{id:'people',label:'People & invites'},{id:'settlements',label:'Settle up'}] as const).map(tab => <button key={tab.id} className={view === tab.id ? 'active' : ''} onClick={() => setView(tab.id)}>{tab.label}</button>)}</nav>
        {view === 'overview' && <>
          <div className="shared-metrics"><div className="shared-metric dark"><span>Shared spending</span><strong>{amount(totalExpenses, currencyCode)}</strong><small>{expenses.length} recorded expenses</small></div><div className="shared-metric"><span>Your current position</span><strong className={myBalance >= 0 ? 'good' : 'warn'}>{myBalance > 0.005 ? 'You are owed ' : myBalance < -0.005 ? 'You owe ' : ''}{amount(Math.abs(myBalance), currencyCode)}</strong><small>{Math.abs(myBalance) < 0.005 ? 'You are all settled up' : 'Based on recorded expenses and settlements'}</small></div><div className="shared-metric"><span>People in this space</span><strong>{members.length}</strong><small>Everyone sees the same shared ledger</small></div></div>
          <div className="shared-content-grid"><section className="shared-card"><div className="shared-card-heading"><div><span className="shared-section-label">RECENT ACTIVITY</span><h3>Where the money went</h3></div><button className="shared-text-button" onClick={() => setView('expenses')}>All expenses →</button></div>{expenses.slice(0,5).map(e => <div className="shared-expense-row" key={e.id}><span className="shared-expense-icon"><Wallet size={16}/></span><div className="shared-row-copy"><strong>{e.title}</strong><small>{e.category} · {shortDate(e.expense_date)} · paid by {e.payer_email}</small></div><strong className="shared-row-amount">{amount(Number(e.amount), currencyCode)}</strong></div>)}{!expenses.length && <p className="shared-empty-small">Your first shared expense will show up here.</p>}</section><section className="shared-card"><div className="shared-card-heading"><div><span className="shared-section-label">BALANCES</span><h3>Who is up, who is down</h3></div><button className="shared-text-button" onClick={() => setView('settlements')}>Settle up →</button></div>{balanceRows.map(m => <div className="shared-balance-row" key={m.user_id}><span className="shared-person-avatar">{(m.email || '?').slice(0,1).toUpperCase()}</span><div className="shared-row-copy"><strong>{m.user_id === user.id ? 'You' : m.email}</strong><small>{Math.abs(m.balance) < 0.005 ? 'All settled' : m.balance > 0 ? 'Owed money' : 'Owes money'}</small></div><strong className={m.balance >= 0 ? 'good' : 'warn'}>{m.balance > 0.005 ? '+' : m.balance < -0.005 ? '−' : ''}{amount(Math.abs(m.balance), currencyCode)}</strong></div>)}{!members.length && <p className="shared-empty-small">Invite someone to start sharing costs.</p>}</section></div>
          <section className="shared-card shared-quick-add"><div><span className="shared-section-label">QUICK ACTION</span><h3>Did someone pay for something shared?</h3><p>Add the amount, choose who was included, and Payday will calculate each person's share.</p></div><button className="shared-primary" onClick={() => setView('expenses')}><Plus size={15}/> Add an expense</button></section>
        </>}
        {view === 'expenses' && <div className="shared-content-grid shared-expense-layout"><section className="shared-card"><div className="shared-card-heading"><div><span className="shared-section-label">SHARED LEDGER</span><h3>Everyday costs, all in one place</h3></div><span className="shared-count">{expenses.length} entries</span></div>{expenses.map(e => <div className="shared-expense-row" key={e.id}><span className="shared-expense-icon"><Wallet size={16}/></span><div className="shared-row-copy"><strong>{e.title}</strong><small>{e.category} · {shortDate(e.expense_date)} · paid by {e.payer_email}</small><small>{(e.splits || []).map(s => (s.user_id === user.id ? 'You' : s.email) + ': ' + amount(Number(s.amount), currencyCode)).join(' · ')}</small></div><strong className="shared-row-amount">{amount(Number(e.amount), currencyCode)}</strong></div>)}{!expenses.length && <p className="shared-empty-small">Nothing here yet. Add your first household expense.</p>}</section>
          <section className="shared-card shared-form-card"><span className="shared-section-label">NEW EXPENSE</span><h3>Log a shared cost</h3><p className="shared-form-intro">Splits are equal between the person who paid and the people you select.</p><form onSubmit={e => { e.preventDefault(); void saveExpense(); }}><label>What was it for?<input value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} required placeholder="e.g. Electricity bill"/></label><div className="shared-form-pair"><label>Amount ({currencyCode})<input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required placeholder="0.00"/></label><label>Date<input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required/></label></div><label>Category<select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>{['Housing','Groceries','Utilities','Internet','Subscriptions','Transport','Household supplies','Eating out','Other'].map(x => <option key={x}>{x}</option>)}</select></label><label>Who paid?<select value={paidBy || user.id} onChange={e => setPaidBy(e.target.value)}>{members.map(m => <option key={m.user_id} value={m.user_id}>{m.user_id === user.id ? 'You' : m.email}</option>)}</select></label><fieldset className="shared-participant-field"><legend>Split with (including you)</legend>{members.map(m => <label className="shared-check-row" key={m.user_id}><input type="checkbox" checked={m.user_id === user.id || selectedPeople.includes(m.user_id)} disabled={m.user_id === user.id} onChange={e => setSelectedPeople(prev => e.target.checked ? [...prev, m.user_id] : prev.filter(id => id !== m.user_id))}/><span>{m.user_id === user.id ? 'You' : m.email}</span></label>)}</fieldset><label>Note (optional)<input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="Anything to remember?"/></label><button className="shared-primary" disabled={busy} type="submit"><Plus size={15}/> {busy ? 'Saving…' : 'Add expense and split'}</button></form></section></div>}
        {view === 'people' && <div className="shared-content-grid"><section className="shared-card"><div className="shared-card-heading"><div><span className="shared-section-label">YOUR HOUSEHOLD</span><h3>People in this space</h3></div><span className="shared-count">{members.length} members</span></div>{members.map(m => <div className="shared-person-row" key={m.user_id}><span className="shared-person-avatar">{(m.email || '?').slice(0,1).toUpperCase()}</span><div className="shared-row-copy"><strong>{m.user_id === user.id ? 'You' : m.email}</strong><small>{m.role === 'owner' ? 'Space owner' : 'Member'}</small></div><span className="shared-member-pill">{m.role}</span></div>)}</section><section className="shared-card shared-form-card"><span className="shared-section-label">BRING SOMEONE IN</span><h3>Invite your partner or housemate</h3><p className="shared-form-intro">The invite link only works for the email address you enter here.</p><form onSubmit={e => { e.preventDefault(); void sendInvite(); }}><label>Their email address<input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="partner@example.com"/></label><button className="shared-primary" type="submit" disabled={busy}><Mail size={15}/> Create invitation link</button></form>{inviteLink && <div className="shared-link-box"><strong>Private invitation link</strong><p>Send this link to the invited person. They must sign in using the matching email address.</p><code>{inviteLink}</code><button className="shared-quiet-button" onClick={() => { void navigator.clipboard.writeText(inviteLink); notify('Invitation link copied.'); }}><Copy size={14}/> Copy link</button></div>}</section></div>}
        {view === 'settlements' && <div className="shared-content-grid"><section className="shared-card"><div className="shared-card-heading"><div><span className="shared-section-label">SUGGESTED SETTLEMENTS</span><h3>A simpler way to square things up</h3></div></div><p className="shared-form-intro">These suggestions net the recorded balances. They are recommendations, not payments.</p>{debts.map((d, i) => <div className="shared-settle-suggestion" key={i}><div><strong>{d.from === user.id ? 'You' : members.find(m => m.user_id === d.from)?.email} <span>pays</span> {d.to === user.id ? 'you' : members.find(m => m.user_id === d.to)?.email}</strong><small>Suggested from the current ledger balance</small></div><strong>{amount(d.amount, currencyCode)}</strong><button className="shared-text-button" onClick={() => { setSettleTo(d.to); setSettleAmount(String(d.amount)); }}>Record</button></div>)}{!debts.length && <div className="shared-empty-state small"><Check size={23}/><h3>Everyone is settled up.</h3><p>Once shared expenses are recorded, any outstanding balances will appear here.</p></div>}</section><section className="shared-card shared-form-card"><span className="shared-section-label">RECORD A SETTLEMENT</span><h3>Log a payment between members</h3><p className="shared-form-intro">Use this after the money has actually changed hands. Payday records the settlement but does not transfer funds.</p><form onSubmit={e => { e.preventDefault(); void saveSettlement(); }}><label>Paid to<select value={settleTo} onChange={e => setSettleTo(e.target.value)} required><option value="">Choose a member</option>{members.filter(m => m.user_id !== user.id).map(m => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}</select></label><label>Amount ({currencyCode})<input type="number" min="0.01" step="0.01" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} required placeholder="0.00"/></label><label>Note (optional)<input value={settleNote} onChange={e => setSettleNote(e.target.value)} placeholder="e.g. Transfer for groceries"/></label><button className="shared-primary" disabled={busy} type="submit"><Check size={15}/> Record settlement</button></form><div className="shared-settlement-history"><h4>Recent settlements</h4>{settlements.slice(0,6).map(s => <div className="shared-history-row" key={s.id}><span>{s.payer_id === user.id ? 'You' : s.payer_email} paid {s.payee_id === user.id ? 'you' : s.payee_email}</span><strong>{amount(Number(s.amount), currencyCode)}</strong><small>{shortDate(s.settled_on)}</small></div>)}{!settlements.length && <p className="shared-empty-small">Settlements you record will appear here.</p>}</div></section></div>}
      </>}
      </div>
    </div>
    <p className="shared-footnote"><ShieldCheck size={14}/> Shared Money is a record-keeping tool. It does not connect to bank accounts or move money. Balances depend on the expenses, splits and settlements members record.</p>
  </section>;
}
