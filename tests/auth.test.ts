import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAuthService, pinGoogleOwner } from '../server/auth.ts';

import { fixture, owner, request, config, origin, clientFlow } from './auth-fixture.ts';
test('only the verified configured Google identity can bootstrap and retain ownership', async t => {
  const { db } = await fixture(t);
  assert.throws(() => pinGoogleOwner(db, config.ownerEmail, { sub: 'attacker', email: config.ownerEmail, email_verified: false }));
  assert.throws(() => pinGoogleOwner(db, config.ownerEmail, { sub: 'attacker', email: 'other@example.com', email_verified: true }));
  pinGoogleOwner(db, config.ownerEmail, { sub: 'owner-sub', email: config.ownerEmail, email_verified: true });
  assert.throws(() => pinGoogleOwner(db, config.ownerEmail, { sub: 'replacement-sub', email: config.ownerEmail, email_verified: true }));
  pinGoogleOwner(db, config.ownerEmail, { sub: 'owner-sub', email: 'renamed@example.com', email_verified: true });
});

test('cancellation, invalid PKCE and foreign redirect/resource requests issue no usable grant', async t => {
  const { service, db } = await fixture(t); const { cookie } = await owner(service, db);
  const flow = await clientFlow(service, cookie);
  const denial = await flow.authorize(false);
  assert.equal(denial.searchParams.get('error'), 'access_denied');
  assert.equal(denial.searchParams.get('state'), 'test-state');
  assert.deepEqual(await service.clients(request('/api/apps', undefined, cookie)), []);
  for (const [key, value] of [['redirect_uri', 'https://evil.example/callback'], ['resource', 'https://evil.example/mcp'], ['scope', 'admin']]) {
    const q = new URLSearchParams(flow.query); q.set(key!, value!);
    const r = (await service.handle(request('/api/auth/oauth2/authorize?' + q, undefined, cookie)))!;
    assert.ok(r.status >= 400 || new URL(r.headers.get('location')!, origin).searchParams.has('error'));
  }
  const authorization = await flow.authorize();
  const r = (await service.handle(request('/api/auth/oauth2/token', { ...flow.tokenBody, code: authorization.searchParams.get('code'), code_verifier: 'wrong'.repeat(16) })))!;
  assert.ok(r.status >= 400);
  assert.equal(db.prepare('SELECT count(*) n FROM oauthAccessToken').get()!.n, 0);
});

test('revocation survives reconnect and browser sign-out preserves offline refresh', async t => {
  const { service, db } = await fixture(t); const { cookie } = await owner(service, db);
  const flow = await clientFlow(service, cookie), old = await flow.tokens();
  await service.revokeClient(request('/api/apps', undefined, cookie), flow.client.client_id);
  const current = await flow.tokens();
  assert.equal(await service.bearer('Bearer ' + old.access_token), null);
  const oldRefresh = (await service.handle(request('/api/auth/oauth2/token', { grant_type: 'refresh_token', client_id: flow.client.client_id, refresh_token: old.refresh_token, resource: origin + '/mcp' })))!;
  assert.ok(oldRefresh.status >= 400);
  assert.equal((await service.handle(request('/api/auth/sign-out', {}, cookie)))!.status, 200);
  assert.equal(await service.session(request('/api/brain', undefined, cookie)), null);
  assert.equal(await service.bearer('Bearer ' + current.access_token), null);
  const refreshed = (await service.handle(request('/api/auth/oauth2/token', { grant_type: 'refresh_token', client_id: flow.client.client_id, refresh_token: current.refresh_token, resource: origin + '/mcp' })))!;
  assert.equal(refreshed.status, 200);
  assert.ok(await service.bearer('Bearer ' + (await refreshed.json()).access_token));
});

test('revocation invalidates outstanding authorization codes even after the app reconnects', async t => {
  const { service, db } = await fixture(t); const { cookie } = await owner(service, db);
  const flow = await clientFlow(service, cookie), pending = await flow.authorize();
  await service.revokeClient(request('/api/apps', undefined, cookie), flow.client.client_id);
  const current = await flow.tokens();
  const oldExchange = (await service.handle(request('/api/auth/oauth2/token', { ...flow.tokenBody, code: pending.searchParams.get('code') })))!;
  assert.ok(oldExchange.status >= 400);
  assert.ok(await service.bearer('Bearer ' + current.access_token));
});

test('owner sessions are distinct from bearer grants and legacy password login is removed', async t => {
  const { service, db } = await fixture(t); const { cookie } = await owner(service, db);
  assert.ok(await service.session(request('/api/brain', undefined, cookie)));
  assert.equal(await service.session(new Request(origin + '/api/brain', { headers: { Authorization: 'Bearer no' } })), null);
  assert.equal((await service.handle(request('/api/auth/login', { password: 'old-password' })))?.status, 404);
  const ctx = await service.auth.$context;
  const other = await ctx.internalAdapter.createUser({ name: 'Other', email: 'other@example.com', emailVerified: true }, {method:'test-fixture'});
  await assert.rejects(() => ctx.internalAdapter.createSession(other.id, false));
});

