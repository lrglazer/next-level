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
const STAGES = ['Watching', 'Evaluating', 'Offered', 'Committed'];
const httpsUrl = (v) => { const s = str(v, 200); return /^https:\/\/[^\s]+\.[^\s]+$/i.test(s) ? s : ''; };
const handle = (v) => str(v, 40).replace(/^@+/, '').replace(/[^A-Za-z0-9._]/g, '');
const pairs = (list, max) => (Array.isArray(list) ? list : []).slice(0, max)
  .map(x => ({ k: str(x && x.k, 24), v: str(x && x.v, 16) })).filter(x => x.k && x.v);
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
const today = () => new Date().toISOString().slice(0, 10);

// ---- what other people may see about a user ----
function pub(u) {
  if (!u) return null;
  const followers = D.follows.filter(f => f.to === u.id).length;
  return { id: u.id, role: u.role, f: u.f, l: u.l, sch: u.sch || '', sp: u.sp || '', pos: u.pos || '', yr: u.yr || '', st: u.st || '',
    num: u.num || '', bio: u.bio || '', rate: u.rate || null, open: u.open || [], brand: u.brand || null,
    av: u.av ? '/media/' + u.av : null, ht: u.ht || '', wt: u.wt || '', home: u.home || '', grad: u.grad || '', gpa: u.gpa || '', major: u.major || '',
    hl: u.hl || '', soc: u.soc || {}, stats: u.stats || [], meas: u.meas || [], awards: u.awards || [], title: u.title || '', div: u.div || '',
    open4: !!u.open4, portal: !!u.portal, created: u.created || 0,
    verified: !!u.verified, fol: followers, fing: D.follows.filter(f => f.by === u.id).length, deals: D.offers.filter(o => o.to === u.id && ['Active', 'Delivered', 'Completed'].includes(o.status)).length };
}
const ADMINS = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const isAdmin = u => !!u && ADMINS.includes(u.email);
const me = u => ({ ...pub(u), email: u.email, blocked: u.blocked || [], intl: !!u.intl, admin: isAdmin(u), tempPw: !!u.tempPw, views: u.role === 'athlete' ? viewsFor(u) : null });
// Who looked at an athlete: counts by coaches and brands, plus the schools coaches came from. Never names individuals.
function viewsFor(u) {
  const now = Date.now(), week = D.views.filter(v => v.athlete === u.id && now - v.at < 7 * 86400e3), month = D.views.filter(v => v.athlete === u.id && now - v.at < 30 * 86400e3);
  return { coach7: week.filter(v => v.role === 'coach').length, brand7: week.filter(v => v.role === 'brand').length, total30: month.length,
    schools: [...new Set(month.filter(v => v.role === 'coach' && v.sch).map(v => v.sch))].slice(0, 6) };
}
const userById = id => D.users.find(u => u.id === +id);
const hidden = (viewer, byId) => viewer && ((viewer.blocked || []).includes(byId) || (userById(byId)?.blocked || []).includes(viewer.id));
const reported = (kind, id) => D.reports.filter(r => r.kind === kind && r.id === id).length >= 3; // auto-hide after 3 reports

