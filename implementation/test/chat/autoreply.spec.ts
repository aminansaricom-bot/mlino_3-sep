import crypto from 'node:crypto';
import { ChatModule, type BusinessFacts, type PublishedBusinessRef } from '../../chat';
import { answer, similarity } from '../../chat/autoreply';
import { Clock, pools, resetSchemas } from './support';

const facts: BusinessFacts = {
  name: 'کافه نیلوفر (آزمایشی)',
  address: 'ونک، خیابان ملاصدرا',
  phone: null,
  hours: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, intervals: [{ open: '08:00', close: '23:30' }] })),
  items: [{ name: 'لاته', price: '۱۴۵٬۰۰۰ ریال' }, { name: 'ماچا لاته', price: '۱۶۵٬۰۰۰ ریال' }, { name: 'چیزکیک', price: null }],
  offers: [{ name: '۲۰٪ تخفیف ماچا لاته', until: '۱۰ مهر' }],
};

describe('auto-reply answers only from approved knowledge or published facts (D-75)', () => {
  it('answers published facts and escalates everything else instead of guessing', () => {
    expect(answer('ساعت چند باز هستید؟', [], facts)).toMatchObject({ kind: 'fact', text: expect.stringContaining('۰۸:۰۰ تا ۲۳:۳۰') });
    expect(answer('ماچا لاته چنده؟', [], facts)).toMatchObject({ kind: 'fact', text: expect.stringContaining('۱۶۵٬۰۰۰') });
    expect(answer('چیزکیک دارید؟', [], facts)).toMatchObject({ kind: 'fact', text: expect.stringContaining('قیمتش منتشر نشده') });
    expect(answer('آدرستون کجاست', [], facts)).toMatchObject({ kind: 'fact', text: expect.stringContaining('ملاصدرا') });
    expect(answer('تخفیف دارید؟', [], facts)).toMatchObject({ kind: 'fact', text: expect.stringContaining('ماچا') });
    for (const q of ['پارکینگ دارید؟', 'شماره تلفنتون چنده؟', 'کیک تولد سفارش میگیرید؟', 'اسپرسو دارید؟']) expect(answer(q, [], facts).kind).toBe('unknown');
    expect(answer('سلام', [], facts).kind).toBe('greeting');
  });

  it('matches an approved answer by meaning of its words, not by exact text', () => {
    const k = [{ id: 'k1', question: 'پارکینگ دارید؟', answer: 'بله، پارکینگ عمومی روبه‌روی کافه است.' }, { id: 'k2', question: 'کیک تولد سفارش می‌گیرید؟', answer: 'بله، با دو روز هماهنگی.' }];
    expect(answer('ببخشید پارکینگ هم دارین؟', k, facts)).toEqual({ kind: 'knowledge', entryId: 'k1', text: k[0].answer });
    expect(answer('برای تولد کیک سفارش میگیرین', k, facts)).toMatchObject({ kind: 'knowledge', entryId: 'k2' });
    expect(similarity('وای‌فای دارید؟', 'پارکینگ دارید؟')).toBeLessThan(0.6);
    expect(answer('وای فای دارید؟', k, facts).kind).toBe('unknown');
  });
});

