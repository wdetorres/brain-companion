import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, LockKeyhole, Network } from 'lucide-react';
import { authClient } from './auth-client.ts';
import type { BrainSnapshot } from './shared.ts';

interface Owner { name: string; email: string }
interface Session { authenticated: boolean; user: Owner | null; csrf: string }
interface AppConnection { clientId: string; name: string; scopes: string[]; lastUsed: string | null }
interface Consent { name: string; clientId: string; redirectUri: string; scopes: string[] }
async function read<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!response.ok) throw new Error(response.status === 401 ? 'Your session ended. Sign in again.' : 'This request could not be completed. Please try again.');
  return response.json();
}
function Frame({ children }: { children: React.ReactNode }) {
  return <main className="entry"><div className="entry-card auth-card"><a className="brand-mark" href="/" aria-label="Brain Companion home"><Network size={23} /></a>{children}<small className="auth-footer"><LockKeyhole size={13} /> Your private Brain Companion</small></div></main>;
}
export function LoginPage({ error = '' }: { error?: string }) {
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const pending = params.has('sig');
  return <Frame><span className="eyebrow">WELCOME BACK</span><h1>Your brain.<br />One place to connect.</h1><p>{pending ? 'Sign in to review the app requesting access to your Brain.' : 'Explore your notes, follow connections, and see what your agents remember.'}</p>
    {(error || failure || params.has('error')) && <p role="alert" className="error-text">{error || failure || 'Sign-in was cancelled or could not be completed. Use your approved Google account and try again.'}</p>}
    <button className="google-signin" disabled={busy || !!error} onClick={async () => { setBusy(true); setFailure(''); try { const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/', errorCallbackURL: '/sign-in?error=sign_in_failed' }); if (result.error) throw Error(); } catch { setFailure('Could not sign in. Try again with your approved Google account.'); setBusy(false); } }}><span className="google-letter" aria-hidden="true">G</span>{busy ? 'Opening Google…' : 'Continue with Google'}<ArrowUpRight size={17} /></button>
    <p className="small muted">Only your approved Google account can open this workspace.</p><a className="demo-link" href="/demo">Explore the sample brain <ArrowUpRight size={14} /></a>
  </Frame>;
}
export function ConsentPage() {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'signed-out' } | { kind: 'ready'; session: Session; consent: Consent } | { kind: 'error'; message: string }>({ kind: 'loading' });
  const [pending, setPending] = useState<'connect' | 'cancel' | null>(null), [failure, setFailure] = useState('');
  useEffect(() => { let active = true; void (async () => { try {
    const session = await read<Session>('/api/auth/session');
    if (!session.authenticated) { if(active)setState({kind:'signed-out'}); return; }
    const consent = await read<Consent>('/api/consent', { csrf: session.csrf, query: location.search.slice(1) });
    if(active)setState({kind:'ready',session,consent});
  } catch { if(active)setState({kind:'error',message:'This connection request is invalid or has expired. Start the connection again from ChatGPT.'}); } })(); return () => {active=false;}; }, []);
  if (state.kind === 'signed-out') return <LoginPage />;
  async function decide(accept: boolean) {
    if(pending)return;setPending(accept?'connect':'cancel');setFailure('');
    try { const result = await authClient.oauth2.consent({ accept }); if(result.error || !result.data?.url)throw Error(); location.assign(result.data.url); }
    catch { setFailure('The connection could not be completed. Restart it from ChatGPT if this request has expired.');setPending(null); }
  }
  return <Frame>{state.kind === 'loading' ? <p role="status">Checking connection request…</p> : state.kind === 'error' ? <><h1>Start a fresh connection</h1><p role="alert">{state.message}</p><a className="demo-link" href="/">Back to your Brain</a></> : <>
    <span className="eyebrow">APP CONNECTION</span><h1>Connect {state.consent.name}?</h1><p>Review this request before giving the app access to your Brain.</p>
    <div className="auth-identity"><Check size={16} /><div><strong>{state.session.user?.name}</strong><span>{state.session.user?.email}</span></div></div>
    <div className="consent-permissions"><strong>This app is requesting:</strong><ul>{state.consent.scopes.includes('brain') && <><li>Search and read your synced notes.</li><li>Submit sourced memories and review shared work.</li><li>File notes and accept links under your existing Brain policies.</li></>}{state.consent.scopes.includes('offline_access') && <li>Keep access when you close this browser, until you revoke it.</li>}</ul></div>
    <p className="small muted">Only connect if you started this request. The app name is supplied by the requesting client.</p><p className="auth-callback">Return to <strong>{state.consent.redirectUri}</strong></p>
    {failure && <p role="alert" className="error-text">{failure}</p>}<div className="consent-actions"><button className="quiet-button" disabled={!!pending} onClick={()=>void decide(false)}>{pending==='cancel'?'Cancelling…':'Cancel'}</button><button className="primary" disabled={!!pending} onClick={()=>void decide(true)}>{pending==='connect'?'Connecting…':`Connect ${state.consent.name}`}<ArrowUpRight size={16}/></button></div>
  </>}</Frame>;
}
export function AccountSettings({ csrf, status, user }: { csrf: string; status: BrainSnapshot['status']; user: Owner | null }) {
  const [apps,setApps]=useState<AppConnection[]|null>(null),[error,setError]=useState(''),[pending,setPending]=useState<string|null>(null);
  useEffect(()=>{let active=true;void read<{apps:AppConnection[]}>('/api/apps').then(r=>{if(active)setApps(r.apps);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  return <main className="account-page"><a className="demo-link" href="/"><ArrowLeft size={15}/> Back to your Brain</a><h1>Account & connections</h1><p className="muted">Your identity, your vault, and the apps you authorize.</p>
    <section className="account-section"><h2>Signed in with Google</h2><p>{user?.email}</p><p className="small muted">Signing out ends this browser session. Manage app access below.</p><button className="quiet-button" onClick={async()=>{const r=await authClient.signOut();if(r.error)setError('Could not sign out. Try again.');else location.assign('/sign-in');}}>Sign out</button></section>
    <section className="account-section"><h2>Obsidian Sync</h2><p>{status.sync}</p><p className="small muted">Last successful sync: {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'No successful sync recorded'}</p><p className="small muted">This is the server’s sync status; other devices may still be catching up. Connection setup is managed on the worker.</p></section>
    <section className="account-section"><h2>Connected apps</h2><p className="small muted">Revoke an app to stop its access and require authorization again.</p>{error && <p role="alert" className="error-text">{error}</p>}{apps===null ? <p role="status">Loading connections…</p> : apps.length===0 ? <p>No apps authorized yet. Start a connection from ChatGPT using your Brain Companion MCP URL.</p> : apps.map(app=><article className="connected-app" key={app.clientId}><div><strong>{app.name}</strong><span>Authorized · {app.scopes.includes('brain')?'Brain read and write access':'Limited access'}</span><small>{app.lastUsed ? `Last MCP request: ${new Date(app.lastUsed).toLocaleString()}` : 'No successful MCP request recorded'}</small></div><button className="quiet-button" disabled={pending!==null} onClick={async()=>{setPending(app.clientId);setError('');try{await read('/api/apps/revoke',{csrf,clientId:app.clientId});setApps(current=>current?.filter(a=>a.clientId!==app.clientId)??[]);}catch(e){setError((e as Error).message);}finally{setPending(null);}}}>{pending===app.clientId?'Revoking…':'Revoke access'}</button></article>)}<code className="mcp-url">{location.origin}/mcp</code></section>
  </main>;
}
