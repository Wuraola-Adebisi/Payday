import { useState } from 'react';
import { ArrowRight, Menu, Wallet, X } from 'lucide-react';
import './public-home.css';

type PublicPage = 'home' | 'about' | 'contact' | 'terms' | 'privacy' | 'legal';
const pages: Record<Exclude<PublicPage,'home'>,{title:string;intro:string}> = {
  about:{title:'Money is personal. Your plan should be too.',intro:'Payday helps you and the people you share life with get on the same page about money, from household bills and everyday costs to personal budgets and savings goals.'},
  contact:{title:'Tell us what would make Payday better.',intro:'Questions, feedback or a problem with Payday? Send us a note. Your message opens in your email app so you can review it before sending.'},
  terms:{title:'Terms of Service',intro:"The terms that apply when you use Payday's personal and shared money-planning tools."},
  privacy:{title:'Privacy Policy',intro:'Here is what Payday currently stores, where it is stored, and what happens when you use its personal planner and local shared-expense workspace.'},
  legal:{title:'Legal information',intro:'Important information about Payday, its scope, and how to use it responsibly.'}
};
const photos={
  coffee:'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=85'
};
function Brand(){return <a className="site-brand" href="/" aria-label="Payday home"><span className="site-brand-mark"><Wallet size={20}/></span>payday<span className="brand-dot">.</span></a>}
function Footer(){return <footer className="site-footer"><div className="site-footer-main"><div className="footer-brand-col"><Brand/><p>Split shared costs. Plan your own money.</p></div><div className="footer-col"><h4>Explore</h4><a href="/#how-it-works">How it works</a><a href="/#features">Features</a><a href="/#faq">FAQ</a><a href="/about">About</a><a href="/app">Open Payday</a></div><div className="footer-col"><h4>Contact</h4><a href="/contact">Send a message</a><a href="/contact#feedback">Share feedback</a></div><div className="footer-col"><h4>Legal</h4><a href="/terms">Terms of Service</a><a href="/privacy">Privacy Policy</a><a href="/legal">Legal information</a></div></div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} Payday. All rights reserved.</span><span>A planning tool, not a bank or financial adviser.</span></div></footer>}
function Header(){const [menu,setMenu]=useState(false);return <header className="site-header"><div className="site-header-inner"><Brand/><nav className={menu?'site-nav is-open':'site-nav'}><a href="/#how-it-works" onClick={()=>setMenu(false)}>How it works</a><a href="/#features" onClick={()=>setMenu(false)}>Features</a><a href="/#faq" onClick={()=>setMenu(false)}>FAQ</a><a href="/about" onClick={()=>setMenu(false)}>About</a><a href="/contact" onClick={()=>setMenu(false)}>Contact</a><a className="site-login" href="/app">Open Payday <ArrowRight size={15}/></a></nav><div className="header-actions"><a className="header-login" href="/app">Open Payday <ArrowRight size={15}/></a><button className="site-menu-btn" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={21}/>:<Menu size={21}/>}</button></div></div></header>}
type Currency = { code: string; label: string; min: number; max: number; step: number; start: number };
const currencies: Currency[] = [
  { code: 'USD', label: '$ USD', min: 10, max: 300, step: 5, start: 90 },
  { code: 'EUR', label: '€ EUR', min: 10, max: 300, step: 5, start: 90 },
  { code: 'GBP', label: '£ GBP', min: 10, max: 300, step: 5, start: 75 },
  { code: 'NGN', label: '₦ NGN', min: 10000, max: 300000, step: 5000, start: 60000 },
  { code: 'GHS', label: 'GH₵ GHS', min: 100, max: 3000, step: 50, start: 900 },
  { code: 'KES', label: 'KSh KES', min: 1000, max: 30000, step: 500, start: 9000 }
];
const demoNames = ['You', 'Sam', 'Jo', 'Ari', 'Kai', 'Rue'];
const splitCents = (total: number, n: number) => {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i >= n - extra ? 1 : 0));
};