describe('escalate → owner answers → learned → reused', () => {
  const { core, chat: chatDb } = pools();
  const cafe: PublishedBusinessRef = { organizationId: 'test-demo-07', name: facts.name, sensitive: false };
  const owner = crypto.randomUUID();
  let chat: ChatModule;
  let clock: Clock;
  beforeEach(async () => { await resetSchemas(core, chatDb); clock = new Clock(); chat = new ChatModule(chatDb, { now: clock.now }); });
  afterAll(async () => { await core.end(); await chatDb.end(); });
  const on = async () => ({ facts });

  it('the full loop, with labelled automatic messages and no auto-reply unless the caller allows it', async () => {
    const a = { ref: crypto.randomUUID(), test: false };
    const t = await chat.customerSend(cafe, a, { name: 'سارا', body: 'پارکینگ دارید؟' }, on);
    let msgs = (await chat.customerMessages(a.ref, t.threadId)).messages;
    expect(msgs.map((m) => [m.sender, m.auto])).toEqual([['customer', false], ['business', true]]);
    expect(msgs[1].body).toContain('حدس نمی‌زنم');
    clock.advance(1000);
    await chat.customerReply(a, t.threadId, 'وای‌فای هم دارید؟', on);
    expect((await chat.customerMessages(a.ref, t.threadId)).messages.filter((m) => m.auto)).toHaveLength(1);
    const pending = await chat.pending(cafe.organizationId);
    expect(pending.map((p) => p.question)).toEqual(['پارکینگ دارید؟', 'وای‌فای هم دارید؟']);
    expect((await chat.summary(cafe.organizationId)).pendingQuestions).toBe(2);

    clock.advance(1000);
    const r = await chat.answerPending(cafe.organizationId, owner, pending[0].id, { answer: 'بله، پارکینگ عمومی روبه‌روی کافه است.', learn: true, question: 'پارکینگ دارید؟' });
    expect(r.message).toMatchObject({ sender: 'business', auto: false });
    expect(r.knowledgeId).toBeTruthy();
    expect((await chat.summary(cafe.organizationId)).pendingQuestions).toBe(0);

    clock.advance(1000);
    const b = { ref: crypto.randomUUID(), test: false };
    const t2 = await chat.customerSend(cafe, b, { name: 'علی', body: 'سلام پارکینگ دارین؟' }, on);
    msgs = (await chat.customerMessages(b.ref, t2.threadId)).messages;
    expect(msgs[1]).toMatchObject({ sender: 'business', auto: true, body: 'بله، پارکینگ عمومی روبه‌روی کافه است.' });
    expect((await chat.knowledge(cafe.organizationId))[0]).toMatchObject({ learned: true, uses: 1 });

    const c = { ref: crypto.randomUUID(), test: false };
    const t3 = await chat.customerSend(cafe, c, { name: 'رضا', body: 'پارکینگ دارید؟' });
    expect((await chat.customerMessages(c.ref, t3.threadId)).messages).toHaveLength(1);
  });

  it('knowledge is per business, editable and deletable only by that business', async () => {
    const id = await chat.saveKnowledge(cafe.organizationId, owner, { question: 'سگ همراه مجاز است؟', answer: 'بله، در فضای باز.' });
    await expect(chat.saveKnowledge('test-demo-08', owner, { id, question: 'x', answer: 'y' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(chat.deleteKnowledge('test-demo-08', owner, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await chat.saveKnowledge(cafe.organizationId, owner, { id, question: 'حیوان خانگی مجاز است؟', answer: 'بله، فقط در فضای باز.' });
    expect((await chat.knowledge(cafe.organizationId))[0]).toMatchObject({ question: 'حیوان خانگی مجاز است؟' });
    expect(await chat.knowledge('test-demo-08')).toEqual([]);
    await chat.deleteKnowledge(cafe.organizationId, owner, id);
    expect(await chat.knowledge(cafe.organizationId)).toEqual([]);
  });

  it('a manual reply also closes the open question; erasing the conversation removes its pending questions', async () => {
    const a = { ref: crypto.randomUUID(), test: false };
    const t = await chat.customerSend(cafe, a, { name: 'سارا', body: 'پارکینگ دارید؟' }, on);
    clock.advance(1000);
    await chat.businessReply(cafe.organizationId, owner, t.threadId, 'بله');
    expect(await chat.pending(cafe.organizationId)).toEqual([]);
    await chat.customerReply(a, t.threadId, 'وای‌فای دارید؟', on);
    expect(await chat.pending(cafe.organizationId)).toHaveLength(1);
    await chat.erase('customer', a.ref, t.threadId, a.ref);
    expect(await chat.pending(cafe.organizationId)).toEqual([]);
  });
});
