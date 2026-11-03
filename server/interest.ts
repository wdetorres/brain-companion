import type { DatabaseSync } from 'node:sqlite';
import type { InterestSummary } from '../src/shared.ts';

export function createInterestStore(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS interestClicks (day TEXT PRIMARY KEY, clicks INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS interestWaitlist (email TEXT PRIMARY KEY, createdAt TEXT NOT NULL);`);
  let minute = 0, clicks = 0, signups = 0;
  function record(email?: string) {
    const now = new Date(), window = Math.floor(now.getTime() / 60000);
    if (window !== minute) { minute = window; clicks = 0; signups = 0; }
    // shortcut: global limits deter bursts, add a challenge if sustained bot submissions become a problem.
    if (email ? ++signups > 10 : ++clicks > 120) return false;
    if (email) db.prepare('INSERT OR IGNORE INTO interestWaitlist(email,createdAt) VALUES(?,?)').run(email, now.toISOString());
    else db.prepare('INSERT INTO interestClicks(day,clicks) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET clicks=clicks+1').run(now.toISOString().slice(0, 10));
    return true;
  }
  function summary(): InterestSummary {
    const since = new Date(); since.setUTCDate(since.getUTCDate() - 29);
    const counts = db.prepare('SELECT COALESCE(SUM(clicks),0) AS clicks, COALESCE(SUM(CASE WHEN day>=? THEN clicks ELSE 0 END),0) AS clicks30Days FROM interestClicks').get(since.toISOString().slice(0, 10))!;
    return { clicks: Number(counts.clicks), clicks30Days: Number(counts.clicks30Days), waitlistCount: Number(db.prepare('SELECT COUNT(*) n FROM interestWaitlist').get()!.n), subscribers: db.prepare('SELECT email,createdAt FROM interestWaitlist ORDER BY createdAt DESC,email LIMIT 50').all() as InterestSummary['subscribers'] };
  }
  function exportCsv() {
    const cell = (value: string) => '"' + (/^[=+\-@\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    return 'email,signed_up_at\r\n' + db.prepare('SELECT email,createdAt FROM interestWaitlist ORDER BY createdAt,email').all().map(row => [row.email, row.createdAt].map(value => cell(String(value))).join(',')).join('\r\n');
  }
  return { record, summary, exportCsv, remove(email: string) { db.prepare('DELETE FROM interestWaitlist WHERE email=?').run(email); } };
}
