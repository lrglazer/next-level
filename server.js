// Next Level server: accounts, posts with photos, props, comments, DMs, NIL offers with server-side
// compliance checks, brand campaigns, follows, reports and blocking. No dependencies beyond Node.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createDB } = require('./lib/db');
const { BANNED, CATS, DELIVERABLES, checkOffer, clean } = require('./lib/rules');

const PORT = +process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC = path.join(__dirname, 'public');
const db = createDB(DATA);
const D = db.data;
const err = db.err;

const ROLES = ['athlete', 'brand', 'coach', 'fan'];
const TYPES = ['Highlight', 'Game day', 'Training log', 'Behind the scenes', 'NIL partner'];
const PROPS = ['clutch', 'locked', 'goat'];
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
const today = () => new Date().toISOString().slice(0, 10);

// ---- what other people may see about a user ----
function pub(u) {
  if (!u) return null;
  const followers = D.follows.filter(f => f.to === u.id).length;
  return { id: u.id, role: u.role, f: u.f, l: u.l, sch: u.sch || '', sp: u.sp || '', pos: u.pos || '', yr: u.yr || '', st: u.st || '',
    num: u.num || '', bio: u.bio || '', rate: u.rate || null, open: u.open || [], brand: u.brand || null,
    verified: !!u.verified, fol: followers, fing: D.follows.filter(f => f.by === u.id).length, deals: D.offers.filter(o => o.to === u.id && o.status !== 'Declined' && o.status !== 'Offer').length };
}
const me = u => ({ ...pub(u), email: u.email, blocked: u.blocked || [], intl: !!u.intl });
const userById = id => D.users.find(u => u.id === +id);
const hidden = (viewer, byId) => viewer && ((viewer.blocked || []).includes(byId) || (userById(byId)?.blocked || []).includes(viewer.id));
const reported = (kind, id) => D.reports.filter(r => r.kind === kind && r.id === id).length >= 3; // auto-hide after 3 reports

function postOut(p, viewer) {
  const props = { clutch: 0, locked: 0, goat: 0 };
  let mine = null;
  for (const x of D.props) if (x.post === p.id) { props[x.k] += 1; if (viewer && x.by === viewer.id) mine = x.k; }
  return { id: p.id, by: p.by, type: p.type, sport: p.sport, season: p.season, tag: p.tag, pr: p.pr, partner: p.partner, cap: p.cap,
    img: p.img ? '/media/' + p.img : null, props, mine, cm: D.comments.filter(c => c.post === p.id && !reported('comment', c.id)).length, at: p.at };
}
// Props and comments on the built-in sample posts (ids under 1000) are stored too, so they stay real.
function extrasFor(ids, viewer) {
  const out = {};
  for (const id of ids) {
    const props = { clutch: 0, locked: 0, goat: 0 }; let mine = null;
    for (const x of D.props) if (x.post === id) { props[x.k] += 1; if (viewer && x.by === viewer.id) mine = x.k; }
    out[id] = { props, mine };
  }
  return out;
}
function commentsOut(viewer) {
  const out = {};
  for (const c of D.comments) {
    if (reported('comment', c.id) || hidden(viewer, c.by)) continue;
    const u = userById(c.by); if (!u) continue;
    (out[c.post] = out[c.post] || []).push({ id: c.id, by: c.by, name: u.f + ' ' + u.l, t: c.t, at: c.at });
  }
  for (const k of Object.keys(out)) out[k] = out[k].slice(-60);
  return out;
}
function threadOut(t, viewer) {
  const other = userById(t.a === viewer.id ? t.b : t.a);
  return { id: t.id, with: pub(other), request: t.request && t.b === viewer.id, pending: t.request && t.a === viewer.id,
    unread: t.log.filter(m => m.by !== viewer.id && m.at > (t.read?.[viewer.id] || 0)).length,
    log: t.log.map(m => ({ by: m.by === viewer.id ? 'me' : 'them', t: m.t, offer: m.offer ? offerOut(D.offers.find(o => o.id === m.offer)) : null, post: m.post || null, at: m.at })) };
}
function offerOut(o) { return o && { id: o.id, brand: o.brandName, brandId: o.brand, cat: o.cat, to: o.to, amt: o.amt, del: o.del, what: o.what, due: o.due, status: o.status, checks: o.checks, at: o.at }; }

