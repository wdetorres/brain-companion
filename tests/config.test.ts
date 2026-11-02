import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeConfig, authConfig } from '../server/config.ts';
const configured = { NODE_ENV:'production', PUBLIC_ORIGIN:'https://brain.example', BETTER_AUTH_SECRET:'a'.repeat(40), GOOGLE_CLIENT_ID:'client', GOOGLE_CLIENT_SECRET:'secret', BRAIN_OWNER_EMAIL:'owner@example.com' };
test('production requires complete SSO configuration and no owner-password startup gate', () => {
  assert.throws(() => validateRuntimeConfig({ NODE_ENV:'production' }), /HTTPS/);
  assert.throws(() => validateRuntimeConfig({ NODE_ENV:'production', PUBLIC_ORIGIN:'https://brain.example' }), /Google/);
  assert.equal(validateRuntimeConfig(configured), 'https://brain.example');
  assert.equal(authConfig(configured)?.ownerEmail, 'owner@example.com');
  assert.equal(authConfig({}), null);
  for (const PUBLIC_ORIGIN of ['https://user:pass@brain.example','https://brain.example/path','https://brain.example?next=x','http://evil.example']) assert.throws(()=>validateRuntimeConfig({...configured,PUBLIC_ORIGIN}));
  assert.throws(()=>validateRuntimeConfig({...configured,GOOGLE_CLIENT_SECRET:''}));
  assert.throws(()=>validateRuntimeConfig({...configured,BETTER_AUTH_SECRET:'short'}));
  assert.throws(()=>validateRuntimeConfig({...configured,BRAIN_BRIDGE_KEY:'short'}));
});