test('signed MCP login survives the Google callback and still requires explicit owner consent', async t => {
  const { service, db } = await fixture(t);
  const flow = await clientFlow(service, '');
  const authorization = (await service.handle(request('/api/auth/oauth2/authorize?' + flow.query)))!;
  const login = new URL(authorization.headers.get('location')!, origin);
  assert.equal(login.pathname, '/sign-in');
  const signIn = (await service.handle(request('/api/auth/sign-in/social', { provider: 'google', callbackURL: '/', oauth_query: login.search.slice(1) })))!;
  assert.equal(signIn.status, 200);
  const google = new URL((await signIn.json()).url);
  assert.equal(google.origin, 'https://accounts.google.com');
  assert.equal(google.searchParams.get('redirect_uri'), origin + '/api/auth/callback/google');
  assert.equal(google.searchParams.get('prompt'), 'select_account');
  const ctx = await service.auth.$context;
  const provider = await ctx.socialProviders.find(p => typeof p !== 'function' && p.id === 'google');
  assert.ok(provider && typeof provider !== 'function');
  // Mock only Google's verified code exchange; retain profile mapping, account creation and session admission.
  t.mock.method(provider, 'validateAuthorizationCode', async () => ({ accessToken: 'synthetic-google', idToken: 'e30.' + Buffer.from(JSON.stringify({ sub: 'verified-google-owner', email: config.ownerEmail, email_verified: true, name: 'Synthetic Owner' })).toString('base64url') + '.test' }));
  const callbackPath = '/api/auth/callback/google?code=synthetic-code&state=' + google.searchParams.get('state');
  const noCookie = (await service.handle(request(callbackPath)))!;
  assert.ok(!noCookie.headers.getSetCookie().some(c => c.includes('session_token=')));
  // Start a fresh browser-bound sign-in after the missing-cookie rejection.
  const fresh = (await service.handle(request('/api/auth/sign-in/social', { provider: 'google', callbackURL: '/', oauth_query: login.search.slice(1) })))!;
  const freshGoogle = new URL((await fresh.json()).url);
  const freshCookie = fresh.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const callbackRequest = request('/api/auth/callback/google?code=synthetic-code&state=' + freshGoogle.searchParams.get('state'), undefined, freshCookie);
  callbackRequest.headers.set('sec-fetch-mode', 'navigate');
  const callback = (await service.handle(callbackRequest))!;
  assert.equal(callback.status, 302);
  const consentURL = new URL(callback.headers.get('location')!, origin);
  assert.equal(consentURL.pathname, '/consent');
  const sessionCookie = callback.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  assert.ok(await service.session(request('/api/brain', undefined, sessionCookie)));
  assert.equal(db.prepare('SELECT count(*) n FROM oauthConsent').get()!.n, 0);
  assert.equal((await service.consentDetails(request('/api/consent', undefined, sessionCookie), consentURL.search.slice(1))).name, 'Synthetic MCP');
  const replay = (await service.handle(new Request(callbackRequest)))!;
  assert.ok(!replay.headers.getSetCookie().some(c => c.includes('session_token=') && !c.includes('Max-Age=0')));
});

test('a different verified Google account is rejected with a usable sign-in page', async t => {
  const { service, db } = await fixture(t), ctx = await service.auth.$context;
  const signIn = (await service.handle(request('/api/auth/sign-in/social', { provider: 'google', callbackURL: '/' })))!;
  const state = new URL((await signIn.json()).url).searchParams.get('state');
  const cookies = signIn.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const provider = ctx.socialProviders.find(p => typeof p !== 'function' && p.id === 'google');
  assert.ok(provider && typeof provider !== 'function');
  t.mock.method(provider, 'validateAuthorizationCode', async () => ({ accessToken: 'synthetic', idToken: 'e30.' + Buffer.from(JSON.stringify({ sub: 'other', email: 'other@example.com', email_verified: true, name: 'Other' })).toString('base64url') + '.test' }));
  const response = (await service.handle(request('/api/auth/callback/google?code=synthetic&state=' + state, undefined, cookies)))!;
  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get('location')!, origin).pathname, '/sign-in');
  assert.equal(db.prepare('SELECT count(*) n FROM brainOwner').get()!.n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM session').get()!.n, 0);
});