function sync(viewer) {
  const visible = D.posts.filter(p => !reported('post', p.id) && !hidden(viewer, p.by));
  return {
    me: viewer ? me(viewer) : null,
    users: D.users.filter(u => !hidden(viewer, u.id)).map(pub),
    posts: visible.sort((a, b) => b.at - a.at).slice(0, 300).map(p => postOut(p, viewer)),
    sample: extrasFor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], viewer),
    comments: commentsOut(viewer),
    threads: viewer ? D.threads.filter(t => (t.a === viewer.id || t.b === viewer.id) && !hidden(viewer, t.a === viewer.id ? t.b : t.a)).sort((x, y) => y.last - x.last).map(t => threadOut(t, viewer)) : [],
    offers: viewer ? D.offers.filter(o => o.to === viewer.id || o.brand === viewer.id).map(offerOut) : [],
    campaigns: D.campaigns.filter(c => !c.closed).map(c => ({ ...c, applied: viewer ? D.apps.some(a => a.camp === c.id && a.by === viewer.id) : false,
      applicants: viewer && c.brand === viewer.id ? D.apps.filter(a => a.camp === c.id).map(a => pub(userById(a.by))).filter(Boolean) : undefined,
      taken: D.apps.filter(a => a.camp === c.id && a.status === 'Accepted').length, count: D.apps.filter(a => a.camp === c.id).length })),
    following: viewer ? D.follows.filter(f => f.by === viewer.id).map(f => f.to) : [],
    rules: { BANNED, CATS, DELIVERABLES }
  };
}

// ---- small helpers for limits ----
const hits = new Map();
function limit(key, max, ms) {
  const now = Date.now(), list = (hits.get(key) || []).filter(t => now - t < ms);
  if (list.length >= max) throw err(429, 'Slow down a little and try again in a minute.');
  list.push(now); hits.set(key, list);
}
function daily(u, kind, max) {
  const n = D.posts.filter(p => p.by === u.id && kind === 'post' && new Date(p.at).toISOString().slice(0, 10) === today()).length;
  if (n >= max) throw err(429, `That’s the daily limit of ${max} posts. Try again tomorrow.`);
}
function findThread(a, b) { return D.threads.find(t => (t.a === a && t.b === b) || (t.a === b && t.b === a)); }
function addMessage(from, toId, msg) {
  const to = userById(toId);
  if (!to || to.id === from.id) throw err(404, 'That account doesn’t exist.');
  if (hidden(from, to.id)) throw err(403, 'You can’t message this account.');
  let t = findThread(from.id, to.id);
  if (!t) {
    // First message from someone the athlete doesn't follow lands in Requests until they accept.
    const follows = D.follows.some(f => f.by === to.id && f.to === from.id);
    t = { id: db.nextId(), a: from.id, b: to.id, request: !follows, log: [], read: {}, last: 0 };
    D.threads.push(t);
  }
  if (t.request && t.b === from.id) t.request = false; // replying accepts the request
  t.log.push({ by: from.id, at: Date.now(), ...msg }); t.last = Date.now(); t.read[from.id] = Date.now();
  if (t.log.length > 500) t.log = t.log.slice(-500);
  db.touch('threads');
  return t;
}

