import { Pool } from 'pg';
import { NOTIFY_SCHEMA_SQL, NotifyModule, allowedEndpoint, distanceMeters, type Sender } from '../../notify';
import { Clock } from './support';

const url = process.env.DATABASE_URL!;
const admin = new Pool({ connectionString: url, max: 2 });
const db = new Pool({ connectionString: url, max: 2, options: '-c search_path=notify_spec' });
const keys = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) };
const sub = (n: number) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}`, keys });
const cafe = { lat: 35.7576, lng: 51.4099 };
const offer = (id: string, radius = 500) => ({ organizationId: 'test-demo-07', offerVersionId: id, businessName: 'کافه نیلوفر', offerName: '۲۰٪ تخفیف', radiusMeters: radius, at: cafe });

describe('nearby-offer notifications (D-77)', () => {
  let clock: Clock;
  let sent: Array<{ endpoint: string; payload: string }>;
  let gone: Set<string>;
  let notify: NotifyModule;
  const sender: Sender = { async send(s, payload) { if (gone.has(s.endpoint)) return { gone: true }; sent.push({ endpoint: s.endpoint, payload }); return { gone: false }; } };

  beforeEach(async () => {
    await admin.query('DROP SCHEMA IF EXISTS notify_spec CASCADE; CREATE SCHEMA notify_spec');
    await db.query(NOTIFY_SCHEMA_SQL);
    clock = new Clock('2026-09-24T08:30:00Z'); // 12:00 in Tehran
    sent = []; gone = new Set();
    notify = new NotifyModule(db, sender, { now: clock.now });
  });
  afterAll(async () => { await admin.query('DROP SCHEMA IF EXISTS notify_spec CASCADE'); await admin.end(); await db.end(); });

  it('posts only to known push services', () => {
    expect(allowedEndpoint('https://fcm.googleapis.com/fcm/send/x')).toContain('fcm.googleapis.com');
    expect(allowedEndpoint('https://web.push.apple.com/abc')).toContain('push.apple.com');
    for (const bad of ['http://fcm.googleapis.com/x', 'https://evil.example/x', 'https://fcm.googleapis.com:8443/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.io/x']) expect(() => allowedEndpoint(bad)).toThrow();
  });

  it('notifies only fresh subscribers inside the radius, once per offer, and stores location coarsely', async () => {
    await notify.subscribe({ subscription: sub(1), lat: 35.75912, lng: 51.41033 }); // ~170 m
    await notify.subscribe({ subscription: sub(2), lat: 35.7700, lng: 51.4099 }); // ~1.4 km
    const stored = await db.query('SELECT lat, lng FROM notify_subscriptions ORDER BY lat');
    expect(stored.rows[0]).toEqual({ lat: 35.759, lng: 51.41 });
    expect((await notify.announce(offer('o1'))).sent).toBe(1);
    expect(sent[0].endpoint).toContain('device-1');
    expect(JSON.parse(sent[0].payload)).toMatchObject({ title: 'کافه نیلوفر', url: '/?org=test-demo-07&offer=o1' });
    expect((await notify.announce(offer('o1'))).sent).toBe(0);
    expect((await notify.announce(offer('o2', 2000))).sent).toBe(2);
    clock.advance(25 * 3600_000);
    expect((await notify.announce(offer('o3', 2000))).sent).toBe(0);
    await notify.updateLocation(sub(1).endpoint, 35.7577, 51.41);
    expect((await notify.announce(offer('o4'))).sent).toBe(1);
  });

  it('three a day at most, nothing in quiet hours, and turning off deletes the subscription', async () => {
    await notify.subscribe({ subscription: sub(1), lat: cafe.lat, lng: cafe.lng });
    for (const id of ['a', 'b', 'c', 'd']) await notify.announce(offer(id));
    expect(sent).toHaveLength(3);
    clock.advance(12 * 3600_000); // 00:00 Tehran next day
    await notify.updateLocation(sub(1).endpoint, cafe.lat, cafe.lng);
    expect(await notify.announce(offer('e'))).toEqual({ sent: 0, skipped: 'quiet_hours' });
    clock.advance(9 * 3600_000); // 09:00 Tehran
    expect((await notify.announce(offer('e'))).sent).toBe(1);
    await notify.unsubscribe(sub(1).endpoint);
    expect((await db.query('SELECT count(*)::int AS n FROM notify_subscriptions')).rows[0].n).toBe(0);
    expect((await db.query('SELECT count(*)::int AS n FROM notify_sent')).rows[0].n).toBe(0);
  });

  it('a subscription the push service reports gone is removed', async () => {
    await notify.subscribe({ subscription: sub(9), lat: cafe.lat, lng: cafe.lng });
    gone.add(sub(9).endpoint);
    expect((await notify.announce(offer('x'))).sent).toBe(0);
    expect((await db.query('SELECT count(*)::int AS n FROM notify_subscriptions')).rows[0].n).toBe(0);
    expect(Math.round(distanceMeters({ lat: 35.7576, lng: 51.4099 }, { lat: 35.7666, lng: 51.4099 }))).toBe(1001);
  });
});