test('canonical-origin change updates discovery and Google callback and rejects the old resource grant', async t => {
  const { service, db } = await fixture(t), { cookie } = await owner(service, db);
  const flow = await clientFlow(service, cookie), tokens = await flow.tokens();
  const next = 'https://second.example.com', migrated = await createAuthService(db, { ...config, origin: next });
  const metadata = await (await migrated.handle(new Request(next + '/.well-known/oauth-protected-resource/mcp')))!.json();
  assert.equal(metadata.resource, next + '/mcp');
  assert.deepEqual(metadata.authorization_servers, [next + '/api/auth']);
  assert.equal(await migrated.bearer('Bearer ' + tokens.access_token), null);
  const response = (await migrated.handle(new Request(next + '/api/auth/sign-in/social', { method: 'POST', headers: { Origin: next, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google', callbackURL: '/' }) })))!;
  assert.equal(new URL((await response.json()).url).searchParams.get('redirect_uri'), next + '/api/auth/callback/google');
  for (const cookie of response.headers.getSetCookie()) { assert.doesNotMatch(cookie, /; Domain=/i); assert.match(cookie, /; Secure/i); }
});

test('configured OAuth flow preserves consent, scopes, audience, refresh and immediate revocation', async t => {
  const { service, db } = await fixture(t); const { cookie } = await owner(service, db);
  const metadataResponse = await service.handle(request('/.well-known/oauth-authorization-server/api/auth'));
  assert.equal(metadataResponse?.status, 200);
  const metadata = await metadataResponse!.json();
  assert.equal(metadata.issuer, origin + '/api/auth');
  const client = await (await service.handle(request('/api/auth/oauth2/register', { client_name: 'Synthetic MCP', redirect_uris: ['https://client.example/callback'], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: 'brain offline_access' })))!.json();
  assert.ok(client.client_id);
  const verifier = 'a'.repeat(64);
  const q = new URLSearchParams({ client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: 'code', resource: origin + '/mcp', scope: 'brain offline_access', state: 'state123', code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
  const authResponse = (await service.handle(request('/api/auth/oauth2/authorize?' + q, undefined, cookie)))!;
  assert.equal(authResponse.status, 302);
  const consentURL = new URL(authResponse.headers.get('location')!, origin);
  assert.equal(consentURL.pathname, '/consent');
  const oauth_query = consentURL.search.slice(1);
  const tampered = new URLSearchParams(oauth_query); tampered.set('redirect_uri', 'https://evil.example');
  const bad = (await service.handle(request('/api/auth/oauth2/consent', { accept: true, oauth_query: tampered.toString() }, cookie)))!;
  assert.ok(bad.status >= 400);
  const consent = (await service.handle(request('/api/auth/oauth2/consent', { accept: true, oauth_query }, cookie)))!;
  assert.equal(consent.status, 200);
  const redirect = new URL((await consent.json()).url);
  assert.equal(redirect.origin, 'https://client.example'); assert.equal(redirect.searchParams.get('state'), 'state123');
  const body = { grant_type: 'authorization_code', client_id: client.client_id, redirect_uri: client.redirect_uris[0], code: redirect.searchParams.get('code'), code_verifier: verifier, resource: origin + '/mcp' };
  const response = (await service.handle(request('/api/auth/oauth2/token', body)))!;
  assert.equal(response.status, 200, response.status === 200 ? '' : await response.clone().text());
  const tokens = await response.json(); assert.ok(tokens.refresh_token);
  assert.equal((await service.bearer('Bearer ' + tokens.access_token))?.clientId, client.client_id);
  assert.ok((await service.handle(request('/api/auth/oauth2/token', body)))!.status >= 400);
  // Use a fresh authorization after intentionally exercising code replay (which invalidates its tokens).
  const fresh = (await service.handle(request('/api/auth/oauth2/authorize?' + q, undefined, cookie)))!;
  const freshRedirect = new URL(fresh.headers.get('location')!, origin);
  let code = freshRedirect.searchParams.get('code');
  if (freshRedirect.pathname === '/consent') { const c = await (await service.handle(request('/api/auth/oauth2/consent', { accept: true, oauth_query: freshRedirect.search.slice(1) }, cookie)))!.json(); code = new URL(c.url).searchParams.get('code'); }
  const freshTokens = await (await service.handle(request('/api/auth/oauth2/token', { ...body, code })))!.json();
  const refreshBody = { grant_type: 'refresh_token', client_id: client.client_id, refresh_token: freshTokens.refresh_token, resource: origin + '/mcp' };
  const refreshedResponse = (await service.handle(request('/api/auth/oauth2/token', refreshBody)))!; assert.equal(refreshedResponse.status, 200);
  const refreshed = await refreshedResponse.json();
  await service.revokeClient(request('/api/apps', undefined, cookie), client.client_id);
  assert.equal(await service.bearer('Bearer ' + refreshed.access_token), null);
  assert.ok((await service.handle(request('/api/auth/oauth2/token', { ...refreshBody, refresh_token: refreshed.refresh_token })))!.status >= 400);
});