// ---- routes ----
const routes = {
  'GET /api/status': { fn: async () => ({ ok: true, users: D.users.length, posts: D.posts.length }) },

  'POST /api/signup': { fn: async (b, ctx) => {
    limit('signup:' + ctx.ip, 20, 3600e3);
    const role = ROLES.includes(b.role) ? b.role : 'fan';
    const f = str(b.f, 30), l = str(b.l, 30);
    if (!f || !l) throw err(400, role === 'brand' ? 'Add your first and last name (you can add the brand name below).' : 'Add your first and last name.');
    if (!b.terms) throw err(400, 'Agree to the terms to make an account.');
    if (role === 'athlete' && !str(b.sch, 60)) throw err(400, 'Add your school so your compliance office can verify you.');
    if (role === 'brand' && !str(b.brandName, 60)) throw err(400, 'Add your brand or business name.');
    if (role === 'brand' && BANNED.includes(b.cat)) throw err(400, `${b.cat} brands can’t work with college athletes on Next Level.`);
    const fields = { role, f, l, sch: str(b.sch, 60), sp: str(b.sp, 30), pos: str(b.pos, 12), yr: str(b.yr, 6), st: str(b.st, 2).toUpperCase(),
      num: str(b.num, 3), bio: '', verified: false, adult: !!b.adult };
    if (role === 'athlete') { fields.rate = [150, 500, 1000]; fields.open = ['Apparel', 'Fitness', 'Food & drink']; fields.intl = !!b.intl; }
    if (role === 'brand') fields.brand = { name: str(b.brandName, 60), cat: CATS.includes(b.cat) ? b.cat : 'Local business', site: str(b.site, 100) };
    if (role === 'athlete' && !b.adult) throw err(400, 'College athlete accounts are for enrolled students 18 or older for now.');
    const u = db.createUser(b.email, b.password, fields);
    return { token: db.newSession(u), ...sync(u) };
  } },
  'POST /api/login': { fn: async (b, ctx) => {
    limit('login:' + ctx.ip, 10, 600e3);
    const u = db.checkLogin(b.email, b.password);
    if (!u) throw err(401, 'That email and password don’t match.');
    return { token: db.newSession(u), ...sync(u) };
  } },
  'POST /api/logout': { auth: true, fn: async (b, ctx) => { db.endSession(ctx.token); return { ok: true }; } },
  'GET /api/sync': { fn: async (b, ctx) => sync(ctx.user) },

  'POST /api/me': { auth: true, fn: async (b, ctx) => {
    const u = ctx.user;
    for (const k of ['f', 'l', 'sch', 'sp', 'pos']) if (b[k] != null) u[k] = str(b[k], k === 'sch' ? 60 : 30) || u[k];
    if (b.bio != null) { if (!clean(b.bio)) throw err(400, 'Keep your bio respectful.'); u.bio = str(b.bio, 160); }
    if (b.num != null) u.num = str(b.num, 3);
    if (b.yr != null) u.yr = str(b.yr, 6);
    if (u.role === 'athlete') {
      if (Array.isArray(b.rate)) u.rate = b.rate.slice(0, 3).map(x => num(x, 0, 100000));
      if (Array.isArray(b.open)) u.open = b.open.filter(c => CATS.includes(c));
    }
    db.touch('users');
    return sync(u);
  } },
  'POST /api/delete-account': { auth: true, fn: async (b, ctx) => {
    if (!db.checkLogin(ctx.user.email, b.password)) throw err(401, 'Enter your password to delete your account.');
    db.deleteUser(ctx.user); return { ok: true };
  } },

  'POST /api/posts': { auth: true, fn: async (b, ctx) => {
    const u = ctx.user;
    if (u.role !== 'athlete') throw err(403, 'Only college athlete accounts can post to the Locker.');
    limit('post:' + u.id, 6, 600e3); daily(u, 'post', 30);
    const cap = str(b.cap, 600), type = TYPES.includes(b.type) ? b.type : 'Highlight';
    if (!b.img && !cap) throw err(400, 'Add a photo or write a caption first.');
    if (!clean(cap)) throw err(400, 'Keep it respectful. That caption can’t be posted.');
    const p = { id: db.nextId(), by: u.id, type, sport: u.sp || 'Other', season: str(b.season, 20) || new Date().getFullYear() + ' season',
      tag: str(b.tag, 60), pr: str(b.pr, 60), partner: type === 'NIL partner' ? str(b.partner, 60) : '', cap: cap || '—', img: b.img ? db.saveMedia(b.img) : null, at: Date.now() };
    D.posts.push(p); db.touch('posts');
    return { post: postOut(p, u) };
  } },
  'POST /api/posts/delete': { auth: true, fn: async (b, ctx) => {
    const p = D.posts.find(x => x.id === +b.id);
    if (!p || p.by !== ctx.user.id) throw err(404, 'Post not found.');
    db.removeMedia(p.img); D.posts.splice(D.posts.indexOf(p), 1);
    D.comments = D.comments.filter(c => c.post !== p.id); D.props = D.props.filter(x => x.post !== p.id);
    db.touch('posts', 'comments', 'props'); return { ok: true };
  } },
  'POST /api/props': { auth: true, fn: async (b, ctx) => {
    const id = +b.post, k = b.k;
    if (!(id < 1000 || D.posts.some(p => p.id === id))) throw err(404, 'Post not found.');
    limit('prop:' + ctx.user.id, 120, 60e3);
    const cur = D.props.find(x => x.post === id && x.by === ctx.user.id);
    if (cur && (cur.k === k || !PROPS.includes(k))) D.props.splice(D.props.indexOf(cur), 1);
    else if (cur) cur.k = k;
    else if (PROPS.includes(k)) D.props.push({ post: id, by: ctx.user.id, k });
    db.touch('props');
    return { ok: true };
  } },
  'POST /api/comments': { auth: true, fn: async (b, ctx) => {
    const id = +b.post, t = str(b.t, 300);
    if (!t) throw err(400, 'Write something first.');
    if (!clean(t)) throw err(400, 'Keep it respectful. That comment can’t be posted.');
    if (!(id < 1000 || D.posts.some(p => p.id === id))) throw err(404, 'Post not found.');
    limit('cm:' + ctx.user.id, 20, 60e3);
    const c = { id: db.nextId(), post: id, by: ctx.user.id, t, at: Date.now() };
    D.comments.push(c); db.touch('comments');
    return { comment: { id: c.id, by: c.by, name: ctx.user.f + ' ' + ctx.user.l, t, at: c.at } };
  } },
  'POST /api/follow': { auth: true, fn: async (b, ctx) => {
    const to = userById(b.to); if (!to || to.id === ctx.user.id) throw err(404, 'That account doesn’t exist.');
    const i = D.follows.findIndex(f => f.by === ctx.user.id && f.to === to.id);
    if (i >= 0) D.follows.splice(i, 1); else D.follows.push({ by: ctx.user.id, to: to.id, at: Date.now() });
    db.touch('follows'); return { following: i < 0 };
  } },

  'POST /api/dm': { auth: true, fn: async (b, ctx) => {
    const t = str(b.t, 1000);
    if (!t && !b.post) throw err(400, 'Write a message first.');
    if (!clean(t)) throw err(400, 'Keep it respectful. That message can’t be sent.');
    limit('dm:' + ctx.user.id, 30, 60e3);
    const msg = { t };
    if (b.post && D.posts.some(p => p.id === +b.post)) msg.post = +b.post;
    const th = addMessage(ctx.user, b.to, msg);
    return { thread: threadOut(th, ctx.user) };
  } },
  'POST /api/dm/read': { auth: true, fn: async (b, ctx) => {
    const t = D.threads.find(x => x.id === +b.id && (x.a === ctx.user.id || x.b === ctx.user.id));
    if (t) { t.read[ctx.user.id] = Date.now(); db.touch('threads'); }
    return { ok: true };
  } },
  'POST /api/dm/request': { auth: true, fn: async (b, ctx) => {
    const t = D.threads.find(x => x.id === +b.id && x.b === ctx.user.id);
    if (!t) throw err(404, 'Conversation not found.');
    if (b.accept) t.request = false; else D.threads.splice(D.threads.indexOf(t), 1);
    db.touch('threads'); return { ok: true };
  } },

  // A brand checks an offer before sending: the page shows these results live.
  'POST /api/offers/check': { auth: true, fn: async (b, ctx) => {
    const a = userById(b.to); if (!a || a.role !== 'athlete') throw err(404, 'That athlete doesn’t exist.');
    return { checks: checkOffer(offerFields(b), a) };
  } },
  'POST /api/offers': { auth: true, fn: async (b, ctx) => {
    const u = ctx.user;
    if (u.role !== 'brand') throw err(403, 'Only brand accounts can send NIL offers.');
    const a = userById(b.to); if (!a || a.role !== 'athlete') throw err(404, 'That athlete doesn’t exist.');
    limit('offer:' + u.id, 20, 3600e3);
    const o = offerFields(b), checks = checkOffer(o, a);
    if (checks.some(c => !c.ok)) throw err(400, 'This offer can’t be sent. ' + checks.filter(c => !c.ok).map(c => c.d).join(' '));
    const offer = { id: db.nextId(), brand: u.id, brandName: u.brand?.name || u.f + ' ' + u.l, to: a.id, ...o, checks, status: 'Offer', at: Date.now() };
    D.offers.push(offer); db.touch('offers');
    addMessage(u, a.id, { t: str(b.note, 400) || `Hi ${a.f}! We’d love to work with you.`, offer: offer.id });
    return { offer: offerOut(offer) };
  } },
  'POST /api/offers/respond': { auth: true, fn: async (b, ctx) => {
    const o = D.offers.find(x => x.id === +b.id && x.to === ctx.user.id);
    if (!o) throw err(404, 'Offer not found.');
    if (o.status !== 'Offer') throw err(400, 'You already answered this offer.');
    o.status = b.accept ? 'Active' : 'Declined'; o.answered = Date.now(); db.touch('offers');
    addMessage(ctx.user, o.brand, { t: b.accept ? `Accepted your offer ($${o.amt.toLocaleString()}). Sending it to my compliance office now.` : 'Thanks for the offer, but I’m going to pass on this one.' });
    return { offer: offerOut(o) };
  } },

  'POST /api/campaigns': { auth: true, fn: async (b, ctx) => {
    const u = ctx.user;
    if (u.role !== 'brand') throw err(403, 'Only brand accounts can post campaigns.');
    const title = str(b.title, 60), del = str(b.del, 160);
    if (!title || !del) throw err(400, 'Add a title and what athletes will post.');
    const text = title + ' ' + del + ' ' + str(b.need, 160);
    if (/\b(commit|transfer|enroll|per (touchdown|goal|win))\b/i.test(text)) throw err(400, 'Campaigns can’t be tied to school choice or performance.');
    const c = { id: db.nextId(), brand: u.id, brandName: u.brand?.name || '', cat: u.brand?.cat || 'Local business', title, del, need: str(b.need, 160) || 'Any sport',
      pay: str(b.pay, 40) || 'Paid', spots: num(b.spots, 1, 500), due: str(b.due, 40) || 'Rolling', at: Date.now() };
    D.campaigns.push(c); db.touch('campaigns');
    return { campaign: c };
  } },
  'POST /api/campaigns/apply': { auth: true, fn: async (b, ctx) => {
    if (ctx.user.role !== 'athlete') throw err(403, 'Only college athlete accounts can apply.');
    const c = D.campaigns.find(x => x.id === +b.id && !x.closed);
    if (!c) throw err(404, 'That campaign is closed.');
    if (D.apps.some(a => a.camp === c.id && a.by === ctx.user.id)) return { ok: true };
    D.apps.push({ id: db.nextId(), camp: c.id, by: ctx.user.id, status: 'Applied', at: Date.now() }); db.touch('apps');
    return { ok: true };
  } },

  'POST /api/report': { auth: true, fn: async (b, ctx) => {
    const kind = ['post', 'comment', 'user', 'message'].includes(b.kind) ? b.kind : 'post';
    if (!D.reports.some(r => r.by === ctx.user.id && r.kind === kind && r.id === +b.id))
      D.reports.push({ by: ctx.user.id, kind, id: +b.id, why: str(b.why, 200), at: Date.now() });
    db.touch('reports'); return { ok: true };
  } },
  'POST /api/block': { auth: true, fn: async (b, ctx) => {
    const id = +b.id, list = ctx.user.blocked = ctx.user.blocked || [];
    const i = list.indexOf(id); if (i >= 0) list.splice(i, 1); else list.push(id);
    D.follows = D.follows.filter(f => !(f.by === ctx.user.id && f.to === id) && !(f.by === id && f.to === ctx.user.id));
    db.touch('users', 'follows'); return { blocked: i < 0 };
  } }
};
function offerFields(b) {
  return { cat: CATS.includes(b.cat) || BANNED.includes(b.cat) ? b.cat : 'Local business', del: num(b.del, 0, 2), amt: num(b.amt, 0, 1e6),
    perf: !!b.perf, what: str(b.what, 200) || DELIVERABLES[num(b.del, 0, 2)], due: str(b.due, 30) || 'Flexible', note: str(b.note, 400) };
}

