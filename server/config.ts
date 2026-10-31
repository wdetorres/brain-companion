export function validateRuntimeConfig(env: NodeJS.ProcessEnv) {
  const production = env.NODE_ENV === 'production';
  const origin = env.PUBLIC_ORIGIN || `http://localhost:${env.PORT || 3000}`;
  if (production && (!env.PUBLIC_ORIGIN || new URL(origin).protocol !== 'https:')) throw Error('Production requires an HTTPS PUBLIC_ORIGIN');
  if (env.BRAIN_PASSWORD_HASH && !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.BRAIN_PASSWORD_HASH)) throw Error('Invalid BRAIN_PASSWORD_HASH');
  if (production && !env.BRAIN_PASSWORD_HASH) throw Error('Production requires an owner password hash');
  if (env.BRAIN_PASSWORD_HASH && origin.startsWith('https:') && (!env.BRAIN_BRIDGE_KEY || env.BRAIN_BRIDGE_KEY.length < 32)) throw Error('Production requires a random BRAIN_BRIDGE_KEY of at least 32 characters');
  return origin;
}
