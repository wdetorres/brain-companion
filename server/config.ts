import type { AuthConfig } from './auth.ts';
export function validateRuntimeConfig(env: NodeJS.ProcessEnv) {
  const origin = env.PUBLIC_ORIGIN || `http://localhost:${env.PORT || 3000}`;
  const url = new URL(origin);
  if (env.NODE_ENV === 'production' && (!env.PUBLIC_ORIGIN || url.protocol !== 'https:')) throw Error('Production requires an HTTPS PUBLIC_ORIGIN');
  if (origin !== url.origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw Error('PUBLIC_ORIGIN must be an HTTPS origin (or localhost in development), without path or credentials');
  if (env.BRAIN_BRIDGE_KEY && env.BRAIN_BRIDGE_KEY.length < 32) throw Error('A configured BRAIN_BRIDGE_KEY must contain at least 32 random characters');
  authConfig(env, origin);
  return origin;
}
export function authConfig(env: NodeJS.ProcessEnv, origin = env.PUBLIC_ORIGIN || `http://localhost:${env.PORT || 3000}`): AuthConfig | null {
  const { BETTER_AUTH_SECRET: secret, GOOGLE_CLIENT_ID: googleClientId, GOOGLE_CLIENT_SECRET: googleClientSecret, BRAIN_OWNER_EMAIL: ownerEmail } = env;
  if (!secret && !googleClientId && !googleClientSecret && !ownerEmail && env.NODE_ENV !== 'production') return null;
  if (!secret || !googleClientId || !googleClientSecret || !ownerEmail) throw Error('Google sign-in requires BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and BRAIN_OWNER_EMAIL');
  if (secret.length < 32) throw Error('BETTER_AUTH_SECRET must contain at least 32 random characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw Error('Invalid BRAIN_OWNER_EMAIL');
  return { origin, secret, googleClientId, googleClientSecret, ownerEmail };
}