// ---- HTTP ----
const TYPES_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req, max = 4e6) {
  return new Promise((ok, bad) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { bad(err(413, 'That upload is too large.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { bad(err(400, 'Bad request.')); } });
    req.on('error', bad);
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      const route = routes[req.method + ' ' + url.pathname];
      if (!route) return send(res, 404, { error: 'Not found.' });
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const user = token ? db.userFromToken(token) : null;
      if (route.auth && !user) return send(res, 401, { error: 'Log in first.' });
      const body = req.method === 'POST' ? await readBody(req) : {};
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      const out = await route.fn(body, { req, user, token, ip });
      return send(res, 200, out, undefined, { 'cache-control': 'no-store' });
    }
    if (url.pathname.startsWith('/media/')) {
      const f = db.mediaPath(url.pathname.slice(7));
      if (!f || !fs.existsSync(f)) return send(res, 404, 'Not found', 'text/plain');
      return send(res, 200, fs.readFileSync(f), TYPES_MIME[path.extname(f)], { 'cache-control': 'public, max-age=31536000, immutable' });
    }
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const f = path.normalize(path.join(PUBLIC, p));
    if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, fs.readFileSync(f), TYPES_MIME[path.extname(f)] || 'application/octet-stream', { 'cache-control': p.endsWith('.html') ? 'no-cache' : 'public, max-age=300' });
  } catch (e) {
    if (!e.status) console.error(e);
    send(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong on our side. Try again.' });
  }
});
if (require.main === module) server.listen(PORT, () => console.log('Next Level on :' + PORT));
module.exports = { server, db };
