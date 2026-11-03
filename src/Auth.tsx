import { ThemeToggle } from './ThemeToggle.tsx';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Copy, LockKeyhole, Network } from 'lucide-react';
import { authClient } from './auth-client.ts';
import { joinWaitlist } from './waitlist.ts';
import type { BrainSnapshot, InterestSummary } from './shared.ts';

interface Owner { name: string; email: string }
interface Session { authenticated: boolean; user: Owner | null; csrf: string }
interface AppConnection { clientId: string; name: string; scopes: string[]; lastUsed: string | null }
interface Consent { name: string; clientId: string; redirectUri: string; scopes: string[] }
async function read<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!response.ok) throw new Error(response.status === 401 ? 'Your session ended. Sign in again.' : response.status === 429 ? 'Too many requests. Try again in a minute.' : 'This request could not be completed. Please try again.');
  return response.json();
}
function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <main className={'entry ' + className}><div className="entry-card auth-card"><div className="auth-heading"><a className="brand-mark" href="/" aria-label="Brain Companion home"><Network size={23} /></a><ThemeToggle /></div>{children}<small className="auth-footer"><LockKeyhole size={13} /> Your private Brain Companion</small></div></main>;
}
export function LoginPage({ error = '' }: { error?: string }) {
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const pending = params.has('sig');
  if (params.get('error') === 'owner_only') return <Frame><h1>This Brain is personal</h1><p>This instance is private. Only its owner can sign in, but you can run Brain Companion for yourself using the open-source code.</p><VisitorInterest /><a className="demo-link" href="/sign-in">Use another Google account <ArrowUpRight size={14} /></a></Frame>;
  return <Frame><h1>Sign in to your Brain</h1><p>{pending ? 'Sign in as the owner to review the app requesting access to this Brain.' : 'This is a private, personal instance. Only its owner can sign in.'}</p>
    {(error || failure || params.has('error')) && <p role="alert" className="error-text">{error || failure || 'Sign-in was cancelled or could not be completed. Use your approved Google account and try again.'}</p>}
    <button className="google-signin" disabled={busy || !!error} onClick={async () => { setBusy(true); setFailure(''); try { const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/app', errorCallbackURL: '/sign-in?error=sign_in_failed' }); if (result.error) throw Error(); } catch { setFailure('Could not sign in. Try again with your approved Google account.'); setBusy(false); } }}><span className="google-letter" aria-hidden="true">G</span>{busy ? 'Opening Google…' : 'Continue with Google'}<ArrowUpRight size={17} /></button>
    <VisitorInterest secondary />
  </Frame>;
}
function VisitorInterest({ secondary = false }: { secondary?: boolean }) {
  const [email, setEmail] = useState(''), [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle'), [error, setError] = useState('');
  return <div className={'visitor-interest' + (secondary ? ' visitor-secondary' : '')}>
    <a className={secondary ? 'quiet-button code-link' : 'primary code-link'} href="https://github.com/wdetorres/brain-companion" target="_blank" rel="noopener noreferrer" onClick={() => { void fetch('/api/interest', { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'code_click' }) }).catch(() => {}); }}>Get the code <ArrowUpRight size={16} /></a>
    <div className="visitor-links"><a href="/docs#quickstart">Setup guide</a><a href="/demo">Explore the demo</a></div>
    <section className="waitlist" aria-labelledby="waitlist-heading"><h2 id="waitlist-heading">Want a hosted version?</h2><p id="waitlist-purpose">Join the waitlist for an email if a hosted version becomes available. No launch date yet.</p>
      {state === 'saved' ? <p className="waitlist-success" role="status"><Check size={17} /> You’re on the waitlist.</p> : <form onSubmit={async event => { event.preventDefault(); if (state === 'saving') return; setState('saving'); setError(''); try { await joinWaitlist(email); setState('saved'); setEmail(''); } catch (failure) { setError((failure as Error).message); setState('idle'); } }}>
        <label htmlFor="waitlist-email">Email address</label><div className="waitlist-fields"><input id="waitlist-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={state === 'saving'} aria-describedby={'waitlist-purpose waitlist-privacy' + (error ? ' waitlist-error' : '')} /><button className="quiet-button" disabled={state === 'saving'}>{state === 'saving' ? 'Joining…' : 'Join waitlist'}</button></div>
        {error && <p id="waitlist-error" className="error-text" role="alert">{error}</p>}
      </form>}
      <p id="waitlist-privacy" className="interest-note">Optional. Your email is only for hosted-version updates. “Get the code” clicks are counted anonymously.</p>
    </section>
  </div>;
}
function InterestSettings({ csrf }: { csrf: string }) {
  const [data, setData] = useState<InterestSummary | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [pending, setPending] = useState<string | null>(null);
  useEffect(() => { let active = true; setError(''); void read<InterestSummary>('/api/interest').then(result => { if (active) setData(result); }).catch(failure => { if (active) setError(failure.message); }); return () => { active = false; }; }, [attempt]);
  return <section className="account-section interest-settings"><h2>Visitor interest</h2>
    {error && <p className="error-text" role="alert">{error} <button className="quiet-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>}
    {!data ? !error && <p role="status">Loading interest…</p> : <>
      <dl className="interest-counts"><div><dt>Get the code · all time</dt><dd>{data.clicks.toLocaleString()}</dd></div><div><dt>Get the code · last 30 days</dt><dd>{data.clicks30Days.toLocaleString()}</dd></div><div><dt>Waitlist emails</dt><dd>{data.waitlistCount.toLocaleString()}</dd></div></dl>
      <p className="small muted">Anonymous clicks from the sign-in pages, not unique people. Repeat clicks and bots can count. Emails are unverified; no messages are sent automatically.</p>
      {data.waitlistCount === 0 ? <p className="small muted">No waitlist signups yet.</p> : <><div className="waitlist-list-heading"><h3>Latest signups</h3><a className="quiet-button" href="/api/interest/export">Download CSV</a></div>
        <p className="small muted">Showing the latest {data.subscribers.length}. The download includes everyone.</p>
        <ul className="waitlist-subscribers">{data.subscribers.map(person => <li className="connected-app" key={person.email}><div><strong>{person.email}</strong><small>{new Date(person.createdAt).toLocaleDateString()}</small></div><button className="quiet-button" aria-label={'Remove ' + person.email + ' from the waitlist'} disabled={pending !== null} onClick={async () => { setPending(person.email); setError(''); try { await read('/api/interest/remove', { csrf, email: person.email }); setData(await read<InterestSummary>('/api/interest')); } catch (failure) { setError((failure as Error).message); } finally { setPending(null); } }}>{pending === person.email ? 'Removing…' : 'Remove'}</button></li>)}</ul></>}
    </>}
  </section>;
}
export function ConsentPage() {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'signed-out' } | { kind: 'ready'; session: Session; consent: Consent } | { kind: 'error'; message: string }>({ kind: 'loading' });
  const [pending, setPending] = useState<'connect' | 'cancel' | null>(null), [failure, setFailure] = useState('');
  useEffect(() => { let active = true; void (async () => { try {
    const session = await read<Session>('/api/auth/session');
    if (!session.authenticated) { if(active)setState({kind:'signed-out'}); return; }
    const consent = await read<Consent>('/api/consent', { csrf: session.csrf, query: location.search.slice(1) });
    if(active)setState({kind:'ready',session,consent});
  } catch { if(active)setState({kind:'error',message:'This request is invalid or has expired. Start the connection again from your app.'}); } })(); return () => {active=false;}; }, []);
  if (state.kind === 'signed-out') return <LoginPage />;
  async function decide(accept: boolean) {
    if(pending)return;setPending(accept?'connect':'cancel');setFailure('');
    try { const result = await authClient.oauth2.consent({ accept }); if(result.error || !result.data?.url)throw Error(); location.assign(result.data.url); }
    catch { setFailure('The connection could not be completed. Try again, or restart it from your app.');setPending(null); }
  }
  return <Frame className="consent-entry">{state.kind === 'loading' ? <p role="status">Checking connection request…</p> : state.kind === 'error' ? <><h1>Start a fresh connection</h1><p role="alert">{state.message}</p><a className="demo-link" href="/app">Back to your Brain</a></> : <>
    <h1>Connect to your Brain</h1><p className="consent-client">{state.consent.name}</p>
    <div className="auth-identity"><Check size={16} /><div><strong>{state.session.user?.name}</strong><span>{state.session.user?.email}</span></div></div>
    <div className="consent-permissions"><strong>Allow this app to:</strong><ul>{state.consent.scopes.includes('brain') && <><li>Search and read your synced notes.</li><li>Submit sourced memories and review shared work.</li><li>File notes and accept links under your existing Brain policies.</li></>}{state.consent.scopes.includes('offline_access') && <li>Keep access until you revoke it, even after you close this browser.</li>}</ul></div>
    <p className="consent-notice">Only connect if you started this request. The app name is supplied by the requesting client.</p><details className="consent-details"><summary>Connection details</summary><p className="auth-callback">Return to <strong>{state.consent.redirectUri}</strong></p></details>
    {failure && <p role="alert" className="error-text">{failure}</p>}<div className="consent-actions"><button className="quiet-button" disabled={!!pending} onClick={()=>void decide(false)}>{pending==='cancel'?'Cancelling…':'Cancel'}</button><button className="primary" disabled={!!pending} onClick={()=>void decide(true)}>{pending==='connect'?'Connecting…':'Connect'}<ArrowUpRight size={16}/></button></div>
  </>}</Frame>;
}
export function AccountSettings({ csrf, status, user }: { csrf: string; status: BrainSnapshot['status']; user: Owner | null }) {
  const [apps,setApps]=useState<AppConnection[]|null>(null),[error,setError]=useState(''),[pending,setPending]=useState<string|null>(null);
  const [attempt,setAttempt]=useState(0),[copyState,setCopyState]=useState<'idle'|'copied'|'failed'>('idle');
  useEffect(()=>{
    let active=true; setError(''); setApps(null);
    void read<{apps:AppConnection[]}>('/api/apps').then(r=>{if(active)setApps(r.apps);}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[attempt]);
  useEffect(()=>{
    if(copyState!=='copied')return;
    const timer=setTimeout(()=>setCopyState('idle'),2500);
    return()=>clearTimeout(timer);
  },[copyState]);
  const mcpUrl = location.origin + '/mcp';
  return <main className="account-page"><div className="account-heading"><a className="demo-link" href="/app"><ArrowLeft size={15}/> Back to your Brain</a><ThemeToggle /></div><h1>Account & connections</h1>
    {error && <p role="alert" className="error-text">{error}</p>}
    <section className="account-section account-identity"><div><h2>Signed in with Google</h2><p>{user?.email}</p><p className="small muted">Signing out ends this session. Connected apps keep their access.</p></div><button className="quiet-button" onClick={async()=>{const r=await authClient.signOut();if(r.error)setError('Could not sign out. Try again.');else location.assign('/sign-in');}}>Sign out</button></section>
    <section className="account-section"><h2>Obsidian Sync</h2><p className="sync-state">{status.sync}</p><p className="small muted">Last successful sync: {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'No successful sync recorded'}</p><p className="small muted">This is the server’s sync status. Other devices may still be catching up.</p></section>
    <section className="account-section"><h2>Connected apps</h2><p className="small muted">Revoking access requires the app to reconnect with your approval.</p>
      {apps===null ? error ? <button className="quiet-button" onClick={()=>setAttempt(n=>n+1)}>Try again</button> : <p role="status">Loading connections…</p> : apps.length===0 ? <p>No apps connected. Add the address below in your agent’s MCP settings to connect.</p> : apps.map(app=><article className="connected-app" key={app.clientId}><div><strong>{app.name}</strong><span>{app.scopes.includes('brain')?'Brain read and write access':'Limited access'}</span><small>{app.lastUsed ? `Last request: ${new Date(app.lastUsed).toLocaleString()}` : 'No successful request recorded'}</small></div><button className="quiet-button" disabled={pending!==null} onClick={async()=>{setPending(app.clientId);setError('');try{await read('/api/apps/revoke',{csrf,clientId:app.clientId});setApps(current=>current?.filter(a=>a.clientId!==app.clientId)??[]);}catch(e){setError((e as Error).message);}finally{setPending(null);}}}>{pending===app.clientId?'Revoking…':'Revoke access'}</button></article>)}
      <div className="mcp-address"><div><span>MCP address</span><code>{mcpUrl}</code></div><button className="quiet-button" onClick={async()=>{try{await navigator.clipboard.writeText(mcpUrl);setCopyState('copied');}catch{setCopyState('failed');}}}>{copyState==='copied'?<Check size={15}/>:<Copy size={15}/>} {copyState==='copied'?'Copied':'Copy address'}</button></div>
      <p className="copy-status small muted" role="status">{copyState==='failed'?'Could not copy. Select and copy the address above.':copyState==='copied'?'Address copied.':''}</p>
    </section>
    <InterestSettings csrf={csrf} />
  </main>;
}
