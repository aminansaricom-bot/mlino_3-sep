// «ملینو کسب‌وکار» background task (D-79): new customer messages and unanswered questions.
// Uses a device key that can read ONE thing — the aggregate chat summary of ONE business (no message text,
// no customer name). Membership and grant are checked by the server on every use; turning notifications off
// or «خروج از همه‌ی دستگاه‌ها» ends the key.

var SUMMARY_URL = 'https://business.mlino.site/api/device/chat-summary';

function readJson(key, fallback) {
  try { var v = CapacitorKV.get(key); return v && v.value ? JSON.parse(v.value) : fallback; } catch (e) { return fallback; }
}
function writeJson(key, value) { CapacitorKV.set(key, JSON.stringify(value)); }
function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[Number(d)]; }); }

addEventListener('configure', function (resolve, reject, args) {
  try {
    if (!args || !args.enabled || !args.key) { CapacitorKV.remove('cfg'); CapacitorKV.remove('last'); resolve({ enabled: false }); return; }
    writeJson('cfg', { enabled: true, key: args.key });
    resolve({ enabled: true });
  } catch (e) { reject(String(e)); }
});

addEventListener('tapTarget', function (resolve) { resolve({ url: '/storefront/chat' }); });

addEventListener('checkInbox', async function (resolve, reject) {
  try {
    var cfg = readJson('cfg', null);
    if (!cfg || !cfg.enabled) { resolve(); return; }
    var res = await fetch(SUMMARY_URL, { headers: { Authorization: 'Bearer ' + cfg.key } });
    if (res.status === 401 || res.status === 403) { CapacitorKV.remove('cfg'); resolve(); return; } // key ended: stop quietly
    if (!res.ok) { resolve(); return; }
    var s = await res.json();
    var last = readJson('last', { unread: 0, pending: 0 });
    var newer = s.unreadMessages > last.unread || s.pendingQuestions > last.pending;
    writeJson('last', { unread: s.unreadMessages, pending: s.pendingQuestions });
    if (!newer) { resolve(); return; }
    var parts = [];
    if (s.unreadMessages) parts.push(fa(s.unreadMessages) + ' پیام خوانده‌نشده');
    if (s.pendingQuestions) parts.push(fa(s.pendingQuestions) + ' سؤال منتظر جواب شما');
    CapacitorNotifications.schedule([{ id: 1, title: s.organizationName || 'ملینو کسب‌وکار', body: parts.join('، '), smallIcon: 'ic_stat_mlino', autoCancel: true }]);
    resolve();
  } catch (e) {
    resolve();
  }
});