function SplitDemo() {
  const [code, setCode] = useState('USD');
  const [amount, setAmount] = useState(90);
  const [people, setPeople] = useState(3);
  const cur = currencies.find(c => c.code === code) ?? currencies[0];
  const total = Math.round(amount * 100);
  const shares = splitCents(total, people);
  const whole = total % 100 === 0 && shares.every(s => s % 100 === 0);
  const money = (cents: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: code, currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2
  }).format(cents / 100);
  const fill = ((amount - cur.min) / (cur.max - cur.min)) * 100;
  const pickCurrency = (next: string) => {
    const c = currencies.find(x => x.code === next) ?? currencies[0];
    setCode(c.code);
    setAmount(c.start);
  };
  return (
    <div className="hm-demo" role="group" aria-labelledby="hm-demo-title">
      <div className="hm-demo-head">
        <h2 id="hm-demo-title">Try a split</h2>
        <label className="hm-select">
          <span className="sr-only">Currency</span>
          <select value={code} onChange={e => pickCurrency(e.target.value)}>
            {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </label>
      </div>
      <div className="hm-field">
        <div className="hm-field-row">
          <label htmlFor="hm-bill">Bill total</label>
          <output htmlFor="hm-bill" className="hm-amount">{money(total)}</output>
        </div>
        <input id="hm-bill" className="hm-range" type="range" min={cur.min} max={cur.max} step={cur.step}
          value={amount} onChange={e => setAmount(Number(e.target.value))}
          style={{ ['--fill' as string]: fill + '%' }} aria-valuetext={money(total)} />
      </div>
      <fieldset className="hm-people">
        <legend>Split between</legend>
        <div className="hm-people-buttons">
          {[2, 3, 4, 5, 6].map(n => (
            <button key={n} type="button" aria-pressed={people === n} onClick={() => setPeople(n)}>{n}</button>
          ))}
        </div>
      </fieldset>
      <div className="hm-result" aria-live="polite">
        <p className="hm-result-lead">You paid the bill. Everyone else owes you their share.</p>
        <ul className="hm-rows">
          <li key={'p0-' + people} className="hm-row hm-row-payer">
            <span className="hm-dot hm-dot-violet" aria-hidden="true" />
            <span className="hm-row-name">You<small>Gets back</small></span>
            <b>{money(total - shares[0])}</b>
          </li>
          {shares.slice(1).map((s, i) => (
            <li key={demoNames[i + 1] + '-' + people} className="hm-row">
              <span className={'hm-dot hm-dot-' + ['coral', 'lime', 'lilac', 'coral', 'lime'][i]} aria-hidden="true" />
              <span className="hm-row-name">{demoNames[i + 1]}<small>Owes you</small></span>
              <b>{money(s)}</b>
            </li>
          ))}
        </ul>
      </div>
      <p className="hm-demo-note">Shared spaces in Payday split each expense equally between the people you pick.</p>
    </div>
  );
}

