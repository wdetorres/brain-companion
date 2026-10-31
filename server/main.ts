import { validateRuntimeConfig } from './config.ts';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { BrainStore } from './store.ts';
import { createJevJudge, createRecallJudge, createConnectionJudge } from './jev.ts';
import { createHandler } from './http.ts';
import { json } from './auth.ts';
import { scheduleSync } from './runtime.ts';

const port = Number(process.env.PORT || 3000);
const origin = validateRuntimeConfig(process.env);
const hash = process.env.BRAIN_PASSWORD_HASH;
const bridgeKey = process.env.BRAIN_BRIDGE_KEY;
const live = !!hash;
const accepted = (process.env.AUTO_ACCEPT || '').split(',').filter(Boolean);
if (accepted.some(v => !['new', 'update', 'promote'].includes(v))) throw Error('AUTO_ACCEPT supports only new,update,promote');
const store = live ? new BrainStore({ vault: resolve(process.env.VAULT_PATH || 'data/vault'), data: resolve(process.env.STATE_PATH || 'data/state'), judge: createJevJudge(process.env.JEV_API_KEY || '', process.env.JEV_MODEL || 'jev-latest'), recallJudge: createRecallJudge(process.env.JEV_API_KEY, process.env.JEV_MODEL), connectionJudge: createConnectionJudge(process.env.JEV_API_KEY, process.env.JEV_MODEL), accept: accepted }) : undefined;
const handle = store ? createHandler(store, { origin, passwordHash: hash!, bridgeKey }) : async () => json({ error: 'The private brain service is not configured yet.' }, 503);
const stopSync = store && process.env.SYNC_ENABLED === 'true' ? scheduleSync(store, Math.max(10000, Number(process.env.SYNC_INTERVAL_MS) || 30000)) : () => {};
const dist = resolve('dist');
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', origin);
    if (!['GET', 'HEAD', 'POST', 'DELETE', 'OPTIONS'].includes(req.method || 'GET')) { res.writeHead(405); res.end(); return; }
    if (/^\/(api\/|mcp(?:\/|$)|oauth\/|\.well-known\/|healthz$)/.test(url.pathname)) {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 300000) { res.writeHead(413); res.end(); return; } chunks.push(bytes); }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(name, value);
      const request = new Request(new URL(url.pathname + url.search, origin), { method: req.method, headers, body: !['GET', 'HEAD'].includes(req.method || 'GET') ? Buffer.concat(chunks).toString('utf8') : undefined });
      const response = await handle(request);
      res.statusCode = response.status;
      for (const [name, value] of response.headers) if (name !== 'set-cookie') res.setHeader(name, value);
      const cookies = response.headers.getSetCookie(); if (cookies.length) res.setHeader('Set-Cookie', cookies);
      if (req.method !== 'HEAD' && response.body) for await (const chunk of response.body as any) { if (res.destroyed) break; res.write(Buffer.from(chunk)); }
      res.end(); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const asset = url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg';
    const path = asset ? resolve(dist, '.' + decodeURIComponent(url.pathname)) : resolve(dist, 'index.html');
    if (!path.startsWith(dist + '/')) { res.writeHead(404); res.end(); return; }
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Brain listening on port ${port}; ${live ? 'private API enabled' : 'demo only at /demo'}`));
function shutdown() { stopSync(); server.close(() => { if (store) void store.exclusive(async () => store.close()); }); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
