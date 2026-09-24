// «ملینو» background task (D-77, D-79): nearby offers, computed ON THE PHONE.
// The phone's position never leaves the device. The task reads only the public offers file that anyone can
// download, compares it with the position here, and shows a local notification. No server call carries location.
// Rules (same as the server-side alerts): opt-in only, radius offers of PRO/MAX businesses (record.promoted),
// at most 3 a day, none 22:00–08:00 Tehran, never the same offer twice.

var EXPORT_URL = 'https://explore.mlino.site/public-export/public-business.v1.json';
var DAILY_CAP = 3;

function readJson(key, fallback) {
  try { var v = CapacitorKV.get(key); return v && v.value ? JSON.parse(v.value) : fallback; } catch (e) { return fallback; }
}
function writeJson(key, value) { CapacitorKV.set(key, JSON.stringify(value)); }

function distance(a, b) {
  var r = function (d) { return d * Math.PI / 180; };
  var h = Math.pow(Math.sin(r(b[0] - a[0]) / 2), 2) + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.pow(Math.sin(r(b[1] - a[1]) / 2), 2);
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The demo shows its fictional businesses around the viewer (demo relocation). Map the viewer back into the
// data's own frame so distances match what the map shows.
function toDataFrame(p, anchor, target) {
  if (!anchor || !target) return p;
  var north = p[0] - target[0];
  var east = (p[1] - target[1]) * Math.cos(target[0] * Math.PI / 180) / Math.cos(anchor[0] * Math.PI / 180);
  return [anchor[0] + north, anchor[1] + east];
}

function clean(s) { return String(s || '').replace(/\s*\(آزمایشی\)/g, ''); }

// The app (web view) turns this on or off and passes the demo frame. Nothing else is stored.
addEventListener('configure', function (resolve, reject, args) {
  try {
    if (!args || !args.enabled) { CapacitorKV.remove('cfg'); CapacitorKV.remove('state'); CapacitorKV.remove('taps'); resolve({ enabled: false }); return; }
    writeJson('cfg', { enabled: true, anchor: args.anchor || null, target: args.target || null });
    resolve({ enabled: true });
  } catch (e) { reject(String(e)); }
});

// A tapped notification: which business to open.
addEventListener('tapTarget', function (resolve, reject, args) {
  var taps = readJson('taps', {});
  resolve({ url: taps[String(args && args.id)] || '/' });
});

addEventListener('checkNearby', async function (resolve, reject) {
  try {
    var cfg = readJson('cfg', null);
    if (!cfg || !cfg.enabled) { resolve(); return; }
    var now = Date.now();
    var tehran = new Date(now + 210 * 60000);
    var hour = tehran.getUTCHours();
    var day = tehran.toISOString().slice(0, 10);
    if (hour >= 22 || hour < 8) { resolve(); return; }
    var st = readJson('state', { day: day, count: 0, seen: [] });
    if (st.day !== day) { st.day = day; st.count = 0; }
    if (st.count >= DAILY_CAP) { resolve(); return; }

    var pos = await CapacitorGeolocation.getCurrentPosition();
    if (!pos || typeof pos.latitude !== 'number') { resolve(); return; }
    var here = toDataFrame([pos.latitude, pos.longitude], cfg.anchor, cfg.target);

    var res = await fetch(EXPORT_URL, { cache: 'no-store' });
    if (!res.ok) { resolve(); return; }
    var doc = await res.json();
    var found = null;
    (doc.records || []).forEach(function (rec) {
      if (found || rec.promoted !== true || !rec.business || !rec.business.location) return;
      var loc = rec.business.location;
      if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
      var d = distance(here, [loc.latitude, loc.longitude]);
      (rec.offers || []).forEach(function (o) {
        if (found || typeof o.visibility_radius_meters !== 'number' || d > o.visibility_radius_meters) return;
        if (Date.parse(o.valid_from) > now || (o.valid_until && Date.parse(o.valid_until) <= now)) return;
        if (st.seen.indexOf(o.offer_version_id) !== -1) return;
        found = { rec: rec, offer: o };
      });
    });
    if (!found) { writeJson('state', st); resolve(); return; }

    var id = Math.floor(now / 1000) % 2000000000;
    var url = '/?org=' + encodeURIComponent(found.rec.business.organization_id) + '&offer=' + encodeURIComponent(found.offer.offer_version_id);
    CapacitorNotifications.schedule([{ id: id, title: clean(found.rec.business.name), body: clean(found.offer.name), smallIcon: 'ic_stat_mlino', autoCancel: true }]);
    var taps = readJson('taps', {});
    taps[String(id)] = url;
    var keys = Object.keys(taps);
    if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(function (k) { delete taps[k]; });
    writeJson('taps', taps);
    st.count += 1;
    st.seen = st.seen.concat([found.offer.offer_version_id]).slice(-200);
    writeJson('state', st);
    resolve();
  } catch (e) {
    resolve(); // a failed check simply waits for the next one
  }
});