function Home() {
  return (
    <>
      <section className="hm-hero">
        <div className="hm-wrap hm-hero-grid">
          <div className="hm-hero-copy">
            <h1>Split costs with your people. <span>Budget on your own.</span></h1>
            <p className="hm-lead">Log the rent and the groceries, see who paid, and settle up without the group chat math. Your own budget, bills and savings goals live in the same app, kept apart from the shared stuff.</p>
            <div className="hm-actions">
              <a className="site-cta" href="/app">Start a shared space <ArrowRight size={17} /></a>
              <a className="hm-link" href="#how-it-works">See how it works</a>
            </div>
            <p className="hm-fine">No sign-up. Your data stays in this browser.</p>
          </div>
          <SplitDemo />
        </div>
      </section>

      <section className="hm-section" id="how-it-works">
        <div className="hm-wrap">
          <h2 className="hm-h2">Shared costs stay shared. Your money stays yours.</h2>
          <div className="hm-modes">
            <article className="hm-mode">
              <h3>Shared spaces</h3>
              <p>Make a space for your apartment, a trip or a couple. Add what each person paid. Payday keeps a running balance and suggests who should pay whom.</p>
              <div className="hm-ex hm-ex-lilac" role="group" aria-label="Example shared space, split equally between two people">
                <span className="hm-ex-tag">Example</span>
                <ul>
                  <li><span>Groceries<small>Sam paid</small></span><b>$64.20</b></li>
                  <li><span>Internet<small>You paid</small></span><b>$40.00</b></li>
                </ul>
                <div className="hm-ex-total"><span>Balance</span><strong>You owe Sam $12.10</strong></div>
              </div>
            </article>
            <article className="hm-mode">
              <h3>Your own plan</h3>
              <p>Set a budget around your income, keep bills and due dates in view and save toward goals. None of it mixes into shared totals.</p>
              <div className="hm-ex hm-ex-lime" role="group" aria-label="Example personal budget">
                <span className="hm-ex-tag">Example</span>
                <ul>
                  <li><span>Food<small>$240 of $300</small></span><i className="hm-bar" style={{ ['--w' as string]: '80%' }} aria-hidden="true" /></li>
                  <li><span>Transport<small>$45 of $120</small></span><i className="hm-bar" style={{ ['--w' as string]: '38%' }} aria-hidden="true" /></li>
                </ul>
                <div className="hm-ex-total"><span>Left this month</span><strong>$135</strong></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="hm-section hm-dark" id="features">
        <div className="hm-wrap">
          <h2 className="hm-h2">Settle up without the group chat.</h2>
          <p className="hm-sub">One person pays and everyone else forgets. Payday keeps the record so nobody has to remember.</p>
          <div className="hm-features">
            <div><h3>Who paid, who owes</h3><p>Every expense shows the payer and each person’s share, so a balance is never a guess.</p></div>
            <div><h3>Suggested settlements</h3><p>See who should pay whom to clear the balances.</p></div>
            <div><h3>Settlement history</h3><p>Log a payment after it happens. Payday never moves money.</p></div>
            <div><h3>Reports you keep</h3><p>Print or save a statement as a PDF, or download an HTML copy.</p></div>
          </div>
        </div>
      </section>

      <section className="hm-section" id="faq">
        <div className="hm-wrap hm-faq-wrap">
          <h2 className="hm-h2">Questions people ask first</h2>
          <div className="hm-faq">
            <details><summary>Do the people I split with need an account?</summary><p>There are no accounts yet. Spaces live in your browser on this device, so adding someone saves their name and email as a label. It does not invite them or give them access.</p></details>
            <details><summary>Where is my data stored?</summary><p>In this browser, on this device. Clearing site data deletes it, so export a report now and then.</p></details>
            <details><summary>Can I use my own currency?</summary><p>Yes. Pick a currency in the planner or when you create a shared space. Payday does not convert between currencies.</p></details>
            <details><summary>Does Payday connect to my bank or move money?</summary><p>No. It records who paid and who owes. When someone settles up, you log it in Payday and the payment itself happens elsewhere.</p></details>
          </div>
        </div>
      </section>

      <section className="hm-cta">
        <div className="hm-wrap">
          <h2>Start with one shared bill.</h2>
          <p>Create a space, add the people and log your first expense.</p>
          <div className="hm-actions hm-actions-center">
            <a className="site-cta site-cta-dark" href="/app">Start a shared space <ArrowRight size={17} /></a>
            <a className="hm-link hm-link-light" href="/app">Or plan your own money</a>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoPage({page}:{page:Exclude<PublicPage,'home'>}){const [sent,setSent]=useState(false);const info=pages[page];return <main className="info-page"><div className="info-page-top"><a href="/">Home</a><span>/</span><span>{info.title}</span></div><div className="info-hero"><h1>{info.title}</h1><p>{info.intro}</p></div>{page==='about'&&<div className="info-content"><img className="info-wide-image" src={photos.coffee} alt="A coffee and notebook on a table, ready for planning"/><h2>Good with money looks different for everyone.</h2><p>Money is often shared, even when income is not. Partners split rent, flatmates rotate grocery payments, and families coordinate recurring costs. The details can get lost in chats, notes and mental maths. Payday helps make those shared obligations visible while leaving room for each person’s own financial plans.</p><p>Payday brings shared and personal money management together. Create a local space for a household, couple or group, record who paid for shared expenses, split costs, review balances and record settlements. Keep your personal income, expenses, bills and savings goals in a separate planner.</p><h2>What we believe</h2><ul><li><strong>Clarity over shame.</strong> Numbers are information, not a judgement on you.</li><li><strong>Real life over perfect spreadsheets.</strong> Your plan should change when your circumstances change.</li><li><strong>Progress over perfection.</strong> Small, consistent steps count.</li><li><strong>Your choices stay yours.</strong> Payday helps you organise information; you decide what matters.</li></ul><a className="site-cta" href="/app">Explore shared money <ArrowRight size={16}/></a></div>}{page==='contact'&&<div className="info-content contact-layout"><div><h2>Tell us what's on your mind.</h2><p>Use the form to share product feedback, report an issue, or suggest something that would make Payday more useful. This form opens your email app to send your message.</p><div className="contact-detail"><span>✳</span><div><strong>Product feedback</strong><small>Ideas, improvements, and the little details that matter.</small></div></div><div className="contact-detail"><span>↗</span><div><strong>Help with the planner</strong><small>Tell us what you were trying to do and what happened.</small></div></div></div><form className="contact-form" id="feedback" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const subject=encodeURIComponent(String(f.get('subject')||'Payday enquiry'));const body=encodeURIComponent('Name: '+f.get('name')+'\nEmail: '+f.get('email')+'\n\n'+f.get('message'));window.location.href='mailto:hello@payday.money?subject='+subject+'&body='+body;setSent(true)}}><label>Your name<input name="name" required placeholder="What should we call you?"/></label><label>Email address<input name="email" type="email" required placeholder="you@example.com"/></label><label>What is this about?<select name="subject"><option>Product feedback</option><option>Something isn't working</option><option>General question</option><option>Partnership enquiry</option></select></label><label>Your message<textarea name="message" rows={5} required placeholder="Tell us a little more..."/></label><button className="site-cta" type="submit">{sent?'Open your email app again':'Send your message'} <ArrowRight size={16}/></button><small className="form-note">Your email app will open with your message ready to send. You can review it before sending.</small></form></div>}{page==='terms'&&<div className="info-content legal-copy"><p className="legal-updated">Last updated: 26 October 2026</p><h2>1. What Payday provides</h2><p>Payday provides personal money-planning tools and a local shared-expense ledger for households, partners, flatmates and other groups who share costs. It does not connect to bank accounts, initiate payments or verify your financial records.</p><h2>2. Current product status</h2><p>Personal planner records and shared-space records are stored in browser storage on the device and browser profile you use. The current shared workspace is local-only: it does not provide account sign-in, invitation delivery, cloud synchronisation or cross-device access. Do not assume your information is backed up. Features may change as the product develops.</p><h2>3. Not financial advice</h2><p>Payday is not a bank, lender, payment processor, accountant or financial adviser. Calculations depend on the information you enter and may not reflect your full financial position. Nothing in the product is individualised financial, tax, legal, investment or debt advice. Check important figures and obligations independently.</p><h2>4. Your information and responsibility</h2><p>You are responsible for entering accurate information and protecting access to your device and browser profile. Do not enter bank passwords, card security codes or information that is not needed to plan your money. Keep a separate record of critical payment obligations.</p><h2>5. Availability and acceptable use</h2><p>We may update, suspend or discontinue parts of the service. Do not attempt to disrupt Payday, access systems without permission, or use the service unlawfully or in a way that infringes another person's rights.</p><h2>6. Limitation of liability</h2><p>To the extent permitted by applicable law, Payday is provided on an “as available” basis. We do not guarantee uninterrupted access, error-free calculations or that the planner will prevent missed payments or financial loss. Nothing here excludes liability that cannot legally be excluded.</p><h2>7. Contact and governing law</h2><p>For questions about these terms, use the <a href="/contact">contact page</a>. These terms are subject to applicable law and any mandatory consumer protections that apply where you live.</p></div>}{page==='privacy'&&<div className="info-content legal-copy"><p className="legal-updated">Last updated: 26 October 2026</p><h2>1. Information Payday handles</h2><p>When you use the planner, you may enter income amounts, spending records, bill details, savings goals, dates, categories and notes. The current planner does not ask you to connect a bank account and does not retrieve transactions from financial institutions. Avoid entering bank credentials, card numbers, passwords or unnecessary sensitive information.</p><h2>2. How information is used</h2><p>Personal and shared money records are used in your browser to display plans, split expenses and calculate balances. The current shared workspace does not send invitations or sync with other devices.</p><h2>3. Where planner data is stored</h2><p>The current personal planner and shared money workspace store their records in local storage in your browser on your device. It is not currently uploaded to a Payday account or cloud service. Data may remain until browser storage is cleared, may be lost if browser data is removed, and will not automatically appear on another device. Someone with access to your unlocked device or browser profile may be able to view it. Local storage is not a secure backup.</p><h2>4. Website providers and third parties</h2><p>The website may load hosting, font and image resources from third-party providers, including Vercel, Google Fonts and Unsplash where configured. Those providers may process standard technical request information under their own policies. This policy will be updated if the services we use or the way information is handled changes.</p><h2>5. Retention and your choices</h2><p>You can edit or remove entries within the planner. Clearing site data for Payday in your browser can remove locally stored planner information and may be irreversible. Keep a separate record of anything important. Payday offers branded reports for supported planner pages and the shared money ledger. Exported reports are saved separately and are not a secure backup or live sync.</p><h2>6. Security and children</h2><p>No website or storage method can be guaranteed completely secure. Protect access to your device and browser profile. Payday is not designed to solicit personal financial information from children.</p><h2>7. Privacy requests and changes</h2><p>Privacy rights depend on the laws that apply to you. For a privacy question or request, use the <a href="/contact">contact page</a>. If Payday introduces accounts, cloud storage or analytics, this notice will be updated to explain the relevant data practices before those features are made available.</p></div>}{page==='legal'&&<div className="info-content legal-copy"><h2>What Payday is</h2><p>Payday combines personal money-planning tools with a local shared-expense ledger for households, partners, flatmates and other groups who share costs. It is not a bank, lender, payment processor, credit-scoring service or investment platform. It does not connect to bank accounts or independently verify your financial information.</p><h2>Accuracy matters</h2><p>Summaries and estimates depend on the records, dates and amounts entered. A displayed balance or daily spending guide is an estimate based on your inputs, not a statement from a financial institution. Confirm actual balances and payment status with the relevant provider.</p><h2>External content</h2><p>The website may use third-party image and font services. Links to external websites are provided for convenience; their content and privacy practices are controlled by their respective operators.</p><h2>Brand and ownership</h2><p>Payday's name, branding and website content are associated with the Payday service operator. All rights not expressly granted remain reserved to the applicable rights holder.</p></div>}</main>}
export default function PublicSite(){const path=window.location.pathname.replace(/\/+$/,'')||'/';const page=(path==='/about'?'about':path==='/contact'?'contact':path==='/terms'?'terms':path==='/privacy'?'privacy':path==='/legal'?'legal':'home') as PublicPage;return <div className="public-site"><Header/>{page==='home'?<Home/>:<InfoPage page={page as Exclude<PublicPage,'home'>}/>}<Footer/></div>}
