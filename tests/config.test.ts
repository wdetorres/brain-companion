import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeConfig } from '../server/config.ts';
test('production refuses the localhost development default and requires HTTPS plus secrets', () => {
  assert.throws(() => validateRuntimeConfig({ NODE_ENV: 'production' }), /HTTPS/);
  assert.throws(() => validateRuntimeConfig({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'http://localhost:3000' }), /HTTPS/);
  assert.throws(() => validateRuntimeConfig({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://brain.example' }), /owner password/);
  assert.equal(validateRuntimeConfig({}), 'http://localhost:3000');
  assert.equal(validateRuntimeConfig({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://brain.example', BRAIN_PASSWORD_HASH: 'a'.repeat(32) + ':' + 'b'.repeat(128), BRAIN_BRIDGE_KEY: 'c'.repeat(64) }), 'https://brain.example');
});
