import { hashPassword } from '../server/auth.ts';
if (!process.stdin.isTTY) throw Error('Run in an interactive terminal');
process.stdout.write('New owner password (at least 16 characters): ');
process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
let password = '';
process.stdin.on('data', (chunk: string) => {
  for (const char of chunk) {
    if (char === '\u0003') { process.stdin.setRawMode(false); process.exit(1); }
    if (char === '\r' || char === '\n') {
      process.stdin.setRawMode(false); process.stdout.write('\n');
      try { console.log('BRAIN_PASSWORD_HASH=' + hashPassword(password)); } catch (e) { console.error((e as Error).message); process.exitCode = 1; }
      process.stdin.pause(); return;
    }
    if (char === '\u007f') password = password.slice(0, -1); else if (char >= ' ') password += char;
  }
});