function postOut(p, viewer) {
  const props = { clutch: 0, locked: 0, goat: 0 };
  let mine = null;
  for (const x of D.props) if (x.post === p.id) { props[x.k] += 1; if (viewer && x.by === viewer.id) mine = x.k; }
  return { id: p.id, by: p.by, type: p.type, sport: p.sport, season: p.season, tag: p.tag, pr: p.pr, partner: p.partner, cap: p.cap,
    img: p.img ? '/media/' + p.img : null, edited: !!p.edited, props, mine, cm: D.comments.filter(c => c.post === p.id && !reported('comment', c.id)).length, at: p.at };
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
function offerOut(o) { return o && { id: o.id, brand: o.brandName, brandId: o.brand, cat: o.cat, to: o.to, amt: o.amt, del: o.del, what: o.what, due: o.due, note: o.note || '', status: o.status, checks: o.checks, proof: o.proof || '', at: o.at, answered: o.answered || 0, delivered: o.delivered || 0, completed: o.completed || 0 }; }

// What happened to you lately: offers, props, comments, follows and campaign applicants.
function notesFor(u) {
  const out = [], mine = new Set(D.posts.filter(p => p.by === u.id).map(p => p.id)), name = id => { const x = userById(id); return x ? (x.role === 'brand' && x.brand ? x.brand.name : x.f + ' ' + x.l) : 'Someone'; };
  const cap = id => { const p = D.posts.find(x => x.id === id); return p ? (p.tag || p.pr || p.cap).slice(0, 40) : 'your post'; };
  for (const o of D.offers) if (o.to === u.id) out.push({ by: o.brand, k: 'offer', who: name(o.brand), t: `sent you an NIL offer: $${o.amt.toLocaleString()}`, at: o.at, go: 'deals' });
  for (const o of D.offers) if (o.brand === u.id && o.answered) out.push({ by: o.to, k: 'offer', who: name(o.to), t: o.status === 'Declined' ? 'passed on your offer' : `accepted your $${o.amt.toLocaleString()} offer`, at: o.answered, go: 'deals' });
  for (const o of D.offers) if (o.brand === u.id && o.delivered) out.push({ by: o.to, k: 'offer', who: name(o.to), t: `marked “${o.what.slice(0, 40)}” as delivered`, at: o.delivered, go: 'deals' });
  for (const o of D.offers) if (o.to === u.id && o.completed) out.push({ by: o.brand, k: 'offer', who: name(o.brand), t: `confirmed your deal is complete`, at: o.completed, go: 'deals' });
  for (const a of D.apps) if (a.by === u.id && a.decided) { const c = D.campaigns.find(x => x.id === a.camp); if (c) out.push({ by: c.brand, k: 'camp', who: c.brandName || name(c.brand), t: a.status === 'Accepted' ? `accepted you for “${c.title}”` : `filled “${c.title}”`, at: a.decided, go: 'deals' }); }
  for (const x of D.props) if (mine.has(x.post) && x.by !== u.id && x.at) out.push({ by: x.by, k: 'props', who: name(x.by), t: `gave “${cap(x.post)}” ${x.k === 'goat' ? 'GOAT' : x.k === 'locked' ? 'Locked in' : 'Clutch'}`, at: x.at, go: 'me' });
  for (const c of D.comments) if (mine.has(c.post) && c.by !== u.id) out.push({ by: c.by, k: 'tag', who: name(c.by), t: `commented: “${c.t.slice(0, 60)}”`, at: c.at, go: 'locker' });
  for (const f of D.follows) if (f.to === u.id) out.push({ by: f.by, k: 'coach', who: name(f.by), t: 'started following you', at: f.at, go: 'me' });
  for (const v of D.views) if (v.athlete === u.id && v.role === 'coach') out.push({ by: null, k: 'view', who: 'A coach' + (v.sch ? ' from ' + v.sch : ''), t: 'viewed your profile', at: v.at, go: 'me' });
  const camps = new Set(D.campaigns.filter(c => c.brand === u.id).map(c => c.id));
  for (const a of D.apps) if (camps.has(a.camp)) out.push({ by: a.by, k: 'camp', who: name(a.by), t: 'applied to your campaign', at: a.at, go: 'campaigns' });
  return out.filter(n => !n.by || !hidden(u, n.by)).sort((a, b) => b.at - a.at).slice(0, 30).map(n => ({ ...n, hot: n.at > (u.notesRead || 0) }));
}

function sync(viewer) {
  const visible = D.posts.filter(p => !reported('post', p.id) && !hidden(viewer, p.by));
  return {
    me: viewer ? me(viewer) : null,
    users: D.users.filter(u => !hidden(viewer, u.id)).map(pub),
    posts: visible.sort((a, b) => b.at - a.at).slice(0, 300).map(p => postOut(p, viewer)),
    comments: commentsOut(viewer),
    threads: viewer ? D.threads.filter(t => (t.a === viewer.id || t.b === viewer.id) && !hidden(viewer, t.a === viewer.id ? t.b : t.a)).sort((x, y) => y.last - x.last).map(t => threadOut(t, viewer)) : [],
    offers: viewer ? D.offers.filter(o => o.to === viewer.id || o.brand === viewer.id).map(offerOut) : [],
    campaigns: D.campaigns.filter(c => !c.closed || (viewer && c.brand === viewer.id)).map(c => {
      const mine = D.apps.find(a => a.camp === c.id && viewer && a.by === viewer.id);
      return { ...c, closed: !!c.closed, applied: !!mine, appStatus: mine ? mine.status : null,
        applicants: viewer && c.brand === viewer.id ? D.apps.filter(a => a.camp === c.id).map(a => { const u = pub(userById(a.by)); return u && { ...u, app: a.id, status: a.status, appliedAt: a.at, pitch: a.pitch || '' }; }).filter(Boolean) : undefined,
        taken: D.apps.filter(a => a.camp === c.id && a.status === 'Accepted').length, count: D.apps.filter(a => a.camp === c.id).length };
    }),
    following: viewer ? D.follows.filter(f => f.by === viewer.id).map(f => f.to) : [],
    saved: viewer && viewer.role === 'brand' ? D.saves.filter(x => x.by === viewer.id).map(x => x.athlete) : [],
    board: viewer && viewer.role === 'coach' ? D.boards.filter(b => b.by === viewer.id && userById(b.athlete)).map(b => ({ athlete: b.athlete, stage: b.stage, note: b.note || '', at: b.at })) : [],
    notes: viewer ? notesFor(viewer) : [],
    admin: isAdmin(viewer) ? adminOut() : null,
    rules: { BANNED, CATS, DELIVERABLES, TYPES, STAGES }
  };
}
// The owner's moderation queue: reports, and athletes and coaches waiting to be verified.
function adminOut() {
  const what = r => {
    if (r.kind === 'post') { const p = D.posts.find(x => x.id === r.id); return p ? { text: p.cap, img: p.img ? '/media/' + p.img : null, by: p.by } : null; }
    if (r.kind === 'comment') { const c = D.comments.find(x => x.id === r.id); return c ? { text: c.t, by: c.by } : null; }
    if (r.kind === 'user') { const u = userById(r.id); return u ? { text: u.f + ' ' + u.l, by: u.id } : null; }
    return { text: 'Message', by: null };
  };
  return {
    reports: D.reports.map(r => ({ ...r, target: what(r), reporter: pub(userById(r.by)) })).filter(r => r.target).sort((a, b) => b.at - a.at).slice(0, 200),
    accounts: D.users.map(u => ({ ...pub(u), email: u.email, tempPw: !!u.tempPw })).sort((a, b) => b.created - a.created),
    pending: D.users.filter(u => !u.verified && (u.role === 'athlete' || u.role === 'coach')).map(u => ({ ...pub(u), email: u.email })).sort((a, b) => b.created - a.created),
    counts: { users: D.users.length, athletes: D.users.filter(u => u.role === 'athlete').length, coaches: D.users.filter(u => u.role === 'coach').length,
      brands: D.users.filter(u => u.role === 'brand').length, fans: D.users.filter(u => u.role === 'fan').length, posts: D.posts.length,
      offers: D.offers.length, active: D.offers.filter(o => ['Active', 'Delivered'].includes(o.status)).length, completed: D.offers.filter(o => o.status === 'Completed').length,
      value: D.offers.filter(o => ['Active', 'Delivered', 'Completed'].includes(o.status)).reduce((s, o) => s + o.amt, 0), campaigns: D.campaigns.filter(c => !c.closed).length }
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

// System messages (offer replies, campaign acceptances) never undo the action they report on:
// if the other account has blocked or deleted, the action stands and the note is skipped.
function note(from, toId, msg) { try { addMessage(from, toId, msg); } catch (e) { if (!e.status) throw e; } }

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
    if (role === 'athlete' && !str(b.sp, 30)) throw err(400, 'Add your sport.');
    if (role === 'coach' && (!str(b.sch, 60) || !str(b.sp, 30))) throw err(400, 'Add the school and sport you coach so we can verify you.');
    if (role === 'brand' && !str(b.brandName, 60)) throw err(400, 'Add your brand or business name.');
    if (role === 'brand' && BANNED.includes(b.cat)) throw err(400, `${b.cat} brands can’t work with college athletes on Next Level.`);
    const fields = { role, f, l, sch: str(b.sch, 60), sp: str(b.sp, 30), pos: str(b.pos, 12), yr: str(b.yr, 6), st: str(b.st, 2).toUpperCase(),
      num: str(b.num, 3), bio: '', verified: false, adult: !!b.adult, title: role === 'coach' ? str(b.title, 40) : '' };
    if (role === 'athlete') { fields.rate = [150, 500, 1000]; fields.open = ['Apparel', 'Fitness', 'Food & drink']; fields.intl = !!b.intl; }
    if (role === 'brand') fields.brand = { name: str(b.brandName, 60), cat: CATS.includes(b.cat) ? b.cat : 'Local business', site: httpsUrl(b.site) };
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
    if (b.bio != null) { if (!clean(b.bio)) throw err(400, 'Keep your bio respectful.'); u.bio = str(b.bio, 300); }
    for (const [k, n] of [['num', 3], ['yr', 6], ['ht', 8], ['wt', 8], ['home', 60], ['grad', 4], ['gpa', 4], ['major', 60], ['title', 40], ['div', 12]])
      if (b[k] != null) u[k] = str(b[k], n);
    if (b.st != null) u.st = str(b.st, 2).toUpperCase();
    if (b.gpa != null && u.gpa && !/^\d(\.\d{1,2})?$/.test(u.gpa)) throw err(400, 'Enter GPA as a number like 3.6.');
    if (b.grad != null && u.grad && !/^20\d\d$/.test(u.grad)) throw err(400, 'Enter graduation year as four digits, like 2027.');
    if (b.hl != null) { const h = str(b.hl, 200); if (h && !httpsUrl(h)) throw err(400, 'Film link must be a full https:// link (Hudl, YouTube, etc.).'); u.hl = h ? httpsUrl(h) : ''; }
    if (b.soc && typeof b.soc === 'object') u.soc = { ig: handle(b.soc.ig), tt: handle(b.soc.tt), x: handle(b.soc.x),
      igN: num(b.soc.igN, 0, 1e8), ttN: num(b.soc.ttN, 0, 1e8), xN: num(b.soc.xN, 0, 1e8) };
    if (b.stats) u.stats = pairs(b.stats, 8);
    if (b.meas) u.meas = pairs(b.meas, 6);
    if (b.awards) u.awards = (Array.isArray(b.awards) ? b.awards : []).slice(0, 8).map(x => str(x, 60)).filter(Boolean);
    if (b.open4 != null) u.open4 = !!b.open4;
    if (b.portal != null && u.role === 'athlete') u.portal = !!b.portal;
    if (u.role === 'athlete') {
      if (Array.isArray(b.rate)) u.rate = b.rate.slice(0, 3).map(x => num(x, 0, 100000));
      if (Array.isArray(b.open)) u.open = b.open.filter(c => CATS.includes(c));
    }
    if (u.role === 'brand' && b.brand && typeof b.brand === 'object') {
      if (BANNED.includes(b.brand.cat)) throw err(400, `${b.brand.cat} brands can’t work with college athletes on Next Level.`);
      const site = str(b.brand.site, 100);
      if (site && !httpsUrl(site)) throw err(400, 'Website must be a full https:// link.');
      u.brand = { name: str(b.brand.name, 60) || u.brand?.name || '', cat: CATS.includes(b.brand.cat) ? b.brand.cat : (u.brand?.cat || 'Local business'), site: site ? httpsUrl(site) : '' };
    }
    if ([u.bio, u.home, u.major, ...(u.awards || [])].some(x => !clean(x))) throw err(400, 'Keep your profile respectful.');
    db.touch('users');
    return sync(u);
  } },
  'POST /api/avatar': { auth: true, fn: async (b, ctx) => {
    limit('av:' + ctx.user.id, 10, 600e3);
    const old = ctx.user.av;
    ctx.user.av = b.img ? db.saveMedia(b.img) : null;
    db.removeMedia(old); db.touch('users');
    return sync(ctx.user);
  } },
  'POST /api/password': { auth: true, fn: async (b, ctx) => {
    limit('pw:' + ctx.user.id, 5, 600e3);
    if (!db.checkLogin(ctx.user.email, b.old)) throw err(401, 'Your current password isn’t right.');
    db.setPassword(ctx.user, b.password, ctx.token); ctx.user.tempPw = false; db.touch('users');
    return { ok: true };
  } },
  // A coach's private recruiting board: only that coach ever sees it.
  'POST /api/board': { auth: true, fn: async (b, ctx) => {
    if (ctx.user.role !== 'coach') throw err(403, 'Only coach accounts have a recruiting board.');
    const a = userById(b.athlete); if (!a || a.role !== 'athlete') throw err(404, 'That athlete doesn’t exist.');
    const i = D.boards.findIndex(x => x.by === ctx.user.id && x.athlete === a.id);
    if (!b.stage) { if (i >= 0) D.boards.splice(i, 1); db.touch('boards'); return sync(ctx.user); }
    if (!STAGES.includes(b.stage)) throw err(400, 'Pick a stage.');
    const row = i >= 0 ? D.boards[i] : { by: ctx.user.id, athlete: a.id, note: '' };
    row.stage = b.stage; if (b.note != null) row.note = str(b.note, 1000); row.at = Date.now();
    if (i < 0) D.boards.push(row);
    db.touch('boards'); return sync(ctx.user);
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
  'POST /api/posts/edit': { auth: true, fn: async (b, ctx) => {
    const p = D.posts.find(x => x.id === +b.id);
    if (!p || p.by !== ctx.user.id) throw err(404, 'Post not found.');
    const cap = str(b.cap, 600);
    if (!p.img && !cap) throw err(400, 'A post without a photo needs a caption.');
    if (!clean(cap)) throw err(400, 'Keep it respectful. That caption can’t be posted.');
    p.cap = cap || '—'; if (b.tag != null) p.tag = str(b.tag, 60); p.edited = Date.now(); db.touch('posts');
    return sync(ctx.user);
  } },
  // Coaches and brands opening an athlete's profile count as one view per day.
  'POST /api/view': { auth: true, fn: async (b, ctx) => {
    limit('view:' + ctx.user.id, 120, 60e3);
    const v = ctx.user, a = userById(b.id);
    if (!a || a.role !== 'athlete' || a.id === v.id || !['coach', 'brand'].includes(v.role) || hidden(v, a.id)) return { ok: true };
    const day = today();
    if (!D.views.some(x => x.athlete === a.id && x.by === v.id && x.day === day)) {
      D.views.push({ athlete: a.id, by: v.id, role: v.role, sch: v.role === 'coach' ? v.sch || '' : '', day, at: Date.now() });
      const cut = Date.now() - 90 * 86400e3; if (D.views.length > 5000) D.views = D.views.filter(x => x.at > cut);
      db.touch('views');
    }
    return { ok: true };
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
    if (!D.posts.some(p => p.id === id)) throw err(404, 'Post not found.');
    limit('prop:' + ctx.user.id, 120, 60e3);
    const cur = D.props.find(x => x.post === id && x.by === ctx.user.id);
    if (cur && (cur.k === k || !PROPS.includes(k))) D.props.splice(D.props.indexOf(cur), 1);
    else if (cur) cur.k = k;
    else if (PROPS.includes(k)) D.props.push({ post: id, by: ctx.user.id, k, at: Date.now() });
    db.touch('props');
    return { ok: true };
  } },
  'POST /api/comments': { auth: true, fn: async (b, ctx) => {
    const id = +b.post, t = str(b.t, 300);
    if (!t) throw err(400, 'Write something first.');
    if (!clean(t)) throw err(400, 'Keep it respectful. That comment can’t be posted.');
    if (!D.posts.some(p => p.id === id)) throw err(404, 'Post not found.');
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

  'POST /api/notes/read': { auth: true, fn: async (b, ctx) => { ctx.user.notesRead = Date.now(); db.touch('users'); return { ok: true }; } },
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
    if (hidden(u, a.id)) throw err(403, 'You can’t send offers to this athlete.');
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
    note(ctx.user, o.brand, { t: b.accept ? `Accepted your offer ($${o.amt.toLocaleString()}). Sending it to my compliance office now.` : 'Thanks for the offer, but I’m going to pass on this one.' });
    return { offer: offerOut(o) };
  } },
  // The athlete marks the work done (with a link to the post), then the brand confirms it.
  'POST /api/offers/deliver': { auth: true, fn: async (b, ctx) => {
    const o = D.offers.find(x => x.id === +b.id && x.to === ctx.user.id);
    if (!o) throw err(404, 'Deal not found.');
    if (o.status !== 'Active') throw err(400, 'Only active deals can be marked delivered.');
    const proof = str(b.proof, 200);
    if (proof && !httpsUrl(proof)) throw err(400, 'Add a full https:// link to the post, or leave it blank.');
    o.status = 'Delivered'; o.proof = proof ? httpsUrl(proof) : ''; o.delivered = Date.now(); db.touch('offers');
    note(ctx.user, o.brand, { t: `Delivered: ${o.what}.` + (o.proof ? ' ' + o.proof : '') });
    return sync(ctx.user);
  } },
  'POST /api/offers/complete': { auth: true, fn: async (b, ctx) => {
    const o = D.offers.find(x => x.id === +b.id && x.brand === ctx.user.id);
    if (!o) throw err(404, 'Deal not found.');
    if (o.status !== 'Delivered') throw err(400, 'The athlete hasn’t marked this deal delivered yet.');
    o.status = 'Completed'; o.completed = Date.now(); db.touch('offers');
    note(ctx.user, o.to, { t: 'Confirmed. Thanks for a great partnership!' });
    return sync(ctx.user);
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
    const pitch = str(b.pitch, 300);
    if (!clean(pitch)) throw err(400, 'Keep it respectful.');
    D.apps.push({ id: db.nextId(), camp: c.id, by: ctx.user.id, status: 'Applied', pitch, at: Date.now() }); db.touch('apps');
    return { ok: true };
  } },
  'POST /api/campaigns/decide': { auth: true, fn: async (b, ctx) => {
    const a = D.apps.find(x => x.id === +b.app);
    const c = a && D.campaigns.find(x => x.id === a.camp && x.brand === ctx.user.id);
    if (!c) throw err(404, 'Application not found.');
    const status = b.accept ? 'Accepted' : 'Declined';
    if (status === 'Accepted' && a.status !== 'Accepted' && D.apps.filter(x => x.camp === c.id && x.status === 'Accepted').length >= c.spots)
      throw err(400, 'All spots are filled. Add spots or decline someone first.');
    a.status = status; a.decided = Date.now(); db.touch('apps');
    if (status === 'Accepted') note(ctx.user, a.by, { t: `You’re in for “${c.title}”. Next: ${c.del}. Reply here with any questions.` });
    return sync(ctx.user);
  } },
  'POST /api/campaigns/edit': { auth: true, fn: async (b, ctx) => {
    const c = D.campaigns.find(x => x.id === +b.id && x.brand === ctx.user.id);
    if (!c) throw err(404, 'Campaign not found.');
    const title = str(b.title, 60), del = str(b.del, 160);
    if (!title || !del) throw err(400, 'Add a title and what athletes will post.');
    if (/\b(commit|transfer|enroll|per (touchdown|goal|win))\b/i.test(title + ' ' + del + ' ' + str(b.need, 160))) throw err(400, 'Campaigns can’t be tied to school choice or performance.');
    const taken = D.apps.filter(a => a.camp === c.id && a.status === 'Accepted').length, spots = num(b.spots, 1, 500);
    if (spots < taken) throw err(400, `You’ve already accepted ${taken}. Spots can’t go below that.`);
    Object.assign(c, { title, del, need: str(b.need, 160) || 'Any sport', pay: str(b.pay, 40) || 'Paid', spots, due: str(b.due, 40) || 'Rolling', edited: Date.now() });
    db.touch('campaigns'); return sync(ctx.user);
  } },
  'POST /api/campaigns/close': { auth: true, fn: async (b, ctx) => {
    const c = D.campaigns.find(x => x.id === +b.id && x.brand === ctx.user.id);
    if (!c) throw err(404, 'Campaign not found.');
    c.closed = !c.closed; db.touch('campaigns');
    return sync(ctx.user);
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
  } },

  // A brand's private shortlist of athletes.
  'POST /api/save': { auth: true, fn: async (b, ctx) => {
    if (ctx.user.role !== 'brand') throw err(403, 'Only brand accounts can save athletes.');
    const a = userById(b.athlete); if (!a || a.role !== 'athlete') throw err(404, 'That athlete doesn’t exist.');
    const i = D.saves.findIndex(x => x.by === ctx.user.id && x.athlete === a.id);
    if (i >= 0) D.saves.splice(i, 1); else D.saves.push({ by: ctx.user.id, athlete: a.id, at: Date.now() });
    db.touch('saves'); return { saved: i < 0 };
  } },
  // The owner can give someone a temporary password when they're locked out (there's no email reset yet).
  'POST /api/admin/reset': { auth: true, fn: async (b, ctx) => {
    if (!isAdmin(ctx.user)) throw err(403, 'Admins only.');
    const u = userById(b.id); if (!u) throw err(404, 'Account not found.');
    if (u.id === ctx.user.id) throw err(400, 'Change your own password in Settings.');
    const AB = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', rnd = n => Array.from({ length: n }, () => AB[require('crypto').randomInt(AB.length)]).join('');
    const temp = rnd(5) + '-' + rnd(5);
    db.setPassword(u, temp); u.tempPw = true; db.touch('users');
    return { temp, email: u.email };
  } },
  'POST /api/admin/remove-user': { auth: true, fn: async (b, ctx) => {
    if (!isAdmin(ctx.user)) throw err(403, 'Admins only.');
    const u = userById(b.id); if (!u) throw err(404, 'Account not found.');
    if (isAdmin(u)) throw err(400, 'Owner accounts can’t be removed here.');
    db.deleteUser(u); D.reports = D.reports.filter(r => !(r.kind === 'user' && r.id === u.id)); db.touch('reports');
    return sync(ctx.user);
  } },
  'POST /api/admin/verify': { auth: true, fn: async (b, ctx) => {
    if (!isAdmin(ctx.user)) throw err(403, 'Admins only.');
    const u = userById(b.id); if (!u) throw err(404, 'Account not found.');
    u.verified = !!b.on; db.touch('users'); return sync(ctx.user);
  } },
  'POST /api/admin/resolve': { auth: true, fn: async (b, ctx) => {
    if (!isAdmin(ctx.user)) throw err(403, 'Admins only.');
    const kind = b.kind, id = +b.id;
    if (b.remove) {
      if (kind === 'post') { const p = D.posts.find(x => x.id === id); if (p) { db.removeMedia(p.img); D.posts.splice(D.posts.indexOf(p), 1); D.comments = D.comments.filter(c => c.post !== id); D.props = D.props.filter(x => x.post !== id); } }
      if (kind === 'comment') D.comments = D.comments.filter(c => c.id !== id);
      if (kind === 'user') { const u = userById(id); if (u && !isAdmin(u)) db.deleteUser(u); }
    }
    D.reports = D.reports.filter(r => !(r.kind === kind && r.id === id));
    db.touch('posts', 'comments', 'props', 'reports'); return sync(ctx.user);
  } }
};
function offerFields(b) {
  return { cat: CATS.includes(b.cat) || BANNED.includes(b.cat) ? b.cat : 'Local business', del: num(b.del, 0, 2), amt: num(b.amt, 0, 1e6),
    perf: !!b.perf, what: str(b.what, 200) || DELIVERABLES[num(b.del, 0, 2)], due: str(b.due, 30) || 'Flexible', note: str(b.note, 400) };
}

// ---- HTTP ----
const TYPES_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com";
function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'content-type': type, 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin',
    'content-security-policy': CSP, 'permissions-policy': 'camera=(), microphone=(), geolocation=()', ...extra });
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
    // Profile links that preview nicely when shared in texts and social apps, then open the app.
    const share = /^\/a\/(\d+)$/.exec(url.pathname);
    if (share) {
      const u = userById(share[1]), origin = 'https://' + String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
      const h = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const title = u ? (u.role === 'brand' && u.brand ? u.brand.name : u.f + ' ' + u.l) + ' · Next Level' : 'Next Level';
      const desc = !u ? 'Recruiting and compliant NIL deals for college athletes.' : u.role === 'athlete'
        ? [[u.sp, u.pos, u.yr].filter(Boolean).join(' · '), u.sch, (u.stats || []).slice(0, 3).map(x => x.v + ' ' + x.k).join(' · ')].filter(Boolean).join(' — ')
        : (u.bio || 'On Next Level');
      const img = u && u.av ? origin + '/media/' + u.av : origin + '/icon.svg', to = u ? '/#/u/' + u.id : '/';
      return send(res, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${h(title)}</title><meta name="description" content="${h(desc)}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Next Level"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(desc)}">
<meta property="og:image" content="${h(img)}"><meta property="og:url" content="${h(origin + url.pathname)}"><meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url=${h(to)}"><link rel="icon" href="/icon.svg"></head><body style="background:#0B0C0E;color:#ECEEF1;font-family:system-ui;padding:24px"><a href="${h(to)}" style="color:#22A6FF">Open ${h(title)}</a></body></html>`, 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
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
