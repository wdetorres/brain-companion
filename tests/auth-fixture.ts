import { DatabaseSync } from 'node:sqlite';
import { makeSignature } from 'better-auth/crypto';
import { createHash } from 'node:crypto';
import { createAuthService, pinGoogleOwner } from '../server/auth.ts';
export const origin = 'https://brain.example.com';
const secret = 'synthetic-test-secret-with-at-least-thirty-two-characters';
export const config = { origin, secret, ownerEmail: 'owner@example.com', googleClientId: 'synthetic-client', googleClientSecret: 'synthetic-secret' };
export async function fixture(t: { after: (fn: () => void) => void }) {
  const db = new DatabaseSync(':memory:');
  const service = await createAuthService(db, config);
  t.after(() => db.close());
  return { db, service };
}
export async function owner(service: Awaited<ReturnType<typeof createAuthService>>, db: DatabaseSync) {
  pinGoogleOwner(db, config.ownerEmail, { sub: 'google-owner', email: config.ownerEmail, email_verified: true });
  const ctx = await service.auth.$context;
  const user = await ctx.internalAdapter.createUser({ name: 'Owner', email: config.ownerEmail, emailVerified: true }, {method:'test-fixture'});
  await ctx.internalAdapter.createAccount({ userId: user.id, providerId: 'google', accountId: 'google-owner' });
  const session = await ctx.internalAdapter.createSession(user.id, false);
  const signature = await makeSignature(session.token, secret);
  return { user, cookie: ctx.authCookies.sessionToken.name + '=' + encodeURIComponent(session.token + '.' + signature) };
}
export function request(path: string, body?: unknown, cookie?: string) {
  const form = /^\/api\/auth\/oauth2\/(token|revoke)$/.test(path);
  return new Request(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: form ? new URLSearchParams(body as Record<string,string>).toString() : JSON.stringify(body) }) });
}

export async function clientFlow(service: Awaited<ReturnType<typeof createAuthService>>, cookie: string) {
  const client = await (await service.handle(request('/api/auth/oauth2/register', { client_name: 'Synthetic MCP', redirect_uris: ['https://client.example/callback'], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: 'brain offline_access' })))!.json();
  const verifier = 'v'.repeat(64);
  const query = new URLSearchParams({ client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: 'code', resource: origin + '/mcp', scope: 'brain offline_access', state: 'test-state', code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
  const tokenBody = { grant_type: 'authorization_code', client_id: client.client_id, redirect_uri: client.redirect_uris[0], code_verifier: verifier, resource: origin + '/mcp' };
  async function authorize(accept = true) {
    const response = (await service.handle(request('/api/auth/oauth2/authorize?' + query, undefined, cookie)))!;
    let redirect = new URL(response.headers.get('location')!, origin);
    if (redirect.pathname === '/consent') {
      const consent = await (await service.handle(request('/api/auth/oauth2/consent', { accept, oauth_query: redirect.search.slice(1) }, cookie)))!.json();
      redirect = new URL(consent.url);
    }
    return redirect;
  }
  async function tokens() {
    const redirect = await authorize();
    const response = (await service.handle(request('/api/auth/oauth2/token', { ...tokenBody, code: redirect.searchParams.get('code') })))!;
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
  return { client, query, tokenBody, authorize, tokens };
}

