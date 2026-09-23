import crypto from 'node:crypto';
import { ChatError, ChatModule, isSensitiveBusiness, type PublishedBusinessRef } from '../../chat';
import { Clock, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const code = async (p: Promise<unknown>) => { try { await p; return 'OK'; } catch (e) { return e instanceof ChatError ? e.code : String(e); } };

const cafe: PublishedBusinessRef = { organizationId: 'test-demo-07', name: 'کافه نیلوفر', sensitive: false };
const pharmacy: PublishedBusinessRef = { organizationId: 'test-demo-04', name: 'داروخانه نمایشی', sensitive: true };
const customer = { ref: crypto.randomUUID(), test: false };
const other = { ref: crypto.randomUUID(), test: false };
const member = crypto.randomUUID();
const DAY = 86400_000;

describe('chat module (D-73)', () => {
  let clock: Clock;
  let chat: ChatModule;
  beforeEach(async () => { await resetSchemas(core, chatDb); clock = new Clock(); chat = new ChatModule(chatDb, { now: clock.now }); });
  afterAll(async () => { await core.end(); await chatDb.end(); });

  it('only the customer opens a conversation, with a chosen name; the business sees the name and never a number', async () => {
    expect(await code(chat.customerSend(cafe, customer, { name: '', body: 'سلام' }))).toBe('INPUT_INVALID');
    expect(await code(chat.customerSend(cafe, customer, { name: '09121234567', body: 'سلام' }))).toBe('INPUT_INVALID');
    const first = await chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام، امروز باز هستید؟' });
    const again = await chat.customerSend(cafe, customer, { body: 'ساعت چند؟' });
    expect(again.threadId).toBe(first.threadId);
    const list = await chat.businessThreads(cafe.organizationId, member);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ customerName: 'سارا', unread: 2, lastSender: 'customer' });
    expect(JSON.stringify(list)).not.toContain(customer.ref);
    expect(await chat.summary(cafe.organizationId)).toEqual({ conversations: 1, unreadConversations: 1, unreadMessages: 2 });
    clock.advance(60_000);
    const reply = await chat.businessReply(cafe.organizationId, member, first.threadId, 'بله، تا ۲۳:۳۰');
    expect(reply.sender).toBe('business');
    expect(await chat.summary(cafe.organizationId)).toMatchObject({ unreadMessages: 0 });
    expect((await chat.customerThreads(customer.ref))[0].unread).toBe(1);
    const seen = await chat.customerMessages(customer.ref, first.threadId, first.message.seq);
    expect(seen.messages.map((m) => m.sender)).toEqual(['customer', 'business']);
    expect((await chat.customerThreads(customer.ref))[0].unread).toBe(0);
  });

  it('a conversation belongs to its two parties only', async () => {
    const t = await chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام' });
    expect(await code(chat.customerMessages(other.ref, t.threadId))).toBe('NOT_FOUND');
    expect(await code(chat.businessMessages('test-demo-08', member, t.threadId))).toBe('NOT_FOUND');
    expect(await code(chat.businessReply('test-demo-08', member, t.threadId, 'x'))).toBe('NOT_FOUND');
  });

  it('is off for sensitive businesses and when the business turns it off', async () => {
    expect(isSensitiveBusiness('داروخانه نمایشی (آزمایشی)', ['خدمات دارویی'])).toBe(true);
    expect(isSensitiveBusiness('کافه نیلوفر', ['قهوه', 'دسر'])).toBe(false);
    expect(await code(chat.customerSend(pharmacy, customer, { name: 'سارا', body: 'سلام' }))).toBe('SENSITIVE_BUSINESS');
    expect(await code(chat.setEnabled(pharmacy, member, true))).toBe('SENSITIVE_BUSINESS');
    await chat.setEnabled(cafe, member, false);
    expect(await code(chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام' }))).toBe('CHAT_UNAVAILABLE');
    await chat.setEnabled(cafe, member, true);
    expect(await code(chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام' }))).toBe('OK');
  });

  it('either side blocks; nobody can write into a blocked conversation; only the blocker unblocks', async () => {
    const t = await chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام' });
    await chat.block('business', cafe.organizationId, t.threadId, member, true);
    expect(await code(chat.customerReply(customer, t.threadId, 'الو'))).toBe('BLOCKED');
    expect(await code(chat.customerSend(cafe, customer, { body: 'الو' }))).toBe('BLOCKED');
    expect(await code(chat.businessReply(cafe.organizationId, member, t.threadId, 'x'))).toBe('BLOCKED');
    expect(await code(chat.block('customer', customer.ref, t.threadId, customer.ref, false))).toBe('BLOCKED');
    await chat.block('business', cafe.organizationId, t.threadId, member, false);
    expect(await code(chat.customerReply(customer, t.threadId, 'الو'))).toBe('OK');
  });

  it('deleting is real, for both sides, and leaves only an opaque record', async () => {
    const t = await chat.customerSend(cafe, customer, { name: 'سارا', body: 'متن خصوصی' });
    await chat.erase('business', cafe.organizationId, t.threadId, member);
    expect(await chat.customerThreads(customer.ref)).toEqual([]);
    const rows = await chatDb.query(`SELECT (SELECT count(*) FROM chat_messages) AS m, (SELECT json_agg(e)::text FROM chat_erasure_log e) AS log`);
    expect(Number(rows.rows[0].m)).toBe(0);
    expect(rows.rows[0].log).not.toContain(customer.ref);
    expect(rows.rows[0].log).not.toContain('سارا');
    await chat.customerSend(cafe, customer, { name: 'سارا', body: 'دوباره' });
    await chat.customerSend({ ...cafe, organizationId: 'test-demo-08' }, customer, { name: 'سارا', body: 'سلام' });
    expect(await chat.eraseCustomer(customer.ref)).toBe(2);
  });

  it('retention: gone 90 days after the last message, 24 hours for test identities', async () => {
    const real = await chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام' });
    await chat.customerSend(cafe, { ref: other.ref, test: true }, { name: 'آزمون', body: 'سلام' });
    clock.advance(DAY + 1000);
    expect(await chat.purge()).toBe(1);
    clock.advance(60 * DAY);
    await chat.businessReply(cafe.organizationId, member, real.threadId, 'پاسخ');
    clock.advance(80 * DAY);
    expect(await chat.purge()).toBe(0);
    clock.advance(11 * DAY);
    expect(await chat.purge()).toBe(1);
    expect(await chat.customerThreads(customer.ref)).toEqual([]);
  });

  it('logs business reads once per ten minutes, plus list, reply, block and erase', async () => {
    const t = await chat.customerSend(cafe, customer, { name: 'سارا', body: 'سلام' });
    await chat.businessThreads(cafe.organizationId, member);
    await chat.businessThreads(cafe.organizationId, member);
    await chat.businessMessages(cafe.organizationId, member, t.threadId);
    await chat.businessMessages(cafe.organizationId, member, t.threadId);
    clock.advance(11 * 60_000);
    await chat.businessMessages(cafe.organizationId, member, t.threadId);
    await chat.businessReply(cafe.organizationId, member, t.threadId, 'سلام');
    const log = await chat.accessLog(cafe.organizationId);
    expect(log.map((e) => e.action).sort()).toEqual(['list', 'read', 'read', 'reply']);
    expect(await code(chat.customerSend(cafe, customer, { body: 'x'.repeat(1001) }))).toBe('INPUT_INVALID');
  });
});
