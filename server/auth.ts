import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError, isAPIError, createAuthEndpoint } from 'better-auth/api';
import { getMigrations } from 'better-auth/db/migration';
import { mcp } from '@better-auth/mcp';
import { getOAuthProviderApi, verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import { z } from 'zod';

export interface AuthConfig { origin: string; secret: string; ownerEmail: string; googleClientId: string; googleClientSecret: string }
export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
const googleIdentity = z.object({ sub: z.string().min(1), email: z.email(), email_verified: z.literal(true) });
export function pinGoogleOwner(db: DatabaseSync, ownerEmail: string, profile: unknown) {
  const identity = googleIdentity.parse(profile);
  const pinned = db.prepare('SELECT subject FROM brainOwner WHERE id=1').get();
  if (pinned ? pinned.subject !== identity.sub : identity.email.toLowerCase() !== ownerEmail.toLowerCase()) throw new APIError('FORBIDDEN', { message: 'This Google account is not the Brain owner.' });
  db.prepare('INSERT OR IGNORE INTO brainOwner(id,subject) VALUES(1,?)').run(identity.sub);
  return identity;
}
function cookie(req: Request, name: string) { return (req.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1) || ''; }

export async function createAuthService(db: DatabaseSync, config: AuthConfig) {
  const origin = new URL(config.origin).origin;
  const issuer = origin + '/api/auth', resource = origin + '/mcp';
  db.exec('CREATE TABLE IF NOT EXISTS brainOwner(id INTEGER PRIMARY KEY CHECK(id=1), subject TEXT NOT NULL); CREATE TABLE IF NOT EXISTS brainClientUse(clientId TEXT PRIMARY KEY,lastUsed TEXT NOT NULL)');
  const providerOptions = {
    resource, loginPage: '/sign-in', consentPage: '/consent',
    scopes: ['brain', 'offline_access'], grantTypes: ['authorization_code', 'refresh_token'] as ['authorization_code', 'refresh_token'],
    allowDynamicClientRegistration: true, allowUnauthenticatedClientRegistration: true,
    disableJwtPlugin: true, accessTokenExpiresIn: 3600, refreshTokenExpiresIn: 30 * 86400, refreshTokenReuseInterval: 0,
  };
  function isOwner(userId: string) {
    return !!db.prepare('SELECT 1 FROM account a JOIN brainOwner o ON a.accountId=o.subject WHERE a.userId=? AND a.providerId=?').get(userId, 'google');
  }
  const options = {
    appName: 'Brain Companion', baseURL: origin, basePath: '/api/auth', secret: config.secret, database: db,
    trustedOrigins: [origin],
    emailAndPassword: { enabled: false },
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    session: { expiresIn: 86400, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 100 },
    socialProviders: { google: {
      prompt: 'select_account',
      clientId: config.googleClientId, clientSecret: config.googleClientSecret,
      mapProfileToUser(profile) { pinGoogleOwner(db, config.ownerEmail, profile); return {}; },
    } },
    databaseHooks: { session: { create: { before: async session => {
      if (!isOwner(session.userId)) throw new APIError('FORBIDDEN', { message: 'This Google account is not the Brain owner.' });
      return { data: session };
    } } } },
    plugins: [mcp(providerOptions), {
      id: 'brain-access', endpoints: { validateBrainToken: createAuthEndpoint.serverOnly({ method: 'POST', body: z.object({ token: z.string() }) }, async ctx => {
        const claims = await getOAuthProviderApi(ctx, providerOptions).requireActiveAccessToken(ctx.body.token);
        const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
        if (claims.iss !== issuer || !audiences.includes(resource) || typeof claims.scope !== 'string' || !claims.scope.split(' ').includes('brain') || typeof claims.sub !== 'string' || !isOwner(claims.sub) || typeof claims.client_id !== 'string') throw new APIError('UNAUTHORIZED');
        const client = await getOAuthProviderApi(ctx, providerOptions).getClient(claims.client_id);
        return { userId: claims.sub, clientId: claims.client_id, name: client?.name || 'MCP client', scope: 'brain' };
      }) },
    }],
    onAPIError: { errorURL: '/sign-in' },
  } satisfies BetterAuthOptions;
  const migrations = await getMigrations(options); await migrations.runMigrations();
  const auth = betterAuth(options);
  const initialized = await auth.$context;
  await initialized.checkSchema?.();
  // Serialize issuer mutations and revocation so an in-flight refresh cannot recreate a revoked grant.
  let tail: Promise<unknown> = Promise.resolve();
  function exclusive<T>(fn: () => Promise<T>): Promise<T> { const result = tail.then(fn); tail = result.catch(() => {}); return result; }
  const csrfName = origin.startsWith('https:') ? '__Host-brain_csrf' : 'brain_csrf';
  function csrf(req: Request, value: unknown) {
    const expected = cookie(req, csrfName);
    return req.headers.get('origin') === origin && typeof value === 'string' && expected.length >= 32 && Buffer.byteLength(value) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  }
  async function session(req: Request) { const value = await auth.api.getSession({ headers: req.headers }); return value && isOwner(value.user.id) ? value : null; }
  async function bearer(header: string | null) {
    if (!header?.startsWith('Bearer ') || header.length > 8192) return null;
    try { return await auth.api.validateBrainToken({ body: { token: header.slice(7) } }); }
    catch (error) { if (isAPIError(error)) return null; throw error; }
  }
  async function clients(req: Request) {
    const owner = await session(req); if (!owner) throw new APIError('UNAUTHORIZED');
    return db.prepare('SELECT c.clientId, c.name, c.redirectUris, o.scopes, u.lastUsed FROM oauthConsent o JOIN oauthClient c ON c.clientId=o.clientId LEFT JOIN brainClientUse u ON u.clientId=c.clientId WHERE o.userId=?').all(owner.user.id).map(row => ({ clientId: row.clientId, name: row.name || 'MCP client', scopes: JSON.parse(String(row.scopes)), lastUsed: row.lastUsed || null }));
  }
  async function revokeClient(req: Request, clientId: string) {
    return exclusive(async () => {
      const owner = await session(req); if (!owner) throw new APIError('UNAUTHORIZED');
      db.exec('BEGIN');
      try {
        for (const table of ['oauthAccessToken', 'oauthRefreshToken', 'oauthConsent']) db.prepare(`DELETE FROM ${table} WHERE clientId=? AND userId=?`).run(clientId, owner.user.id);
        // Issued but unexchanged codes must not recreate access after revocation.
        db.prepare("DELETE FROM verification WHERE json_valid(value) AND json_extract(value,'$.type')='authorization_code' AND json_extract(value,'$.query.client_id')=? AND json_extract(value,'$.userId')=?").run(clientId, owner.user.id);
        db.prepare('DELETE FROM brainClientUse WHERE clientId=?').run(clientId); db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    });
  }
  async function consentDetails(req: Request, query: string) {
    if (!await session(req)) throw new APIError('UNAUTHORIZED');
    if (!await verifyOAuthQueryParams(query, config.secret)) throw new APIError('BAD_REQUEST');
    const params = new URLSearchParams(query), clientId = params.get('client_id');
    if (!clientId) throw new APIError('BAD_REQUEST');
    const client = await auth.api.getOAuthClientPublic({ headers: req.headers, query: { client_id: clientId } });
    return { name: client.client_name || 'MCP client', clientId, redirectUri: params.get('redirect_uri'), scopes: (params.get('scope') || '').split(' ').filter(Boolean) };
  }
  async function handle(req: Request): Promise<Response | undefined> {
    const path = new URL(req.url).pathname;
    if (path === '/api/auth/session' && req.method === 'GET') {
      const owner = await session(req), token = randomBytes(32).toString('base64url');
      return json({ authenticated: !!owner, user: owner ? { name: owner.user.name, email: owner.user.email } : null, csrf: token }, 200, { 'Set-Cookie': `${csrfName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${origin.startsWith('https:') ? '; Secure' : ''}` });
    }
    if (path.startsWith('/.well-known/')) return auth.handler(req);
    if (path.startsWith('/oauth/')) return json({ error: 'Reconnect using the current OAuth discovery endpoints.' }, 410);
    if (!path.startsWith('/api/auth/')) return;
    const allowed = /^\/api\/auth\/(sign-in\/social|callback\/google|sign-out|oauth2\/(authorize|consent|token|register|revoke|public-client-prelogin))$/;
    if (!allowed.test(path)) return json({ error: 'Not found' }, 404);
    return exclusive(async () => {
      const response = await auth.handler(req);
      if (path === '/api/auth/callback/google' && response.status >= 400) {
        const headers = new Headers({ Location: origin + '/sign-in?error=sign_in_failed', 'Cache-Control': 'no-store' });
        for (const value of response.headers.getSetCookie()) headers.append('Set-Cookie', value);
        return new Response(null, { status: 303, headers });
      }
      return response;
    });
  }
  return { auth, origin, issuer, resource, session, csrf, bearer, clients, revokeClient, consentDetails, handle,
    recordUse(clientId: string) { db.prepare('INSERT INTO brainClientUse(clientId,lastUsed) VALUES(?,?) ON CONFLICT(clientId) DO UPDATE SET lastUsed=excluded.lastUsed').run(clientId, new Date().toISOString()); },
  };
}
export type AuthService = Awaited<ReturnType<typeof createAuthService>>;
