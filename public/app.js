// Next Level · the whole front end. Plain JavaScript, no build step.
// Every screen reads from one copy of the server's data (state.data) and is redrawn from it.
(function () {
'use strict';

// ---------------------------------------------------------------- basics
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = n => '$' + Math.round(+n || 0).toLocaleString('en-US');
const compact = n => { n = +n || 0; return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n); };
const ago = t => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(new Date(t).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};
const dayLabel = t => {
  const d = new Date(t), n = new Date(); const same = (a, b) => a.toDateString() === b.toDateString();
  const y = new Date(); y.setDate(n.getDate() - 1);
  if (same(d, n)) return 'Today'; if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
const clock = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
const linkify = s => esc(s).replace(/https:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);

const SPORTS = ['Baseball', 'Basketball', 'Beach Volleyball', 'Bowling', 'Cross Country', 'Field Hockey', 'Football', 'Golf', 'Gymnastics', 'Ice Hockey',
  'Lacrosse', 'Rowing', 'Soccer', 'Softball', 'Swimming & Diving', 'Tennis', 'Track & Field', 'Volleyball', 'Water Polo', 'Wrestling', 'Other'];
const CLASSES = ['Fr', 'So', 'Jr', 'Sr', 'Gr'];
const DIVS = ['D1', 'D2', 'D3', 'NAIA', 'JUCO', 'Other'];
const GRADS = () => { const y = new Date().getFullYear(); return [0, 1, 2, 3, 4, 5].map(i => String(y + i)); };
const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const STAT_HINTS = {
  Football: ['Tackles', 'Sacks', 'INT', 'Pass yds', 'Rush yds', 'Rec yds', 'TD', 'Comp %'],
  Basketball: ['PPG', 'RPG', 'APG', 'SPG', 'BPG', 'FG %', '3P %', 'FT %'],
  Volleyball: ['Kills', 'Hit %', 'Aces', 'Digs', 'Blocks', 'Assists'],
  'Beach Volleyball': ['Wins', 'Kills', 'Aces', 'Digs'],
  Baseball: ['AVG', 'HR', 'RBI', 'OBP', 'SB', 'ERA', 'K', 'WHIP'],
  Softball: ['AVG', 'HR', 'RBI', 'OBP', 'SB', 'ERA', 'K', 'WHIP'],
  Soccer: ['Goals', 'Assists', 'Shots', 'Saves', 'Clean sheets', 'Minutes'],
  'Track & Field': ['100m', '200m', '400m', '800m', '1600m', 'Long jump', 'High jump', 'Shot put'],
  'Cross Country': ['5K', '6K', '8K', '10K'],
  Golf: ['Scoring avg', 'Best round', 'Top 10s', 'Wins'],
  Tennis: ['Singles W-L', 'Doubles W-L', 'UTR'],
  'Swimming & Diving': ['50 free', '100 free', '200 IM', '100 fly', '1m dive'],
  Wrestling: ['Record', 'Pins', 'Weight class'],
  Lacrosse: ['Goals', 'Assists', 'Ground balls', 'Caused TO', 'Save %'],
  'Ice Hockey': ['Goals', 'Assists', 'Points', '+/-', 'Save %', 'GAA']
};
const MEAS_HINTS = ['40-yard dash', 'Vertical', 'Broad jump', 'Wingspan', 'Bench', 'Squat', 'Pro shuttle', 'Exit velo', 'Fastball'];
const PROPS = [['clutch', 'Clutch'], ['locked', 'Locked in'], ['goat', 'GOAT']];
const ROLE_NAME = { athlete: 'College athlete', coach: 'Coach', brand: 'Brand', fan: 'Fan' };
const SUPPORT = 'leya.glazer@utdallas.edu';

// ---------------------------------------------------------------- icons
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldok: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  send: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  okc: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  noc: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  star: '<path d="m12 2 3 6.5 7 .8-5.2 4.7 1.5 7-6.3-3.6L5.7 21l1.5-7L2 9.3l7-.8z"/>'
};
const ic = (n, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
const VF = '<svg class="vf" viewBox="0 0 24 24" aria-label="Verified" role="img"><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.1 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.1z"/><path d="m8 12 3 3 5-6" fill="none" stroke="#0B0C0E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16 12 9l8 7" fill="none" stroke="#22A6FF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="m7 10.5 5-4.5 5 4.5" fill="none" stroke="#FFE500" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------------------------------------------------------------- sport field art
// Each athlete's own playing surface, drawn in faint lines behind their name, like a broadcast graphic.
const FIELD = {
  court: '<rect x="20" y="20" width="360" height="120"/><path d="M200 20v120M140 20v120M260 20v120"/><path d="M200 12v136" class="hot"/>',
  hoops: '<rect x="20" y="20" width="360" height="120"/><path d="M200 20v120"/><circle cx="200" cy="80" r="22"/><rect x="20" y="52" width="70" height="56"/><rect x="310" y="52" width="70" height="56"/><path d="M20 30a95 95 0 0 1 0 100M380 30a95 95 0 0 0 0 100"/><circle cx="34" cy="80" r="4" class="hot"/>',
  gridiron: '<rect x="10" y="20" width="380" height="120"/><path d="M50 20v120M90 20v120M130 20v120M170 20v120M210 20v120M250 20v120M290 20v120M330 20v120M350 20v120"/><path d="M60 64h0M70 64h0M60 96h0M70 96h0" /><path d="M210 20v120" class="hot"/><path d="M50 60v6M90 60v6M130 60v6M170 60v6M250 60v6M290 60v6M330 60v6M50 94v6M90 94v6M130 94v6M170 94v6M250 94v6M290 94v6M330 94v6"/>',
  pitch: '<rect x="20" y="20" width="360" height="120"/><path d="M200 20v120"/><circle cx="200" cy="80" r="26"/><rect x="20" y="45" width="50" height="70"/><rect x="330" y="45" width="50" height="70"/><rect x="20" y="62" width="18" height="36"/><rect x="362" y="62" width="18" height="36"/><circle cx="200" cy="80" r="3" class="hot"/>',
  diamond: '<path d="M200 140 120 70l80-50 80 50z"/><path d="M200 140 40 20M200 140 360 20"/><path d="M60 20a200 200 0 0 1 280 0"/><circle cx="200" cy="88" r="9"/><path d="M200 140l-6-6h12z" class="hot"/>',
  track: '<path d="M60 30h280a50 50 0 0 1 0 100H60a50 50 0 0 1 0-100z"/><path d="M60 42h280a38 38 0 0 1 0 76H60a38 38 0 0 1 0-76z"/><path d="M60 54h280a26 26 0 0 1 0 52H60a26 26 0 0 1 0-52z"/><path d="M60 66h280a14 14 0 0 1 0 28H60a14 14 0 0 1 0-28z"/><path d="M250 30v24" class="hot"/>',
  pool: '<rect x="20" y="20" width="360" height="120"/><path d="M20 44h360M20 68h360M20 92h360M20 116h360"/><path d="M60 20v120M340 20v120" stroke-dasharray="4 6"/><path d="M200 20v120" class="hot"/>',
  tennis: '<rect x="20" y="20" width="360" height="120"/><path d="M20 36h360M20 124h360M110 36v88M290 36v88M110 80h180"/><path d="M200 14v132" class="hot"/>',
  links: '<path d="M30 120c60-70 140-90 220-70s110 50 120 70"/><path d="M60 128c50-55 120-70 190-54s90 38 100 54"/><path d="M95 134c40-38 95-48 150-36s70 26 78 36"/><ellipse cx="270" cy="70" rx="46" ry="22"/><path d="M276 70V32l22 8-22 8" class="hot"/>',
  mat: '<circle cx="200" cy="80" r="64"/><circle cx="200" cy="80" r="52"/><circle cx="200" cy="80" r="8"/><rect x="40" y="10" width="320" height="140"/><path d="M186 80h28" class="hot"/>',
  rink: '<rect x="20" y="20" width="360" height="120" rx="40"/><path d="M200 20v120" class="hot"/><path d="M140 20v120M260 20v120M50 20v120M350 20v120"/><circle cx="200" cy="80" r="22"/><circle cx="100" cy="50" r="14"/><circle cx="100" cy="110" r="14"/><circle cx="300" cy="50" r="14"/><circle cx="300" cy="110" r="14"/>',
  grid: '<path d="M20 30h360M20 60h360M20 90h360M20 120h360M60 20v120M140 20v120M220 20v120M300 20v120"/><path d="M20 120l90-40 70 20 90-60 110 30" class="hot"/>'
};
const SPORT_FIELD = { Volleyball: 'court', 'Beach Volleyball': 'court', Basketball: 'hoops', Football: 'gridiron', Soccer: 'pitch', Lacrosse: 'pitch', 'Field Hockey': 'pitch', 'Water Polo': 'pool',
  Baseball: 'diamond', Softball: 'diamond', 'Track & Field': 'track', 'Cross Country': 'track', 'Swimming & Diving': 'pool', Rowing: 'pool', Tennis: 'tennis', Golf: 'links', Wrestling: 'mat', Gymnastics: 'mat', 'Ice Hockey': 'rink' };
const field = (sport, cls, fit) => `<svg class="fieldart${cls ? ' ' + cls : ''}" viewBox="0 0 400 160" preserveAspectRatio="${fit || 'xMidYMid slice'}" aria-hidden="true"><g fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${FIELD[SPORT_FIELD[sport]] || FIELD.grid}</g></svg>`;

// ---------------------------------------------------------------- state and server
const KEY = 'nl.token';
const store2 = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const store = { get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} } };
const S = {
  token: store.get(), data: null, failed: false, viewed: {}, cmp: [],
  ui: { feed: 'all', open: {}, f: { q: '', sp: '', yr: '', st: '', pos: '', vf: false, nil: false, cat: '', sort: 'best', grad: '', gpa: '', fol: '', saved: false }, tab: {}, msgTab: 'inbox' }
};

async function api(path, body) {
  let r;
  try {
    r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(S.token ? { authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { throw new Error('Can’t reach Next Level. Check your connection and try again.'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token && path !== '/api/login' && path !== '/api/password' && path !== '/api/delete-account') { S.token = null; store.set(null); }
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.');
  return j;
}
function take(d) { if (d && d.users) { if (d.token) { S.token = d.token; store.set(d.token); } S.data = d; } }
async function refresh() { take(await api('/api/sync')); }

// ---------------------------------------------------------------- data helpers
const D = () => S.data;
const ME = () => (S.data && S.data.me) || null;
const role = () => (ME() ? ME().role : null);
const user = id => (S.data.users.find(u => u.id === +id) || (ME() && ME().id === +id ? ME() : null));
const nameOf = u => !u ? 'Deleted account' : (u.role === 'brand' && u.brand && u.brand.name ? u.brand.name : `${u.f} ${u.l}`);
const initials = u => !u ? '?' : (u.role === 'brand' && u.brand && u.brand.name ? u.brand.name.slice(0, 2) : (u.f[0] || '') + (u.l[0] || '')).toUpperCase();
const athletes = () => S.data.users.filter(u => u.role === 'athlete');
// How complete a profile is (0-8). Search ranks complete profiles first, as the checklist promises.
const completeness = u => [u.av, u.bio, (u.stats || []).length >= 3, u.hl, u.gpa || u.major, u.soc && (u.soc.ig || u.soc.tt || u.soc.x), (u.meas || []).length, u.verified].filter(Boolean).length;
const followers = u => { const s = (u && u.soc) || {}; return (s.igN || 0) + (s.ttN || 0) + (s.xN || 0); };
const subline = u => {
  if (!u) return '';
  if (u.role === 'athlete') return [u.sp, u.pos, u.yr].filter(Boolean).join(' · ');
  if (u.role === 'coach') return [u.title || 'Coach', u.sp].filter(Boolean).join(' · ');
  if (u.role === 'brand') return (u.brand && u.brand.cat) || 'Brand';
  return 'Fan';
};
const schoolLine = u => !u ? '' : [u.sch, u.st].filter(Boolean).join(', ');
const unreadMsgs = () => S.data.threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0);
const hotNotes = () => S.data.notes.filter(n => n.hot).length;
const pendingOffers = () => ME() ? S.data.offers.filter(o => o.to === ME().id && o.status === 'Offer').length : 0;
const toReview = () => ME() ? S.data.offers.filter(o => o.brandId === ME().id && o.status === 'Delivered').length : 0;
const newApplicants = () => ME() ? S.data.campaigns.filter(c => c.brand === ME().id).reduce((n, c) => n + (c.applicants || []).filter(a => a.status === 'Applied').length, 0) : 0;
const boardRow = id => (S.data.board || []).find(b => b.athlete === +id);
const following = id => S.data.following.includes(+id);

function avatar(u, size) {
  const c = 'av' + (size ? ' ' + size : '') + (u && u.role === 'brand' ? ' sq' : '');
  return `<span class="${c}">${u && u.av ? `<img src="${esc(u.av)}" alt="" loading="lazy">` : esc(initials(u))}</span>`;
}
function who(u, opts = {}) {
  const inner = `${avatar(u, opts.size || 'sm')}<span class="grow" style="min-width:0"><span class="nm"><span>${esc(nameOf(u))}</span>${u && u.verified ? VF : ''}</span>${opts.sub !== false ? `<span class="sub">${esc(opts.sub || [subline(u), u && u.role !== 'brand' && u.role !== 'fan' ? u.sch : ''].filter(Boolean).join(' · '))}</span>` : ''}</span>`;
  return u ? `<a class="who" href="#/u/${u.id}">${inner}</a>` : `<span class="who">${inner}</span>`;
}
// YouTube and Vimeo links play right on the profile; anything else (Hudl, etc.) opens in a new tab.
function filmEmbed(url) {
  let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`;
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}
const empty = (icon, title, text, action) => `<div class="empty">${ic(icon)}<b>${esc(title)}</b>${text ? `<p>${text}</p>` : ''}${action || ''}</div>`;

// ---------------------------------------------------------------- toasts, sheets, menus
function toast(msg, bad) {
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg;
  const box = $('#toasts'); while (box.children.length >= 2) box.firstChild.remove(); box.appendChild(t); setTimeout(() => t.remove(), bad ? 5000 : 2800);
}
let sheetEl = null, lastFocus = null;
function sheet(title, body, foot, opts = {}) {
  closeSheet(); closeMenu(); lastFocus = document.activeElement;
  const s = document.createElement('div'); s.className = 'scrim';
  s.innerHTML = `<div class="sheet${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-h"><h2 class="h2">${esc(title)}</h2><button class="iconbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
    <div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}</div>`;
  s.addEventListener('mousedown', e => { if (e.target === s) closeSheet(); });
  s.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...s.querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select,textarea,[tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.body.appendChild(s); sheetEl = s;
  const f = s.querySelector('[autofocus]') || s.querySelector('input:not([type=hidden]),select,textarea');
  if (f && matchMedia('(min-width: 601px)').matches) f.focus(); else s.querySelector('.sheet').setAttribute('tabindex', '-1'), s.querySelector('.sheet').focus();
  return s;
}
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); if (S.pending) { S.pending = false; render(); } } }
function confirmBox(title, text, yes, danger) {
  return new Promise(res => {
    const s = sheet(title, `<p class="muted" style="margin:0">${text}</p>`, `<button class="btn" data-no>Cancel</button><button class="btn ${danger ? 'danger' : 'pri'}" data-yes>${esc(yes)}</button>`);
    s.querySelector('[data-yes]').onclick = () => { closeSheet(); res(true); };
    s.querySelector('[data-no]').onclick = () => { closeSheet(); res(false); };
    s.querySelector('[data-act=close]').onclick = () => { closeSheet(); res(false); };
  });
}
let menuEl = null;
function menu(anchor, items) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'pop'; m.setAttribute('role', 'menu');
  m.innerHTML = items.map(i => i === '-' ? '<div class="sep"></div>' : i.html ? i.html :
    i.href ? `<a class="mi${i.bad ? ' bad' : ''}" role="menuitem" href="${i.href}"${i.ext ? ' target="_blank" rel="noopener"' : ''}>${ic(i.icon)}${esc(i.label)}</a>`
      : `<button class="mi${i.bad ? ' bad' : ''}" role="menuitem" data-i="${items.indexOf(i)}">${ic(i.icon)}${esc(i.label)}</button>`).join('');
  document.body.appendChild(m); menuEl = m;
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w)), top = r.bottom + 6 + window.scrollY;
  if (r.bottom + h + 12 > window.innerHeight) top = r.top - h - 6 + window.scrollY;
  m.style.left = left + 'px'; m.style.top = top + 'px';
  m.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { closeMenu(); items[+b.dataset.i].fn(); } else if (e.target.closest('a')) closeMenu(); });
  setTimeout(() => document.addEventListener('mousedown', outside), 0);
  function outside(e) { if (menuEl && !menuEl.contains(e.target)) { closeMenu(); } }
  m._off = () => document.removeEventListener('mousedown', outside);
}
function closeMenu() { if (menuEl) { menuEl._off && menuEl._off(); menuEl.remove(); menuEl = null; } }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (menuEl) closeMenu(); else if (sheetEl) closeSheet(); } });

async function run(btn, fn) {
  const label = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; }
  try { await fn(); }
  catch (e) { toast(e.message, true); }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
}
function formErr(form, msg) { const e = form.querySelector('.err'); if (e) { e.textContent = msg; e.hidden = !msg; } else if (msg) toast(msg, true); }
const fd = form => Object.fromEntries(new FormData(form));
function copy(text) {
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Link copied'), () => {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); toast('Link copied'); } catch (e) { toast('Couldn’t copy the link', true); } t.remove();
  });
}
const link = path => location.origin + '/#/' + path;

// Photos are shrunk in the browser before upload: faster, and always under the server's size limit.
function readImage(file, max = 1600) {
  return new Promise((ok, bad) => {
    if (!file || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name || '')) return bad(new Error('Choose a JPG, PNG or WebP photo.'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let q = 0.86, out = c.toDataURL('image/jpeg', q);
      while (out.length > 3.2e6 && q > 0.4) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
      ok(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error('That photo couldn’t be opened. Try a JPG or PNG.')); };
    img.src = url;
  });
}

// ---------------------------------------------------------------- routing
const route = () => { const h = location.hash.replace(/^#\/?/, '').split('?')[0]; return h ? h.split('/') : []; };
const go = path => { if (location.hash === '#/' + path) render(); else location.hash = '/' + path; };
const PRIVATE = ['compare', 'messages', 'deals', 'campaigns', 'board', 'notifications', 'settings', 'edit', 'admin'];

function navItems() {
  const r = role(), me = ME();
  if (!me) return [];
  const m = { href: 'messages', label: 'Messages', icon: 'msg', badge: unreadMsgs() };
  const prof = { href: 'u/' + me.id, label: 'Profile', icon: 'user' };
  if (r === 'athlete') return [{ href: 'home', label: 'Home', icon: 'home' }, { href: 'athletes', label: 'Explore', icon: 'compass' }, { href: 'deals', label: 'Deals', icon: 'dollar', badge: pendingOffers() }, m, prof];
  if (r === 'coach') return [{ href: 'home', label: 'Home', icon: 'home' }, { href: 'athletes', label: 'Search', icon: 'search' }, { href: 'board', label: 'Board', icon: 'board' }, m, prof];
  if (r === 'brand') return [{ href: 'home', label: 'Dashboard', icon: 'chart' }, { href: 'athletes', label: 'Find athletes', short: 'Find', icon: 'search' }, { href: 'campaigns', label: 'Campaigns', icon: 'brief', badge: newApplicants() }, { href: 'deals', label: 'Deals', icon: 'dollar', badge: toReview() }, m];
  return [{ href: 'home', label: 'Home', icon: 'home' }, { href: 'athletes', label: 'Athletes', icon: 'compass' }, m, prof];
}
function isOn(href) {
  const r = route(), cur = r[0] || 'home';
  if (href.startsWith('u/')) return cur === 'u' && r[1] === href.slice(2);
  return cur === href;
}

// ---------------------------------------------------------------- layout
function render() {
  const app = $('#app');
  if (!S.data) { app.innerHTML = S.failed ? `<div class="boot"><div class="empty">${ic('alert')}<b>Next Level couldn’t load</b><p>Check your connection, then try again.</p><button class="btn pri" data-act="reload">Try again</button></div></div>` : '<div class="boot"><div class="splash"><span>Next Level</span></div></div>'; return; }
  closeMenu();
  const r = route(), me = ME();
  if (!me && (!r.length || r[0] === 'home' || PRIVATE.includes(r[0]))) {
    app.innerHTML = landing();
    if (PRIVATE.includes(r[0])) setTimeout(() => authSheet('in'), 0);
    document.title = 'Next Level · Recruiting and NIL for college athletes';
    return;
  }
  const view = viewFor(r);
  const nav = navItems();
  const top = `<header class="top">
      <a class="logo" href="#/${me ? 'home' : ''}">${LOGO}<b>Next Level</b></a>
      <form class="search" data-form="topsearch" role="search">${ic('search')}<input class="in" name="q" placeholder="Search athletes, schools, sports" aria-label="Search athletes" value="${esc(S.ui.f.q)}"></form>
      <div class="acts">${me ? `
        <a class="iconbtn" href="#/notifications" aria-label="Notifications">${ic('bell')}${hotNotes() ? `<span class="badge">${hotNotes()}</span>` : ''}</a>
        <button class="menubtn" data-act="acct" aria-label="Account menu">${avatar(me, 'xs')}<span class="nm">${esc(me.role === 'brand' ? nameOf(me) : me.f)}</span></button>`
        : `<button class="btn ghost sm" data-act="signin">Log in</button><button class="btn pri sm" data-act="join">Join free</button>`}</div>
    </header>`;
  const side = me ? `<nav class="side" aria-label="Main">
      ${nav.map(n => `<a class="nav${isOn(n.href) ? ' on' : ''}" href="#/${n.href}">${ic(n.icon)}${esc(n.label)}${n.badge ? `<span class="badge">${n.badge}</span>` : ''}</a>`).join('')}
      <a class="nav${isOn('notifications') ? ' on' : ''}" href="#/notifications">${ic('bell')}Notifications${hotNotes() ? `<span class="badge">${hotNotes()}</span>` : ''}</a>
      ${me.admin ? `<div class="grp eyebrow">Owner</div><a class="nav${isOn('admin') ? ' on' : ''}" href="#/admin">${ic('shield')}Admin${D().admin && D().admin.pending.length + D().admin.reports.length ? `<span class="badge">${D().admin.pending.length + D().admin.reports.length}</span>` : ''}</a>` : ''}
      <div class="foot"><span>Next Level is a marketplace, not an agent.</span><span><a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a> · <a href="mailto:${SUPPORT}">Help</a></span></div>
    </nav>` : `<nav class="side" aria-label="Main">
      <a class="nav${isOn('athletes') ? ' on' : ''}" href="#/athletes">${ic('compass')}Athletes</a>
      <div class="foot"><span>Join free to follow athletes, message and make deals.</span><button class="btn pri sm" data-act="join">Join free</button><span><a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></span></div></nav>`;
  const tabbar = me ? `<nav class="tabbar" aria-label="Main">${nav.map(n => `<a class="${isOn(n.href) ? 'on' : ''}" href="#/${n.href}">${ic(n.icon)}${esc(n.short || n.label)}${n.badge ? `<span class="badge">${n.badge}</span>` : ''}</a>`).join('')}</nav>` : '';
  app.innerHTML = `${top}<div class="shell">${side}<main class="main" id="main">${S.cmp.length && route()[0] !== 'compare' ? `<div class="cmptray"><span>${plural(S.cmp.length, 'athlete')} to compare</span><a class="btn pri sm" href="#/compare">Compare</a><button class="btn ghost sm" data-act="cmpclear">Clear</button></div>` : ''}${me && me.tempPw && route()[0] !== 'settings' ? `<div class="note warn" style="max-width:1080px;margin:0 auto 16px">${ic('alert')}<span><b>You’re using a temporary password.</b> <a href="#/settings">Choose a new one</a> to keep your account secure.</span></div>` : ''}${view.html}</main></div>${tabbar}`;
  const un = unreadMsgs() + hotNotes();
  document.title = (un ? `(${un}) ` : '') + (view.title ? view.title + ' · ' : '') + 'Next Level';
  if (view.after) view.after();
}

function viewFor(r) {
  const me = ME(), [a, b, c] = r;
  try {
    if (!a || a === 'home') return me && me.role === 'brand' ? brandHome() : home();
    if (a === 'athletes') return search();
    if (a === 'u' && b) return profile(b);
    if (a === 'p' && b) return single(b);
    if (a === 'messages') return messages(b === 'new' ? { newTo: c } : { tid: b });
    if (a === 'deals') return me.role === 'brand' ? brandDeals() : me.role === 'athlete' ? athleteDeals() : notFound();
    if (a === 'campaigns') return me.role === 'brand' ? (b ? campaign(b) : campaigns()) : notFound();
    if (a === 'board') return me.role === 'coach' ? board() : notFound();
    if (a === 'compare') return compare();
    if (a === 'school' && b) return school(decodeURIComponent(b));
    if (a === 'notifications') return notifications();
    if (a === 'settings') return settings();
    if (a === 'edit') return editProfile();
    if (a === 'admin') return me.admin ? admin() : notFound();
  } catch (e) { console.error(e); return { html: `<div class="page narrow">${empty('alert', 'Something went wrong on this page', 'Refresh and try again. If it keeps happening, email <a href="mailto:' + SUPPORT + '">' + SUPPORT + '</a>.')}</div>` }; }
  return notFound();
}
const notFound = () => ({ title: 'Not found', html: `<div class="page narrow"><h1 class="sr">Page not found</h1>${empty('compass', 'This page doesn’t exist', 'The link may be old or the account may have been deleted.', '<a class="btn" href="#/home">Go home</a>')}</div>` });

// ---------------------------------------------------------------- landing (signed out)
function landing() {
  const li = t => `<li>${ic('check')}<span>${t}</span></li>`;
  return `<div class="land">
  <header class="top"><a class="logo" href="#/">${LOGO}<b>Next Level</b></a>
    <div class="acts"><a class="btn ghost sm hide-sm" href="#/athletes">Browse athletes</a><button class="btn ghost sm" data-act="signin">Log in</button><button class="btn pri sm" data-act="join">Join free</button></div></header>
  <section class="hero">${field('Volleyball', 'herofield', 'xMaxYMid meet')}<div class="in2 herogrid"><div>
    <h1>Get recruited.<br>Get paid.<br>Do it right.</h1>
    <p>Next Level is where college athletes build a stat card coaches trust, and land NIL deals with compliance checks built into every offer.</p>
    <div class="row wrap"><button class="btn pri lg" data-act="join" data-role="athlete">I’m a college athlete</button><button class="btn lg" data-act="join" data-role="brand">I’m a brand</button><button class="btn lg" data-act="join" data-role="coach">I’m a coach</button></div></div>
    <figure class="demo" aria-label="Example athlete card">
      <div class="demo-card">${field('Volleyball', 'mini')}<div class="demo-top"><span class="demo-num">12</span><div><div class="demo-nm">Your name</div><div class="demo-meta">Volleyball · Outside hitter · Jr</div></div></div>
        <div class="strip"><div><b>312</b><span>Kills</span></div><div><b>.287</b><span>Hit %</span></div><div><b>41</b><span>Aces</span></div><div><b>3.8</b><span>GPA</span></div></div>
        <div class="demo-check">${ic('shieldok')}<span><b>$450 offer</b> passed 6 compliance checks</span></div></div>
      <figcaption>Example card. Yours shows your real stats.</figcaption></figure>
  </div><div class="rail"></div></section>
  <section class="lsec">
    <h2 class="h1">One place. Four sides.</h2>
    <div class="aud">
      <div class="card"><span class="k" style="color:var(--yellow)">Athletes · Free</span><h3>Your stat card</h3><ul>${li('Stats, measurables, academics and film on one profile')}${li('Get found by coaches and brands searching your sport')}${li('Set your NIL rates and the brand categories you’re open to')}${li('Every offer arrives already checked for compliance')}</ul><button class="btn pri" data-act="join" data-role="athlete">Build your card</button></div>
      <div class="card"><span class="k" style="color:var(--blue)">Coaches</span><h3>Your board</h3><ul>${li('Search athletes by sport, position, class and state')}${li('Private recruiting board with your own notes')}${li('Message athletes directly')}${li('Verified badges so you know who’s real')}</ul><button class="btn" data-act="join" data-role="coach">Create a coach account</button></div>
      <div class="card"><span class="k" style="color:var(--red)">Brands</span><h3>Your roster</h3><ul>${li('Find athletes by sport, school, state and audience')}${li('Post campaigns and pick from applicants')}${li('Send offers that pass compliance before they go out')}${li('Track every deal from offer to delivered')}</ul><button class="btn" data-act="join" data-role="brand">Create a brand account</button></div>
      <div class="card"><span class="k" style="color:var(--t2)">Fans</span><h3>Your team</h3><ul>${li('Follow athletes from any school or sport')}${li('Give props on highlights and game days')}${li('Join the conversation in the comments')}</ul><button class="btn" data-act="join" data-role="fan">Join as a fan</button></div>
    </div>
  </section>
  <section class="lsec">
    <h2 class="h1">How it works for athletes</h2>
    <ol class="how">
      <li><b>Build your card</b><p>Stats, measurables, academics, film and socials. Takes about ten minutes.</p></li>
      <li><b>Get found</b><p>Coaches search by sport, position and class. Brands search by sport, school and audience. You see who’s looking.</p></li>
      <li><b>Take the right deals</b><p>Offers arrive already checked. Accept, disclose to your school with one tap, then post.</p></li>
      <li><b>Get paid and keep records</b><p>Mark the work delivered, the brand confirms, and your earnings export is ready at tax time.</p></li>
    </ol>
  </section>
  <section class="lsec">
    <h2 class="h1">The rules run on every deal.</h2>
    <p class="muted" style="max-width:620px;margin:14px 0 0">Next Level checks each offer on our server before it can be sent, so athletes and brands stay inside NCAA, school and state NIL rules.</p>
    <div class="rules">
      <div><b>Enrolled athletes only</b><p>NIL accounts are for current college athletes, 18 and older.</p></div>
      <div><b>Banned categories blocked</b><p>No alcohol, vape, betting, cannabis, firearms or adult brands. Ever.</p></div>
      <div><b>No pay-for-play</b><p>Offers tied to stats, wins or choosing a school can’t be sent.</p></div>
      <div><b>Fair market value</b><p>Offers far above an athlete’s rate card are flagged before sending.</p></div>
      <div><b>NIL Go reminders</b><p>Deals of $600 or more come with a reminder to report them.</p></div>
      <div><b>School disclosure</b><p>Athletes are reminded to disclose every deal to their compliance office.</p></div>
    </div>
    <div class="note" style="margin-top:16px">${ic('info')}<span><b>A marketplace, not an agent.</b> Next Level connects people. We don’t represent anyone, negotiate for anyone, or give legal or tax advice. International students: talk to your school before taking NIL work.</span></div>
  </section>
  <section class="lsec" style="text-align:center">
    <h2 class="h1">Free for athletes. Always.</h2>
    <p class="muted" style="margin:14px auto 24px;max-width:520px">Make your account in a minute. Your card is ready for coaches and brands as soon as you add your stats.</p>
    <button class="btn pri lg" data-act="join" data-role="athlete">Join Next Level</button>
  </section>
  <footer class="lfoot"><div class="in2"><span class="logo">${LOGO}<b style="font-size:20px">Next Level</b></span><span>A marketplace, not an agent.</span><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="mailto:${SUPPORT}">Contact</a></div></footer>
  </div>`;
}

// ---------------------------------------------------------------- auth
function authSheet(mode, preRole) {
  const r0 = preRole || 'athlete';
  const s = sheet(mode === 'in' ? 'Log in' : 'Join Next Level', `
    <div class="tabs" role="tablist" style="margin-top:-8px"><button role="tab" aria-selected="${mode !== 'in'}" data-mode="up">Create account</button><button role="tab" aria-selected="${mode === 'in'}" data-mode="in">Log in</button></div>
    <form data-form="login" class="stack" ${mode === 'in' ? '' : 'hidden'} novalidate>
      <label class="field"><span>Email</span><input class="in" name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Password</span><input class="in" name="password" type="password" autocomplete="current-password" required></label>
      <p class="err" hidden></p>
      <button class="btn pri block lg">Log in</button>
      <p class="small dim" style="margin:0;text-align:center">Forgot your password? <a href="mailto:${SUPPORT}?subject=Next%20Level%20password%20reset">Email support</a> from the address on your account and we’ll send you a temporary one.</p>
    </form>
    <form data-form="signup" class="stack" ${mode === 'in' ? 'hidden' : ''} novalidate>
      <div class="field"><span>I’m joining as</span><div class="grid2" role="radiogroup">
        ${['athlete', 'coach', 'brand', 'fan'].map(x => `<label class="chip" style="height:auto;padding:10px 12px;border-radius:8px;justify-content:flex-start;cursor:pointer"><input type="radio" name="role" value="${x}" ${x === r0 ? 'checked' : ''} style="accent-color:var(--blue)"> ${ROLE_NAME[x]}</label>`).join('')}
      </div></div>
      <div class="grid2"><label class="field"><span>First name</span><input class="in" name="f" autocomplete="given-name" maxlength="30" required></label><label class="field"><span>Last name</span><input class="in" name="l" autocomplete="family-name" maxlength="30" required></label></div>
      <div data-for="athlete coach" class="stack">
        <label class="field"><span>School</span><input class="in" name="sch" maxlength="60" placeholder="e.g. University of Texas at Dallas"></label>
        <div class="grid2"><label class="field"><span>Sport</span><select class="in" name="sp"><option value="">Choose…</option>${SPORTS.map(x => `<option>${x}</option>`).join('')}</select></label>
          <label class="field" data-for="athlete"><span>Class</span><select class="in" name="yr"><option value="">Choose…</option>${CLASSES.map(x => `<option>${x}</option>`).join('')}</select></label>
          <label class="field" data-for="coach"><span>Title</span><input class="in" name="title" maxlength="40" placeholder="e.g. Assistant coach"></label></div>
      </div>
      <div data-for="brand" class="stack">
        <label class="field"><span>Brand or business name</span><input class="in" name="brandName" maxlength="60"></label>
        <div class="grid2"><label class="field"><span>Category</span><select class="in" name="cat">${D().rules.CATS.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
          <label class="field"><span>Website <small>(optional)</small></span><input class="in" name="site" type="url" placeholder="https://"></label></div>
      </div>
      <label class="field"><span>Email</span><input class="in" name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Password</span><input class="in" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" required></label>
      <div data-for="athlete" class="stack">
        <label class="check"><input type="checkbox" name="adult"> I’m 18 or older and currently enrolled at the school above.</label>
        <label class="check"><input type="checkbox" name="intl"> I’m an international student (we’ll show you visa reminders on NIL deals).</label>
      </div>
      <label class="check"><input type="checkbox" name="terms"> I’m 18 or older and agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. Next Level is a marketplace, not an agent.</label>
      <p class="err" hidden></p>
      <button class="btn pri block lg">Create account</button>
    </form>`);
  const sync = () => { const r = (s.querySelector('[name=role]:checked') || {}).value; s.querySelectorAll('[data-for]').forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(r); }); };
  s.querySelectorAll('[name=role]').forEach(x => x.addEventListener('change', sync)); sync();
  s.querySelectorAll('[data-mode]').forEach(t => t.onclick = () => {
    const m = t.dataset.mode; s.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-selected', x === t));
    s.querySelector('[data-form=login]').hidden = m !== 'in'; s.querySelector('[data-form=signup]').hidden = m === 'in';
    s.querySelector('.sheet-h h2').textContent = m === 'in' ? 'Log in' : 'Join Next Level';
  });
}

// ---------------------------------------------------------------- posts
function postCard(p) {
  const u = user(p.by), me = ME(), open = S.ui.open[p.id], cms = (D().comments[p.id] || []);
  const mine = me && p.by === me.id;
  return `<article class="card post" id="post-${p.id}">
    <div class="ph2">${who(u, { sub: [subline(u), u && u.sch].filter(Boolean).join(' · ') })}
      <div class="row"><span class="tiny dim" title="${esc(new Date(p.at).toLocaleString())}">${ago(p.at)}${p.edited ? ' · edited' : ''}</span><button class="btn ghost sm icon" data-act="postmenu" data-id="${p.id}" aria-label="Post options">${ic('more')}</button></div></div>
    ${p.img ? `<button class="media" data-act="zoom" data-src="${esc(p.img)}" aria-label="View photo full size"><img src="${esc(p.img)}" alt="${esc(p.type + ' photo from ' + nameOf(u))}" loading="lazy"></button>` : ''}
    <div class="bd">
      <div class="kicker"><span class="tag ${p.type === 'NIL partner' ? 'yellow' : p.type === 'Game day' ? 'red' : 'blue'}">${esc(p.type)}</span>${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}${p.season ? `<span class="tag">${esc(p.season)}</span>` : ''}</div>
      ${p.cap && p.cap !== '—' ? `<div class="cap">${linkify(p.cap)}</div>` : ''}
      ${p.type === 'NIL partner' ? `<div class="ad">Paid partnership${p.partner ? ' with ' + esc(p.partner) : ''}</div>` : ''}
    </div>
    <div class="ft">${PROPS.map(([k, l]) => `<button class="prop" data-act="prop" data-id="${p.id}" data-k="${k}" aria-pressed="${p.mine === k}">${esc(l)} <b>${p.props[k] || 0}</b></button>`).join('')}
      <button class="btn ghost sm" data-act="cmts" data-id="${p.id}" aria-expanded="${!!open}" style="margin-left:auto">${plural(p.cm, 'comment')}</button></div>
    ${open ? `<div class="cmts">${cms.length ? cms.map(c => { const cu = user(c.by); return `<div class="cmt">${cu ? `<a href="#/u/${cu.id}">${avatar(cu, 'xs')}</a>` : avatar(null, 'xs')}<div class="b"><a href="#/u/${c.by}">${esc(c.name)}</a> <span class="tiny dim">${ago(c.at)}</span><p>${linkify(c.t)}</p></div></div>`; }).join('') : '<p class="small dim" style="margin:8px 0 0">No comments yet.</p>'}
      ${me ? `<form class="row" data-form="comment" data-id="${p.id}"><input class="in" name="t" maxlength="300" placeholder="Add a comment" aria-label="Add a comment" autocomplete="off"><button class="btn sm">Post</button></form>` : `<p class="small dim" style="margin:0"><button class="btn ghost sm" data-act="join">Join free</button> to comment.</p>`}</div>` : ''}
  </article>`;
}
function editPost(p) {
  sheet('Edit post', `<form class="stack" data-form="editpost" data-id="${p.id}"><label class="field"><span>Opponent or event</span><input class="in" name="tag" maxlength="60" value="${esc(p.tag)}"></label>
    <label class="field"><span>Caption</span><textarea class="in" name="cap" maxlength="600" rows="5">${esc(p.cap === '—' ? '' : p.cap)}</textarea></label><p class="err" hidden></p></form>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendedit">Save</button>`);
}
function composer() {
  const s = sheet('New post', `<form class="stack" data-form="post" novalidate>
    <input type="file" accept="image/jpeg,image/png,image/webp" id="pfile" hidden>
    <div id="pdrop"><label class="drop" for="pfile">${ic('image')}<span><b style="color:var(--t);font-weight:500">Add a photo</b><br><span class="small">JPG, PNG or WebP. Optional for text posts.</span></span></label></div>
    <div class="grid2"><label class="field"><span>Type</span><select class="in" name="type">${D().rules.TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
      <label class="field"><span>Season</span><input class="in" name="season" maxlength="20" value="${new Date().getFullYear()} season"></label></div>
    <label class="field" data-partner hidden><span>Brand partner</span><input class="in" name="partner" maxlength="60" placeholder="Who is this partnership with?"><small>Next Level labels this post as a paid partnership, as the FTC requires.</small></label>
    <label class="field"><span>Opponent or event <small>(optional)</small></span><input class="in" name="tag" maxlength="60" placeholder="e.g. vs. Baylor · Big 12 Championships"></label>
    <label class="field"><span>Caption</span><textarea class="in" name="cap" maxlength="600" rows="4" placeholder="What happened?"></textarea></label>
    <p class="err" hidden></p></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendpost">Post</button>`);
  const f = s.querySelector('form'), type = f.type, part = s.querySelector('[data-partner]');
  type.onchange = () => { part.hidden = type.value !== 'NIL partner'; };
  s.querySelector('#pfile').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { const data = await readImage(file); f._img = data; s.querySelector('#pdrop').innerHTML = `<div class="preview"><img src="${data}" alt="Selected photo"><button type="button" class="btn sm" data-clear>Remove</button></div>`;
      s.querySelector('[data-clear]').onclick = () => { f._img = null; e.target.value = ''; s.querySelector('#pdrop').innerHTML = `<label class="drop" for="pfile">${ic('image')}<span><b style="color:var(--t);font-weight:500">Add a photo</b></span></label>`; };
    } catch (er) { formErr(f, er.message); }
  };
}

// ---------------------------------------------------------------- home (athlete, coach, fan)
function home() {
  const me = ME(), d = D();
  const tab = S.ui.feed;
  let posts = d.posts;
  if (me && tab === 'following') posts = posts.filter(p => d.following.includes(p.by) || p.by === me.id);
  const sports = [...new Set(d.posts.map(p => p.sport).filter(Boolean))].sort();
  if (S.ui.fsp) posts = posts.filter(p => p.sport === S.ui.fsp);
  const head = `<div class="ph"><div><h1 class="h1">${me ? 'Hey, ' + esc(me.f) : 'The Locker'}</h1></div>
    ${me && me.role === 'athlete' ? `<button class="btn pri" data-act="compose">${ic('plus')}New post</button>` : ''}</div>`;
  const tabs = (me ? `<div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === 'all'}" data-act="feed" data-v="all">Everyone</button><button role="tab" aria-selected="${tab === 'following'}" data-act="feed" data-v="following">Following</button></div>` : '')
    + (sports.length > 1 ? `<div class="row wrap" style="margin:-4px 0 4px">${['', ...sports].map(x => `<button class="chip" data-act="fsp" data-v="${esc(x)}" aria-pressed="${(S.ui.fsp || '') === x}">${esc(x || 'All sports')}</button>`).join('')}</div>` : '');
  const feed = posts.length ? posts.slice(0, 60).map(postCard).join('') :
    `<div class="card">${tab === 'following' ? empty('users', 'Nothing from people you follow yet', 'Follow athletes to see their highlights and game days here.', '<a class="btn" href="#/athletes">Find athletes</a>')
      : empty('image', 'No posts yet', me && me.role === 'athlete' ? 'Be the first. Share a highlight, a game day or a training session.' : 'When athletes share highlights and game days, they’ll show up here.', me && me.role === 'athlete' ? `<button class="btn pri" data-act="compose">${ic('plus')}New post</button>` : '<a class="btn" href="#/athletes">Browse athletes</a>')}</div>`;
  return { title: 'Home', html: `<div class="page">${head}<div class="cols"><div class="stack">${tabs}${feed}</div><aside>${homeAside()}</aside></div></div>` };
}
function profileTodo(me) {
  const posts = D().posts.filter(p => p.by === me.id).length;
  const items = [
    ['Add a profile photo', !!me.av, 'edit'], ['Write your bio', !!me.bio, 'edit'], ['Add at least 3 stats', (me.stats || []).length >= 3, 'edit'],
    ['Add your film link', !!me.hl, 'edit'], ['Add academics', !!(me.gpa || me.major), 'edit'], ['Link your socials', !!(me.soc && (me.soc.ig || me.soc.tt || me.soc.x)), 'edit'],
    ['Share your first post', posts > 0, 'compose']
  ];
  return items;
}
function viewsCard(me) {
  const v = me.views; if (!v) return '';
  return `<div class="card noprint"><div class="card-h"><h2 class="h2">Views</h2><span class="tiny dim">Last 7 days</span></div>
    <div class="stats4" style="grid-template-columns:1fr 1fr;gap:0"><div class="stat"><b style="color:var(--blue)">${v.coach7}</b><span>Coaches</span></div><div class="stat"><b style="color:var(--red)">${v.brand7}</b><span>Brands</span></div></div>
    <div class="card-b" style="padding-top:0">${v.schools.length ? `<div class="eyebrow" style="margin-bottom:8px">Coaches from</div><div class="row wrap">${v.schools.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : `<p class="small dim" style="margin:0">${v.total30 ? plural(v.total30, 'view') + ' in the last 30 days.' : 'When coaches and brands open your profile, you’ll see it here.'}</p>`}</div></div>`;
}
function homeAside() {
  const me = ME(), d = D();
  if (!me) return `<div class="card pad stack"><h2 class="h2">Join Next Level</h2><p class="muted small" style="margin:0">Follow athletes, give props and join the conversation. Free.</p><button class="btn pri" data-act="join">Join free</button></div>`;
  if (me.role === 'athlete') {
    const items = profileTodo(me), done = items.filter(i => i[1]).length, pct = Math.round(done / items.length * 100);
    const active = d.offers.filter(o => o.to === me.id && ['Active', 'Delivered'].includes(o.status)).length;
    return `${done < items.length ? `<div class="card pad stack"><div class="row between"><h2 class="h2">Your card</h2><span class="small muted">${pct}%</span></div><div class="meter"><i style="width:${pct}%"></i></div>
      <p class="small muted" style="margin:0">Complete profiles show up higher for coaches and brands.</p>
      <div>${items.map(([t, ok, act]) => ok ? `<div class="todo done">${ic('okc')}${esc(t)}</div>` : act === 'compose' ? `<button class="todo" data-act="compose">${ic('circle')}${esc(t)}</button>` : `<a class="todo" href="#/edit">${ic('circle')}${esc(t)}</a>`).join('')}</div></div>`
      : acard(me)}
      ${viewsCard(me)}
      <div class="card"><div class="card-h"><h2 class="h2">Deals</h2><a class="small" href="#/deals">Open</a></div><div class="stats4" style="grid-template-columns:1fr 1fr;gap:0">
        <div class="stat"><b style="color:var(--yellow)">${pendingOffers()}</b><span>New offers</span></div><div class="stat"><b>${active}</b><span>In progress</span></div></div></div>
      <div class="card pad stack"><h2 class="h2">Open campaigns</h2>${(() => { const c = d.campaigns.filter(x => !x.closed && !x.applied && x.brand !== me.id).slice(0, 3); return c.length ? c.map(x => `<a class="who" href="#/deals" data-act="tab" data-k="adeals" data-v="opps"><span class="av sm sq">${esc((x.brandName || 'B').slice(0, 2).toUpperCase())}</span><span style="min-width:0"><span class="nm"><span>${esc(x.title)}</span></span><span class="sub">${esc(x.brandName)} · ${esc(x.pay)}</span></span></a>`).join('') : '<p class="small dim" style="margin:0">No open campaigns right now. Brands post new ones often.</p>'; })()}</div>`;
  }
  if (me.role === 'coach') {
    const b = d.board || [], recent = athletes().slice().sort((x, y) => y.created - x.created).slice(0, 5);
    return `<div class="card"><div class="card-h"><h2 class="h2">Your board</h2><a class="small" href="#/board">Open</a></div><div class="stats4" style="grid-template-columns:1fr 1fr;gap:0">
      ${d.rules.STAGES.map(st => `<div class="stat"><b>${b.filter(x => x.stage === st).length}</b><span>${esc(st)}</span></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h2 class="h2">New athletes</h2><a class="small" href="#/athletes">Search</a></div>
      ${recent.length ? `<div class="list">${recent.map(u => `<div style="padding:12px 16px">${who(u)}</div>`).join('')}</div>` : `<div class="card-b small dim">No athletes have joined yet.</div>`}</div>
      ${!me.verified ? `<div class="note">${ic('shield')}<span><b>Get verified.</b> We verify coaches against school staff directories. Email <a href="mailto:${SUPPORT}?subject=Coach%20verification">${SUPPORT}</a> from your school address.</span></div>` : ''}`;
  }
  const sug = athletes().filter(u => !following(u.id)).slice(0, 5);
  return `<div class="card"><div class="card-h"><h2 class="h2">Athletes to follow</h2><a class="small" href="#/athletes">All</a></div>
    ${sug.length ? `<div class="list">${sug.map(u => `<div class="row" style="padding:12px 16px">${who(u)}<button class="btn sm" data-act="follow" data-id="${u.id}">Follow</button></div>`).join('')}</div>` : '<div class="card-b small dim">You’re following everyone. Nice.</div>'}</div>`;
}
function single(id) {
  const p = D().posts.find(x => x.id === +id);
  if (!p) return { title: 'Post', html: `<div class="page narrow">${empty('image', 'This post isn’t available', 'It may have been deleted.', '<a class="btn" href="#/home">Go home</a>')}</div>` };
  S.ui.open[p.id] = true;
  return { title: 'Post', html: `<div class="page narrow"><button class="btn ghost sm" data-act="back" style="margin-bottom:12px">${ic('left')}Back</button>${postCard(p)}</div>` };
}

// ---------------------------------------------------------------- athlete card
function acardInner(u) {
  const r = role();
  let strip;
  if (r === 'brand') {
    strip = `<div><b>${compact(followers(u))}</b><span>Followers</span></div><div><b>${u.rate ? money(u.rate[0]) : '—'}</b><span>Story</span></div><div><b>${u.rate ? money(u.rate[1]) : '—'}</b><span>Post</span></div><div><b>${u.deals}</b><span>Deals</span></div>`;
  } else {
    const st = (u.stats || []).slice(0, 4);
    strip = st.length ? st.map(x => `<div><b>${esc(x.v)}</b><span>${esc(x.k)}</span></div>`).join('') : `<div class="none">No stats added yet</div>`;
  }
  return `${field(u.sp, 'mini')}<div class="top-r">${avatar(u, '')}<div style="min-width:0"><div class="nm">${u.num ? `<span class="numchip">${esc(u.num)}</span>` : ''}<span>${esc(u.f)} ${esc(u.l)}</span>${u.verified ? VF : ''}</div>
    <div class="meta">${esc(subline(u)) || 'Athlete'}</div><div class="meta2">${esc(schoolLine(u))}${u.portal ? ' <span class="tag yellow" style="margin-left:4px">Transfer portal</span>' : ''}</div></div></div><div class="strip">${strip}</div>`;
}
const acard = u => `<a class="acard" href="#/u/${u.id}">${acardInner(u)}</a>`;

// ---------------------------------------------------------------- search
function filtered() {
  const f = S.ui.f, q = f.q.trim().toLowerCase();
  let list = athletes();
  if (q) list = list.filter(u => [u.f + ' ' + u.l, u.sch, u.sp, u.pos, u.home, u.st].join(' ').toLowerCase().includes(q));
  if (f.sp) list = list.filter(u => u.sp === f.sp);
  if (f.yr) list = list.filter(u => u.yr === f.yr);
  if (f.st) list = list.filter(u => u.st === f.st);
  if (f.pos) list = list.filter(u => (u.pos || '').toLowerCase().includes(f.pos.toLowerCase()));
  if (f.vf) list = list.filter(u => u.verified);
  if (f.cat) list = list.filter(u => (u.open || []).includes(f.cat));
  if (f.grad) list = list.filter(u => u.grad === f.grad);
  if (f.gpa) list = list.filter(u => +u.gpa >= +f.gpa);
  if (f.fol) list = list.filter(u => followers(u) >= +f.fol);
  if (f.saved) list = list.filter(u => (D().saved || []).includes(u.id));
  if (f.portal) list = list.filter(u => u.portal);
  if (f.appear) list = list.filter(u => u.appear && u.appear.on);
  const sorts = { best: (a, b) => completeness(b) - completeness(a) || b.created - a.created, new: (a, b) => b.created - a.created, fol: (a, b) => followers(b) - followers(a), rate: (a, b) => ((a.rate || [0])[1]) - ((b.rate || [0])[1]), name: (a, b) => (a.l + a.f).localeCompare(b.l + b.f) };
  return list.slice().sort(sorts[f.sort] || sorts.best);
}
function results() {
  const list = filtered(), q = schoolKey(S.ui.f.q);
  const schools = q.length >= 2 ? [...new Map(D().users.filter(u => u.sch && schoolKey(u.sch).includes(q)).map(u => [schoolKey(u.sch), u.sch])).values()].slice(0, 4) : [];
  return `${schools.length ? `<div class="row wrap" style="margin-bottom:12px"><span class="small muted">Programs:</span>${schools.map(x => `<a class="chip" href="${schoolHref(x)}">${esc(x)}</a>`).join('')}</div>` : ''}<div class="row between" style="margin-bottom:12px"><span class="small muted">${plural(list.length, 'athlete')}</span></div>
    ${list.length ? `<div class="agrid">${list.map(acard).join('')}</div>` : S.ui.f.saved ? `<div class="card">${empty('star', 'No saved athletes', 'Tap Save on an athlete’s profile to build your shortlist.')}</div>` : `<div class="card">${empty('search', athletes().length ? 'No athletes match those filters' : 'No athletes yet', athletes().length ? 'Try removing a filter or searching a different school or sport.' : 'Athletes are joining now. Check back soon.', athletes().length ? '<button class="btn" data-act="clearf">Clear filters</button>' : '')}</div>`}`;
}
function search() {
  const f = S.ui.f, r = role(), d = D();
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  return { title: r === 'brand' ? 'Find athletes' : 'Athletes', html: `<div class="page">
    <div class="ph"><div><h1 class="h1">${r === 'brand' ? 'Find athletes' : r === 'coach' ? 'Search athletes' : 'Athletes'}</h1>
      <p>${r === 'brand' ? 'Every athlete here is a current college athlete. Offers you send are checked for compliance first.' : r === 'coach' ? 'Filter by sport, position, class and state. Add anyone to your private board.' : 'College athletes on Next Level.'}</p></div></div>
    <form class="filters" data-form="filters">
      <input class="in" name="q" placeholder="Name, school or hometown" value="${esc(f.q)}" aria-label="Search" style="grid-column:span 2">
      <select class="in" name="sp" aria-label="Sport"><option value="">All sports</option>${opt(SPORTS, f.sp)}</select>
      <input class="in" name="pos" placeholder="Position" value="${esc(f.pos)}" aria-label="Position">
      <select class="in" name="yr" aria-label="Class"><option value="">Any class</option>${opt(CLASSES, f.yr)}</select>
      <select class="in" name="st" aria-label="State"><option value="">Any state</option>${opt(STATES, f.st)}</select>
      <select class="in" name="grad" aria-label="Grad year"><option value="">Any grad year</option>${opt(GRADS(), f.grad)}</select>
      ${r === 'coach' ? `<label class="check" style="align-self:center"><input type="checkbox" name="portal" ${f.portal ? 'checked' : ''}> Transfer portal only</label>` : ''}
      ${r === 'coach' ? `<select class="in" name="gpa" aria-label="Minimum GPA"><option value="">Any GPA</option>${['2.5', '3.0', '3.5', '3.8'].map(g => `<option value="${g}" ${f.gpa === g ? 'selected' : ''}>${g}+ GPA</option>`).join('')}</select>` : ''}
      ${r === 'brand' ? `<label class="check" style="align-self:center"><input type="checkbox" name="appear" ${f.appear ? 'checked' : ''}> Does appearances</label>` : ''}
      ${r === 'brand' ? `<select class="in" name="fol" aria-label="Minimum followers"><option value="">Any followers</option>${[1000, 5000, 10000, 50000, 100000].map(n => `<option value="${n}" ${+f.fol === n ? 'selected' : ''}>${compact(n)}+ followers</option>`).join('')}</select>` : ''}
      ${r === 'brand' ? `<select class="in" name="cat" aria-label="Open to category"><option value="">Any category</option>${opt(d.rules.CATS, f.cat)}</select>` : ''}
      <select class="in" name="sort" aria-label="Sort"><option value="best" ${f.sort === 'best' ? 'selected' : ''}>Most complete</option><option value="new" ${f.sort === 'new' ? 'selected' : ''}>Newest</option><option value="name" ${f.sort === 'name' ? 'selected' : ''}>Name</option>${r === 'brand' ? `<option value="fol" ${f.sort === 'fol' ? 'selected' : ''}>Most followers</option><option value="rate" ${f.sort === 'rate' ? 'selected' : ''}>Lowest post rate</option>` : ''}</select>
      <label class="check" style="align-self:center"><input type="checkbox" name="vf" ${f.vf ? 'checked' : ''}> Verified only</label>
    </form>
    ${r === 'brand' ? `<div class="tabs" role="tablist"><button role="tab" aria-selected="${!f.saved}" data-act="savedtab" data-v="">All athletes</button><button role="tab" aria-selected="${f.saved}" data-act="savedtab" data-v="1">Saved <span class="count">${(D().saved || []).length}</span></button></div>` : ''}
    <div id="results">${results()}</div></div>` };
}

// ---------------------------------------------------------------- profiles
function profile(id) {
  const u = user(id), me = ME();
  if (!u) return { title: 'Not found', html: `<div class="page narrow">${empty('user', 'This account doesn’t exist', 'It may have been deleted.', '<a class="btn" href="#/athletes">Browse athletes</a>')}</div>` };
  const mine = me && me.id === u.id, r = role();
  if (!mine && u.role === 'athlete' && (r === 'coach' || r === 'brand') && !S.viewed[u.id]) { S.viewed[u.id] = 1; api('/api/view', { id: u.id }).catch(() => {}); }
  const posts = D().posts.filter(p => p.by === u.id);
  const acts = [];
  if (mine) {
    acts.push(`<a class="btn" href="#/edit">${ic('edit')}Edit profile</a>`);
    if (u.role === 'athlete') acts.push(`<button class="btn" data-act="storycard">${ic('image')}Share card</button>`, `<button class="btn pri" data-act="compose">${ic('plus')}New post</button>`);
  } else {
    if (r === 'brand' && u.role === 'athlete') { acts.push(`<button class="btn pri" data-act="offer" data-id="${u.id}">${ic('dollar')}Send offer</button>`); acts.push(`<button class="btn" data-act="save" data-id="${u.id}">${ic('star')}${(D().saved || []).includes(u.id) ? 'Saved' : 'Save'}</button>`); }
    if ((r === 'coach' || r === 'brand') && u.role === 'athlete') acts.push(`<button class="btn" data-act="cmpadd" data-id="${u.id}" aria-pressed="${S.cmp.includes(u.id)}">${S.cmp.includes(u.id) ? 'In compare' : 'Compare'}</button>`);
    if (r === 'coach' && u.role === 'athlete') { const b = boardRow(u.id); acts.push(`<button class="btn ${b ? '' : 'pri'}" data-act="boardadd" data-id="${u.id}">${ic('board')}${b ? esc(b.stage) : 'Add to board'}</button>`); }
    acts.push(`<button class="btn" data-act="follow" data-id="${u.id}">${me && following(u.id) ? 'Following' : 'Follow'}</button>`);
    acts.push(`<a class="btn" href="#/messages/new/${u.id}" data-need="1">${ic('msg')}Message</a>`);
  }
  acts.push(`<button class="btn icon" data-act="profmenu" data-id="${u.id}" aria-label="More">${ic('more')}</button>`);
  const counts = `<div class="row wrap small muted" style="gap:16px;margin-top:10px"><span><b style="color:var(--t)">${u.fol}</b> followers</span><span><b style="color:var(--t)">${u.fing}</b> following</span>${u.role === 'athlete' ? `<span><b style="color:var(--t)">${posts.length}</b> posts</span>` : ''}${u.role === 'athlete' && u.deals ? `<span><b style="color:var(--t)">${u.deals}</b> NIL ${u.deals === 1 ? 'deal' : 'deals'}</span>` : ''}</div>`;
  const header = `<section class="card prof prof-${u.role}"><div class="ban">${field(u.role === 'brand' ? '' : u.sp)}<div class="line"></div></div>
    <div class="body"><div class="idrow">${avatar(u, 'xl')}<div class="acts">${acts.join('')}</div></div>
    <h1><span class="plate">${u.role === 'athlete' && u.num ? `<span class="num">${esc(u.num)}</span>` : ''}<span class="nmtxt">${esc(nameOf(u))}</span></span>${u.verified ? VF : ''}</h1>
    <div class="line1">${esc(u.role === 'brand' ? (u.brand && u.brand.cat) || 'Brand' : u.role === 'athlete' ? [u.sp, u.pos, u.yr].filter(Boolean).join(' · ') : u.role === 'coach' ? [u.title || 'Coach', u.sp, u.div].filter(Boolean).join(' · ') : 'Fan')}</div>
    <div class="line2">${u.role === 'brand' ? esc([u.f + ' ' + u.l, u.home, u.st].filter(Boolean).join(' · ')) : (u.sch ? `<a class="schl" href="${schoolHref(u.sch)}">${esc(u.sch)}</a>` : '') + (u.st ? esc((u.sch ? ', ' : '') + u.st) : '')}${u.role === 'brand' && u.brand && u.brand.site ? ` · <a href="${esc(u.brand.site)}" target="_blank" rel="noopener noreferrer">${esc(u.brand.site.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}</div>
    ${u.portal ? '<div style="margin-top:10px"><span class="tag yellow">In the transfer portal</span></div>' : ''}${counts}<div class="printonly small" style="margin-top:6px">Next Level profile: ${esc(location.origin + '/a/' + u.id)}</div>
    ${u.role === 'athlete' && (u.stats || []).length ? `<div class="bigstats">${u.stats.map(x => `<div><b>${esc(x.v)}</b><span>${esc(x.k)}</span></div>`).join('')}</div>` : ''}
    ${mine && u.role === 'athlete' && !(u.stats || []).length ? `<div class="note" style="margin-top:16px">${ic('info')}<span><b>Add your stats.</b> Coaches and brands see them first. <a href="#/edit">Add stats</a></span></div>` : ''}
    ${mine && !u.verified && (u.role === 'athlete' || u.role === 'coach') ? `<div class="note" style="margin-top:12px">${ic('shield')}<span><b>Not verified yet.</b> We verify ${u.role === 'athlete' ? 'athletes against official team rosters' : 'coaches against school staff directories'}. Email <a href="mailto:${SUPPORT}?subject=Verification">${SUPPORT}</a> from your school email to speed it up.</span></div>` : ''}
    </div></section>`;
  let main = '', side = '';
  if (u.role === 'athlete') {
    const det = [['Position', u.pos], ['Jersey', u.num ? '#' + u.num : ''], ['Class', u.yr], ['Grad year', u.grad], ['Height', u.ht], ['Weight', u.wt], ['Hometown', u.home], ['Division', u.div]].filter(x => x[1]);
    const box = (t, body, edit) => `<div class="card"><div class="card-h"><h2 class="h2">${t}</h2>${mine && edit ? `<a class="small" href="#/edit">Edit</a>` : ''}</div><div class="card-b">${body}</div></div>`;
    const soc = u.soc || {};
    const socials = [['ig', 'Instagram', 'https://instagram.com/', soc.igN], ['tt', 'TikTok', 'https://www.tiktok.com/@', soc.ttN], ['x', 'X', 'https://x.com/', soc.xN]].filter(s => soc[s[0]]);
    side = [
      mine ? viewsCard(me) : '',
      u.bio || mine ? box('About', u.bio ? `<p style="margin:0;white-space:pre-wrap">${esc(u.bio)}</p>` : '<p class="small dim" style="margin:0">Tell coaches and brands who you are. <a href="#/edit">Add a bio</a></p>', true) : '',
      det.length ? box('Details', `<dl class="kv" style="margin:0">${det.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`, true) : '',
      (u.meas || []).length ? box('Measurables', `<dl class="kv" style="margin:0">${u.meas.map(x => `<div><dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd></div>`).join('')}</dl>`, true) : '',
      u.gpa || u.major ? box('Academics', `<dl class="kv" style="margin:0">${u.gpa ? `<div><dt>GPA</dt><dd>${esc(u.gpa)}</dd></div>` : ''}${u.major ? `<div><dt>Major</dt><dd>${esc(u.major)}</dd></div>` : ''}</dl>`, true) : '',
      u.hl ? box('Film', `${filmEmbed(u.hl) ? `<div class="film"><iframe src="${esc(filmEmbed(u.hl))}" title="${esc(u.f)}’s highlight film" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}<a class="btn block" href="${esc(u.hl)}" target="_blank" rel="noopener noreferrer"${filmEmbed(u.hl) ? ' style="margin-top:10px"' : ''}>${ic('play')}${filmEmbed(u.hl) ? 'Open full film' : 'Watch film'}${ic('ext')}</a><div class="printonly small">${esc(u.hl)}</div>`, true) : '',
      socials.length ? box('Socials', `<div class="soc">${socials.map(s => `<a href="${s[2]}${esc(soc[s[0]])}" target="_blank" rel="noopener noreferrer">${s[3] ? `<b>${compact(s[3])}</b>` : ''}<span>${s[1]}</span></a>`).join('')}</div><p class="tiny dim" style="margin:10px 0 0">Follower counts are added by the athlete.</p>`, true) : '',
      (u.awards || []).length ? box('Awards', `<ul style="margin:0;padding-left:18px;display:grid;gap:6px">${u.awards.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`, true) : '',
      (r === 'brand' || mine) ? box('NIL', `<div class="rates">${['Story', 'Post or reel', 'Appearance'].map((l, i) => `<div><b>${money((u.rate || [])[i])}</b><span>${l}</span></div>`).join('')}</div>
        ${u.appear && u.appear.on ? `<p class="small" style="margin:14px 0 0">${ic('check', 'vf')} Available for appearances${u.appear.area ? ' in ' + esc(u.appear.area) : ''}</p>` : ''}
        <div class="eyebrow" style="margin:16px 0 8px">Open to</div><div class="row wrap">${(u.open || []).length ? u.open.map(c => `<span class="chip">${esc(c)}</span>`).join('') : '<span class="small dim">No categories selected</span>'}</div>`, true) : ''
    ].join('');
    const pinned = u.pin ? posts.find(p => p.id === u.pin) : null, rest = pinned ? posts.filter(p => p !== pinned) : posts;
    main = `${pinned ? `<div class="sec-h"><h2 class="h2">Pinned</h2></div>${postCard(pinned)}` : ''}<div class="sec-h"${pinned ? ' style="margin-top:8px"' : ''}><h2 class="h2">Posts</h2></div>${rest.length ? `<div class="pgrid">${rest.map(p => `<a href="#/p/${p.id}" aria-label="${esc(p.type)} post">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : `<span class="txt">${esc(p.cap)}</span>`}</a>`).join('')}</div>`
      : pinned ? '' : `<div class="card">${empty('image', 'No posts yet', mine ? 'Share a highlight, game day or training session.' : '', mine ? `<button class="btn pri" data-act="compose">${ic('plus')}New post</button>` : '')}</div>`}`;
  } else if (u.role === 'brand') {
    const camps = D().campaigns.filter(c => c.brand === u.id && !c.closed);
    main = `<div class="sec-h"><h2 class="h2">Open campaigns</h2></div>${camps.length ? `<div class="stack">${camps.map(campCardAthlete).join('')}</div>` : `<div class="card">${empty('brief', 'No open campaigns', mine ? 'Post a campaign and athletes can apply.' : '', mine ? '<a class="btn pri" href="#/campaigns">Post a campaign</a>' : '')}</div>`}`;
    side = u.bio ? `<div class="card"><div class="card-h"><h2 class="h2">About</h2></div><div class="card-b"><p style="margin:0;white-space:pre-wrap">${esc(u.bio)}</p></div></div>` : '';
  } else {
    main = u.bio ? `<div class="card"><div class="card-h"><h2 class="h2">About</h2></div><div class="card-b"><p style="margin:0;white-space:pre-wrap">${esc(u.bio)}</p></div></div>` : `<div class="card">${empty('user', mine ? 'Add a bio' : 'No bio yet', mine ? 'Let athletes know who you are.' : '', mine ? '<a class="btn" href="#/edit">Edit profile</a>' : '')}</div>`;
  }
  return { title: nameOf(u), html: `<div class="page stack lg">${header}<div class="cols"><div class="stack">${main}</div><aside>${side}</aside></div></div>` };
}

// ---------------------------------------------------------------- program pages: everyone at a school, grouped by sport
const schoolKey = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const schoolHref = s => '#/school/' + encodeURIComponent(String(s).trim());
function school(name) {
  const key = schoolKey(name), d = D();
  const people = d.users.filter(u => schoolKey(u.sch) === key && (u.role === 'athlete' || u.role === 'coach'));
  const title = (people[0] && people[0].sch) || name;
  const ath = people.filter(u => u.role === 'athlete'), coaches = people.filter(u => u.role === 'coach');
  const sports = [...new Set(ath.map(u => u.sp || 'Other'))].sort();
  const tab = sports.includes(S.ui.schsp) ? S.ui.schsp : '';
  const shown = ath.filter(u => !tab || (u.sp || 'Other') === tab).sort((a, b) => completeness(b) - completeness(a));
  const st = [...new Set(people.map(u => u.st).filter(Boolean))][0];
  if (!people.length) return { title, html: `<div class="page narrow"><h1 class="sr">${esc(title)}</h1>${empty('users', 'No one from this school yet', 'When athletes and coaches from ' + esc(title) + ' join, they’ll show up here.', '<a class="btn" href="#/athletes">Browse athletes</a>')}</div>` };
  return { title, html: `<div class="page stack lg">
    <section class="card sch-hero">${field(tab || sports[0] || '')}<h1>${esc(title)}</h1>${st ? `<div class="muted" style="margin-top:6px">${esc(st)}</div>` : ''}
      <div class="sch-stats"><div><b>${ath.length}</b><span>Athletes</span></div><div><b>${sports.length}</b><span>${sports.length === 1 ? 'Sport' : 'Sports'}</span></div><div><b>${coaches.length}</b><span>${coaches.length === 1 ? 'Coach' : 'Coaches'}</span></div><div><b>${ath.filter(u => u.verified).length}</b><span>Verified</span></div></div></section>
    <div class="cols"><div class="stack">
      ${sports.length > 1 ? `<div class="row wrap">${['', ...sports].map(x => `<button class="chip" data-act="schsp" data-v="${esc(x)}" aria-pressed="${tab === x}">${esc(x || 'All sports')}</button>`).join('')}</div>` : ''}
      ${shown.length ? `<div class="agrid">${shown.map(acard).join('')}</div>` : `<div class="card">${empty('users', 'No athletes yet', '')}</div>`}
    </div><aside><div class="card"><div class="card-h"><h2 class="h2">Coaches</h2></div>${coaches.length ? `<div class="list">${coaches.map(u => `<div style="padding:12px 16px">${who(u, { sub: [u.title || 'Coach', u.sp].filter(Boolean).join(' · ') })}</div>`).join('')}</div>` : '<div class="card-b small dim">No coaches from this school have joined yet.</div>'}</div></aside></div></div>` };
}

// ---------------------------------------------------------------- compare athletes side by side
function compare() {
  const list = S.cmp.map(user).filter(u => u && u.role === 'athlete');
  if (!list.length) return { title: 'Compare', html: `<div class="page narrow"><div class="ph"><h1 class="h1">Compare</h1></div>${empty('users', 'Nothing to compare yet', 'Open athlete profiles and tap Compare on up to three of them.', '<a class="btn pri" href="#/athletes">Find athletes</a>')}</div>` };
  const keys = [...new Set(list.flatMap(u => (u.stats || []).map(x => x.k)))].slice(0, 10);
  const mkeys = [...new Set(list.flatMap(u => (u.meas || []).map(x => x.k)))].slice(0, 6);
  const val = (u, arr, k) => { const x = (u[arr] || []).find(y => y.k === k); return x ? esc(x.v) : '<span class="dim">—</span>'; };
  const row = (label, f) => `<tr><th scope="row">${label}</th>${list.map(u => `<td>${f(u)}</td>`).join('')}</tr>`;
  const r = role();
  return { title: 'Compare', html: `<div class="page"><div class="ph"><div><h1 class="h1">Compare</h1><p>Side by side, from what each athlete added to their profile.</p></div><button class="btn" data-act="cmpclear">Clear</button></div>
    <div class="card cmpwrap"><table class="cmp">
      <thead><tr><th></th>${list.map(u => `<th scope="col"><div class="stack" style="gap:10px">${who(u)}<button class="btn ghost sm" data-act="cmpadd" data-id="${u.id}">Remove</button></div></th>`).join('')}</tr></thead>
      <tbody>
        <tr class="grp"><th colspan="${list.length + 1}">Basics</th></tr>
        ${row('School', u => esc(schoolLine(u)) || '<span class="dim">—</span>')}${row('Position', u => esc(u.pos) || '<span class="dim">—</span>')}${row('Class', u => esc(u.yr) || '<span class="dim">—</span>')}
        ${row('Grad year', u => esc(u.grad) || '<span class="dim">—</span>')}${row('Height', u => esc(u.ht) || '<span class="dim">—</span>')}${row('Weight', u => esc(u.wt) || '<span class="dim">—</span>')}
        ${keys.length ? `<tr class="grp"><th colspan="${list.length + 1}">Stats</th></tr>${keys.map(k => row(esc(k), u => `<b class="cv">${val(u, 'stats', k)}</b>`)).join('')}` : ''}
        ${mkeys.length ? `<tr class="grp"><th colspan="${list.length + 1}">Measurables</th></tr>${mkeys.map(k => row(esc(k), u => val(u, 'meas', k))).join('')}` : ''}
        <tr class="grp"><th colspan="${list.length + 1}">More</th></tr>
        ${row('GPA', u => esc(u.gpa) || '<span class="dim">—</span>')}${row('Film', u => u.hl ? `<a href="${esc(u.hl)}" target="_blank" rel="noopener noreferrer">Watch</a>` : '<span class="dim">—</span>')}
        ${r === 'brand' ? row('Followers', u => compact(followers(u))) + row('Post rate', u => u.rate ? money(u.rate[1]) : '—') + row('NIL deals', u => u.deals) : ''}
        ${row('Verified', u => u.verified ? `<span class="tag green">Verified</span>` : '<span class="dim">Not yet</span>')}
      </tbody></table></div></div>` };
}

// ---------------------------------------------------------------- coach board
function board() {
  const d = D(), rows = (d.board || []).map(b => ({ ...b, u: user(b.athlete) })).filter(b => b.u);
  return { title: 'Board', html: `<div class="page" style="max-width:none">
    <div class="ph"><div><h1 class="h1">Your board</h1><p>Only you can see your board and notes.</p></div><a class="btn pri" href="#/athletes">${ic('search')}Find athletes</a></div>
    ${rows.length ? `<div class="board">${d.rules.STAGES.map(st => { const list = rows.filter(r => r.stage === st).sort((a, b) => b.at - a.at); return `<section class="lane"><div class="lane-h"><span class="d" style="font-size:22px">${esc(st)}</span><span class="tag">${list.length}</span></div>
      <div class="lane-b">${list.length ? list.map(r => `<div class="bcard">${who(r.u)}${r.note ? `<div class="nt">${esc(r.note)}</div>` : ''}
        <div class="row"><select class="in" style="height:32px;font-size:13px" data-act="stage" data-id="${r.u.id}" aria-label="Stage for ${esc(nameOf(r.u))}">${d.rules.STAGES.map(s => `<option ${s === st ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
        <button class="btn sm icon" data-act="boardadd" data-id="${r.u.id}" aria-label="Edit note">${ic('edit')}</button></div></div>`).join('') : '<p class="small dim" style="margin:6px 4px">No one here yet.</p>'}</div></section>`; }).join('')}</div>`
      : `<div class="card">${empty('board', 'Your board is empty', 'Search athletes and add them to your board to track where each recruit stands.', '<a class="btn pri" href="#/athletes">Search athletes</a>')}</div>`}</div>` };
}
function boardSheet(id) {
  const u = user(id), b = boardRow(id), st = D().rules.STAGES;
  const s = sheet(b ? 'Board note' : 'Add to board', `<form class="stack" data-form="board" data-id="${u.id}">
    ${who(u)}
    <div class="field"><span>Stage</span><div class="row wrap">${st.map((x, i) => `<label class="chip" style="cursor:pointer"><input type="radio" name="stage" value="${esc(x)}" ${(b ? b.stage === x : i === 0) ? 'checked' : ''} style="accent-color:var(--blue)"> ${esc(x)}</label>`).join('')}</div></div>
    <label class="field"><span>Private note</span><textarea class="in" name="note" maxlength="1000" rows="4" placeholder="Film thoughts, contact history, next steps">${esc(b ? b.note : '')}</textarea><small>Only you can see this.</small></label>
    <p class="err" hidden></p></form>`, `${b ? `<button class="btn danger" data-act="boardrm" data-id="${u.id}" style="margin-right:auto">Remove</button>` : ''}<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="boardsave">Save</button>`);
  return s;
}

// ---------------------------------------------------------------- campaigns
function campCardAthlete(c) {
  const me = ME(), left = Math.max(0, c.spots - c.taken);
  const canApply = me && me.role === 'athlete' && !c.applied && !c.closed;
  const st = c.appStatus;
  const bu = user(c.brand);
  return `<div class="card deal"><div class="row between" style="align-items:flex-start"><div class="row" style="min-width:0;gap:12px;align-items:flex-start">${avatar(bu || { role: 'brand', brand: { name: c.brandName } }, '')}<div style="min-width:0"><div class="small muted">${esc(c.brandName)} · ${esc(c.cat)}</div><h3 class="d" style="font-size:28px;margin-top:4px">${esc(c.title)}</h3></div></div><div class="amt" style="font-size:28px;text-align:right">${esc(c.pay)}</div></div>
    <p style="margin:0">${esc(c.del)}</p>
    <div class="row wrap small muted" style="gap:14px"><span>For: ${esc(c.need)}</span><span>Apply by: ${esc(c.due)}</span><span>${plural(left, 'spot')} left</span></div>
    <div class="row">${st ? `<span class="tag ${st === 'Accepted' ? 'green' : st === 'Declined' ? '' : 'blue'}">${st === 'Declined' ? 'Not selected' : esc(st)}</span>` : ''}
      ${canApply ? `<button class="btn pri sm" data-act="apply" data-id="${c.id}">Apply</button>` : ''}${!me ? '<button class="btn sm" data-act="join" data-role="athlete">Join to apply</button>' : ''}
      <a class="btn ghost sm" href="#/u/${c.brand}">View brand</a></div></div>`;
}
function campaigns() {
  const me = ME(), mine = D().campaigns.filter(c => c.brand === me.id).sort((a, b) => b.at - a.at);
  return { title: 'Campaigns', html: `<div class="page">
    <div class="ph"><div><h1 class="h1">Campaigns</h1><p>Post what you need. Athletes apply, and you pick who joins.</p></div><button class="btn pri" data-act="newcamp">${ic('plus')}New campaign</button></div>
    ${mine.length ? `<div class="stack">${mine.map(c => { const apps = c.applicants || [], nw = apps.filter(a => a.status === 'Applied').length; return `<a class="card deal" href="#/campaigns/${c.id}" style="color:inherit;text-decoration:none">
      <div class="row between"><div style="min-width:0"><div class="row" style="gap:8px">${c.closed ? '<span class="tag">Closed</span>' : '<span class="tag green">Open</span>'}${nw ? `<span class="tag blue">${plural(nw, 'new applicant')}</span>` : ''}</div><h3 class="d" style="font-size:28px;margin-top:8px">${esc(c.title)}</h3></div>${ic('right')}</div>
      <div class="row wrap small muted" style="gap:14px"><span>${esc(c.pay)}</span><span>${c.taken} of ${c.spots} spots filled</span><span>${plural(apps.length, 'applicant')}</span><span>Apply by ${esc(c.due)}</span></div></a>`; }).join('')}</div>`
      : `<div class="card">${empty('brief', 'No campaigns yet', 'A campaign is an open call, like “3 athletes to post a game-day story with our drink.” Athletes apply and you choose.', `<button class="btn pri" data-act="newcamp">${ic('plus')}New campaign</button>`)}</div>`}</div>` };
}
function campaign(id) {
  const me = ME(), c = D().campaigns.find(x => x.id === +id && x.brand === me.id);
  if (!c) return notFound();
  const tab = S.ui.tab.camp || 'Applied', apps = c.applicants || [];
  const list = apps.filter(a => a.status === tab);
  return { title: c.title, html: `<div class="page">
    <a class="btn ghost sm" href="#/campaigns" style="margin-bottom:12px">${ic('left')}Campaigns</a>
    <div class="card deal" style="margin-bottom:20px"><div class="row between wrap" style="align-items:flex-start"><div><div class="row">${c.closed ? '<span class="tag">Closed</span>' : '<span class="tag green">Open</span>'}</div><h1 class="h1" style="margin-top:10px">${esc(c.title)}</h1></div>
      <div class="row wrap"><button class="btn" data-act="editcamp" data-id="${c.id}">${ic('edit')}Edit</button><button class="btn" data-act="closecamp" data-id="${c.id}">${c.closed ? 'Reopen campaign' : 'Close campaign'}</button></div></div>
      <p style="margin:0">${esc(c.del)}</p>
      <div class="stats4"><div class="stat" style="padding:0"><b style="color:var(--yellow);font-size:28px;line-height:1">${esc(c.pay)}</b><span>Pay</span></div><div class="stat" style="padding:0"><b>${c.taken}/${c.spots}</b><span>Spots filled</span></div><div class="stat" style="padding:0"><b>${apps.length}</b><span>Applicants</span></div><div class="stat" style="padding:0"><b style="font-size:28px;line-height:1">${esc(c.due)}</b><span>Apply by</span></div></div>
      <div class="small muted">Looking for: ${esc(c.need)}</div></div>
    <div class="tabs" role="tablist">${['Applied', 'Accepted', 'Declined'].map(t => `<button role="tab" aria-selected="${tab === t}" data-act="tab" data-k="camp" data-v="${t}">${t === 'Applied' ? 'To review' : t} <span class="count">${apps.filter(a => a.status === t).length}</span></button>`).join('')}</div>
    ${list.length ? `<div class="agrid">${list.map(a => `<div class="acard">${acardInner(a)}${a.pitch ? `<p class="pitch">“${esc(a.pitch)}”</p>` : ''}<div class="row wrap">${tab === 'Accepted' ? `<button class="btn pri sm" data-act="offer" data-id="${a.id}" data-camp="${c.id}">Send offer</button>` : ''}${tab !== 'Accepted' ? `<button class="btn pri sm" data-act="decide" data-app="${a.app}" data-ok="1">Accept</button>` : ''}${tab !== 'Declined' ? `<button class="btn sm" data-act="decide" data-app="${a.app}" data-ok="">Decline</button>` : ''}<a class="btn ghost sm" href="#/u/${a.id}">Profile</a><a class="btn ghost sm" href="#/messages/new/${a.id}">Message</a></div></div>`).join('')}</div>`
      : `<div class="card">${empty('users', tab === 'Applied' ? 'No one to review' : tab === 'Accepted' ? 'No one accepted yet' : 'No one declined', tab === 'Applied' ? 'New applicants show up here. You’ll also get a notification.' : '')}</div>`}
    <div class="note" style="margin-top:20px">${ic('info')}<span>Accepting an athlete sends them a message with next steps. Agree on the details there, then use <b>Send offer</b> on their profile so the deal is compliance-checked and tracked.</span></div></div>` };
}
function campSheet(c) {
  const v = k => c ? esc(c[k]) : '';
  sheet(c ? 'Edit campaign' : 'New campaign', `<form class="stack" data-form="camp" ${c ? `data-id="${c.id}"` : ''} novalidate>
    <label class="field"><span>Title</span><input class="in" name="title" maxlength="60" placeholder="e.g. Game-day story with our new drink" value="${v('title')}" required></label>
    <label class="field"><span>What athletes will do</span><textarea class="in" name="del" maxlength="160" rows="3" placeholder="e.g. 1 Instagram story on game day showing the drink, tagged @brand" required>${v('del')}</textarea></label>
    <label class="field"><span>Who you’re looking for</span><input class="in" name="need" maxlength="160" placeholder="e.g. Any sport · Texas schools · 2K+ followers" value="${v('need')}"></label>
    <div class="grid3"><label class="field"><span>Pay</span><input class="in" name="pay" maxlength="40" placeholder="$250 per athlete" value="${v('pay')}"></label><label class="field"><span>Spots</span><input class="in" name="spots" type="number" min="1" max="500" value="${c ? c.spots : 3}"></label><label class="field"><span>Apply by</span><input class="in" name="due" maxlength="40" placeholder="Dec 1" value="${v('due')}"></label></div>
    <div class="note">${ic('shield')}<span>Campaigns can’t be tied to stats, wins, or choosing or staying at a school. Banned categories can’t post campaigns.</span></div>
    <p class="err" hidden></p></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendcamp">${c ? 'Save changes' : 'Post campaign'}</button>`);
}

// ---------------------------------------------------------------- offers and deals
function offerSheet(id, camp) {
  const a = user(id), me = ME(), d = D();
  const amt0 = camp ? (String(camp.pay).match(/\$?\s?([\d,]+)/) || [])[1] : '';
  const s = sheet('Send an NIL offer', `<form class="stack" data-form="offer" data-id="${a.id}" novalidate>
    ${who(a)}
    <div class="grid2"><label class="field"><span>Category</span><select class="in" name="cat">${d.rules.CATS.map(x => `<option ${me.brand && me.brand.cat === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="field"><span>Deliverable</span><select class="in" name="del">${d.rules.DELIVERABLES.map((x, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label></div>
    <div class="note warn" data-appwarn hidden>${ic('alert')}<span>${esc(a.f)} hasn’t said they do in-person appearances${a.appear && a.appear.area ? '' : ''}. Message them first to check.</span></div>
    <label class="field"><span>Details</span><input class="in" name="what" maxlength="200" placeholder="e.g. 1 reel showing our new protein bar, tag @brand" value="${camp ? esc(camp.del.slice(0, 200)) : ''}"></label>
    <div class="grid2"><label class="field"><span>Amount (USD)</span><input class="in" name="amt" type="number" min="1" step="1" inputmode="numeric" placeholder="${(a.rate || [0, 500])[1]}" value="${amt0 ? esc(amt0.replace(/,/g, '')) : ''}"></label>
      <label class="field"><span>Due</span><input class="in" name="due" maxlength="30" placeholder="e.g. Dec 5"></label></div>
    <label class="field"><span>Message <small>(optional)</small></span><textarea class="in" name="note" maxlength="400" rows="3" placeholder="Why you’d like to work with ${esc(a.f)}"></textarea></label>
    <div class="card pad" style="background:var(--s2)"><div class="row between" style="margin-bottom:10px"><span class="eyebrow">Compliance check</span><span class="tiny dim" id="ckstate">Runs as you type</span></div><div class="checks" id="checks"><p class="small dim" style="margin:0">Enter an amount to run the checks.</p></div></div>
    <p class="err" hidden></p></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendoffer" disabled>Send offer</button>`, { wide: true });
  const f = s.querySelector('form'); let t = null, seq = 0;
  const check = async () => {
    if (!s.isConnected) return;
    const b = fd(f); if (!(+b.amt > 0)) { $('#checks', s).innerHTML = '<p class="small dim" style="margin:0">Enter an amount to run the checks.</p>'; s.querySelector('[data-act=sendoffer]').disabled = true; return; }
    const my = ++seq; $('#ckstate', s).textContent = 'Checking…';
    try {
      const r = await api('/api/offers/check', { to: a.id, ...b, amt: +b.amt, del: +b.del });
      if (my !== seq || !s.isConnected) return;
      $('#checks', s).innerHTML = checksHtml(r.checks); $('#ckstate', s).textContent = r.checks.every(c => c.ok) ? 'All checks pass' : 'Fix the items in red';
      s.querySelector('[data-act=sendoffer]').disabled = !r.checks.every(c => c.ok);
    } catch (e) { if (my === seq) $('#ckstate', s).textContent = e.message; }
  };
  const aw = () => { s.querySelector('[data-appwarn]').hidden = !(f.del.value === '2' && !(a.appear && a.appear.on)); };
  f.addEventListener('input', () => { aw(); clearTimeout(t); t = setTimeout(check, 350); }); f.addEventListener('change', aw);
  if (amt0) check();
}
const checksHtml = checks => checks.map(c => `<div class="ck ${c.ok ? 'ok' : 'no'}">${ic(c.ok ? 'okc' : 'noc')}<div><b>${esc(c.t)}</b><span>${esc(c.d)}</span></div></div>`).join('');
const STEP = { Offer: 1, Active: 2, Delivered: 3, Completed: 4 };
const steps = st => `<div class="steps" aria-label="Deal progress: ${esc(st)}">${[1, 2, 3, 4].map(i => `<i class="${st === 'Completed' ? 'done' : i <= (STEP[st] || 0) ? 'on' : ''}"></i>`).join('')}</div>`;
const statusTag = st => `<span class="tag ${st === 'Offer' ? 'yellow' : st === 'Active' ? 'blue' : st === 'Delivered' ? 'blue' : st === 'Completed' ? 'green' : ''}">${esc({ Offer: 'New offer', Active: 'In progress', Delivered: 'Delivered', Completed: 'Complete', Declined: 'Declined' }[st] || st)}</span>`;

function dealCard(o, side) {
  const other = user(side === 'athlete' ? o.brandId : o.to), me = ME();
  const acts = [];
  if (side === 'athlete' && o.status === 'Offer') acts.push(`<button class="btn pri sm" data-act="respond" data-id="${o.id}" data-ok="1">Accept</button><button class="btn sm" data-act="respond" data-id="${o.id}" data-ok="">Decline</button>`);
  if (side === 'athlete' && o.status === 'Active') acts.push(`<button class="btn pri sm" data-act="deliver" data-id="${o.id}">Mark delivered</button><button class="btn sm" data-act="disclose" data-id="${o.id}">Disclose to school</button>`);
  if (side === 'brand' && o.status === 'Delivered') acts.push(`<button class="btn pri sm" data-act="complete" data-id="${o.id}">Confirm complete</button>`);
  if (other) acts.push(`<a class="btn ghost sm" href="#/messages/new/${other.id}">Message</a>`);
  const open = S.ui.open['o' + o.id];
  return `<div class="card deal">
    <div class="row between" style="align-items:flex-start;gap:12px">${who(other, { sub: side === 'athlete' ? (o.cat || '') : [other && other.sp, other && other.sch].filter(Boolean).join(' · ') })}<div style="text-align:right;flex:none"><div class="amt">${money(o.amt)}</div></div></div>
    <div><div class="row" style="gap:8px;margin-bottom:6px">${statusTag(o.status)}<span class="small dim">Due ${esc(o.due)}</span></div><div style="font-weight:500">${esc(o.what)}</div>${o.note && side === 'athlete' && o.status === 'Offer' ? `<p class="small muted" style="margin:6px 0 0;white-space:pre-wrap">“${esc(o.note)}”</p>` : ''}</div>
    ${o.status !== 'Declined' ? steps(o.status) : ''}
    ${side === 'athlete' && o.status === 'Active' ? `<div class="checks">
      <div class="ck info">${ic('info')}<div><b>Disclose it to your school</b><span>Tell your compliance office before you post. “Disclose to school” writes the email for you.</span></div></div>
      ${o.amt >= 600 ? `<div class="ck info">${ic('info')}<div><b>Report it in NIL Go</b><span>Deals of $600 or more must be reported.</span></div></div>` : ''}
      <div class="ck info">${ic('info')}<div><b>Label the post</b><span>Use #ad or Instagram’s “Paid partnership” label.</span></div></div></div>` : ''}
    ${o.status === 'Delivered' && side === 'athlete' ? `<p class="small muted" style="margin:0">Waiting for ${esc(nameOf(other))} to confirm.</p>` : ''}
    ${o.proof ? `<a class="small" href="${esc(o.proof)}" target="_blank" rel="noopener noreferrer">${ic('link', 'vf')} View the post</a>` : ''}
    ${o.checks ? `<button class="btn ghost sm" data-act="toggle" data-k="o${o.id}" style="justify-self:start">${ic('shieldok')}${open ? 'Hide' : 'Show'} compliance checks</button>${open ? `<div class="checks">${checksHtml(o.checks)}</div>` : ''}` : ''}
    ${acts.length ? `<div class="row wrap">${acts.join('')}</div>` : ''}</div>`;
}
function athleteDeals() {
  const me = ME(), d = D(), mine = d.offers.filter(o => o.to === me.id).sort((a, b) => b.at - a.at);
  const tab = S.ui.tab.adeals || (pendingOffers() ? 'offers' : 'active');
  const opps = d.campaigns.filter(c => !c.closed && !c.applied && c.brand !== me.id).sort((a, b) => b.at - a.at);
  const appsMine = d.campaigns.filter(c => c.applied).sort((a, b) => b.at - a.at);
  const sets = { offers: mine.filter(o => o.status === 'Offer'), active: mine.filter(o => ['Active', 'Delivered'].includes(o.status)), done: mine.filter(o => o.status === 'Completed') };
  const T = [['offers', 'Offers', sets.offers.length], ['active', 'In progress', sets.active.length], ['done', 'Completed', sets.done.length], ['opps', 'Campaigns', opps.length], ['apps', 'My applications', appsMine.length]];
  let body;
  if (tab === 'opps') body = opps.length ? `<div class="stack">${opps.map(campCardAthlete).join('')}</div>` : `<div class="card">${empty('brief', 'No open campaigns', 'When brands post open calls, they’ll show up here for you to apply.')}</div>`;
  else if (tab === 'apps') body = appsMine.length ? `<div class="stack">${appsMine.map(campCardAthlete).join('')}</div>` : `<div class="card">${empty('brief', 'No applications yet', 'Apply to campaigns and track them here.', '<button class="btn" data-act="tab" data-k="adeals" data-v="opps">See campaigns</button>')}</div>`;
  else {
    const list = sets[tab];
    const msgs = { offers: ['No new offers', 'When a brand sends you an offer, it shows up here already checked for compliance.'], active: ['Nothing in progress', 'Deals you accept show up here until they’re complete.'], done: ['No completed deals yet', ''] };
    body = list.length ? `<div class="stack">${list.map(o => dealCard(o, 'athlete')).join('')}</div>` : `<div class="card">${empty('dollar', msgs[tab][0], msgs[tab][1], tab === 'offers' ? '<a class="btn" href="#/edit">Update your rate card</a>' : '')}</div>`;
  }
  return { title: 'Deals', html: `<div class="page narrow">
    <div class="ph"><div><h1 class="h1">Your deals</h1></div>${mine.length ? `<button class="btn" data-act="csvdeals">${ic('upload')}Export earnings</button>` : ''}</div>
    <div class="stats4" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px">
      <div class="card stat"><b style="color:var(--yellow)">${money(sets.done.reduce((t, o) => t + o.amt, 0))}</b><span>Earned</span></div>
      <div class="card stat"><b>${money(sets.active.reduce((t, o) => t + o.amt, 0))}</b><span>In progress</span></div>
      <div class="card stat"><b>${sets.done.length}</b><span>Completed</span></div></div>
    ${me.intl ? `<div class="note warn" style="margin-bottom:16px">${ic('alert')}<span><b>International student?</b> Visa rules may limit NIL work in the U.S. Talk to your international student office before accepting any deal.</span></div>` : ''}
    <div class="tabs" role="tablist">${T.map(([k, l, n]) => `<button role="tab" aria-selected="${tab === k}" data-act="tab" data-k="adeals" data-v="${k}">${l}${n ? ` <span class="count">${n}</span>` : ''}</button>`).join('')}</div>${body}
    <p class="tiny dim" style="margin-top:20px">Payments happen directly between you and the brand for now. NIL income is usually taxable, so keep a record of what you’re paid. Next Level is a marketplace, not an agent.</p></div>` };
}
function brandDeals() {
  const me = ME(), mine = D().offers.filter(o => o.brandId === me.id).sort((a, b) => b.at - a.at);
  const tab = S.ui.tab.bdeals || (toReview() ? 'review' : 'active');
  const sets = { sent: mine.filter(o => o.status === 'Offer'), active: mine.filter(o => o.status === 'Active'), review: mine.filter(o => o.status === 'Delivered'), done: mine.filter(o => o.status === 'Completed'), declined: mine.filter(o => o.status === 'Declined') };
  const T = [['sent', 'Sent'], ['active', 'In progress'], ['review', 'To confirm'], ['done', 'Completed'], ['declined', 'Declined']];
  const list = sets[tab];
  const msgs = { sent: 'Offers waiting on the athlete show up here.', active: 'Accepted deals show up here while the athlete works on them.', review: 'When an athlete marks a deal delivered, confirm it here.', done: '', declined: '' };
  return { title: 'Deals', html: `<div class="page narrow">
    <div class="ph"><div><h1 class="h1">Deals</h1></div><div class="row wrap">${mine.length ? `<button class="btn" data-act="csvdeals">${ic('upload')}Export CSV</button>` : ''}<a class="btn pri" href="#/athletes">${ic('search')}Find athletes</a></div></div>
    <div class="tabs" role="tablist">${T.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="tab" data-k="bdeals" data-v="${k}">${l}${sets[k].length ? ` <span class="count">${sets[k].length}</span>` : ''}</button>`).join('')}</div>
    ${list.length ? `<div class="stack">${list.map(o => dealCard(o, 'brand')).join('')}</div>` : `<div class="card">${empty('dollar', 'Nothing here', msgs[tab], tab === 'sent' && !mine.length ? '<a class="btn" href="#/athletes">Find an athlete</a>' : '')}</div>`}
    <p class="tiny dim" style="margin-top:20px">Pay athletes directly for now. Build in time: athletes report $600+ deals to NIL Go, and some schools review deals before posting.</p></div>` };
}
function brandHome() {
  const me = ME(), d = D(), mine = d.offers.filter(o => o.brandId === me.id);
  const camps = d.campaigns.filter(c => c.brand === me.id);
  const apps = camps.flatMap(c => (c.applicants || []).filter(a => a.status === 'Applied').map(a => ({ ...a, camp: c }))).sort((a, b) => b.appliedAt - a.appliedAt);
  const spend = mine.filter(o => ['Active', 'Delivered', 'Completed'].includes(o.status)).reduce((s, o) => s + o.amt, 0);
  const todo = [['Add your logo', !!me.av], ['Add your website', !!(me.brand && me.brand.site)], ['Write a short description', !!me.bio], ['Post your first campaign', camps.length > 0], ['Send your first offer', mine.length > 0]];
  const recent = mine.slice().sort((a, b) => b.at - a.at).slice(0, 5);
  return { title: 'Dashboard', html: `<div class="page">
    <div class="ph"><div><h1 class="h1">Dashboard</h1></div><div class="row wrap"><button class="btn" data-act="newcamp">${ic('plus')}New campaign</button><a class="btn pri" href="#/athletes">${ic('search')}Find athletes</a></div></div>
    <div class="stats4" style="margin-bottom:20px">
      <a class="card stat" href="#/deals" data-act="tab" data-k="bdeals" data-v="review" style="color:inherit;text-decoration:none"><b style="color:${toReview() ? 'var(--yellow)' : 'var(--t)'}">${toReview()}</b><span>To confirm</span></a>
      <a class="card stat" href="#/deals" data-act="tab" data-k="bdeals" data-v="active" style="color:inherit;text-decoration:none"><b>${mine.filter(o => o.status === 'Active').length}</b><span>In progress</span></a>
      <a class="card stat" href="#/deals" data-act="tab" data-k="bdeals" data-v="sent" style="color:inherit;text-decoration:none"><b>${mine.filter(o => o.status === 'Offer').length}</b><span>Offers waiting</span></a>
      <div class="card stat"><b>${money(spend)}</b><span>Committed</span></div></div>
    <div class="cols"><div class="stack">
      <div class="card"><div class="card-h"><h2 class="h2">Applicants to review</h2><a class="small" href="#/campaigns">Campaigns</a></div>
        ${apps.length ? `<div class="list">${apps.slice(0, 6).map(a => `<div class="row" style="padding:12px 16px">${who(a, { sub: 'Applied to ' + a.camp.title })}<a class="btn sm" href="#/campaigns/${a.camp.id}">Review</a></div>`).join('')}</div>` : `<div class="card-b small dim">No new applicants. ${camps.filter(c => !c.closed).length ? 'They’ll show up here as athletes apply.' : 'Post a campaign to get applicants.'}</div>`}</div>
      <div class="card"><div class="card-h"><h2 class="h2">Recent offers</h2><a class="small" href="#/deals">All deals</a></div>
        ${recent.length ? `<div class="list">${recent.map(o => { const a = user(o.to); return `<div class="row" style="padding:12px 16px">${who(a, { sub: o.what })}<div style="text-align:right"><div class="d" style="font-size:22px">${money(o.amt)}</div>${statusTag(o.status)}</div></div>`; }).join('')}</div>` : `<div class="card-b small dim">No offers yet. Find an athlete and send your first one.</div>`}</div>
    </div><aside>
      ${todo.some(t => !t[1]) ? `<div class="card pad stack"><h2 class="h2">Get set up</h2><div>${todo.map(([t, ok]) => `<${ok ? 'div' : 'a href="' + (t.includes('campaign') ? '#/campaigns' : t.includes('offer') ? '#/athletes' : '#/edit') + '"'} class="todo${ok ? ' done' : ''}">${ic(ok ? 'okc' : 'circle')}${esc(t)}</${ok ? 'div' : 'a'}>`).join('')}</div></div>` : ''}
      <a class="card stat" href="#/athletes" data-act="savedtab" data-v="1" style="color:inherit;text-decoration:none"><b>${(d.saved || []).length}</b><span>Saved athletes</span></a>
      <div class="card pad stack"><h2 class="h2">How deals work</h2><div class="checks">
        <div class="ck ok">${ic('okc')}<div><b>Send an offer</b><span>From any athlete’s profile. It’s checked for compliance before it sends.</span></div></div>
        <div class="ck ok">${ic('okc')}<div><b>Athlete accepts</b><span>They disclose it to their school and report $600+ deals to NIL Go.</span></div></div>
        <div class="ck ok">${ic('okc')}<div><b>They deliver</b><span>The athlete posts and marks it delivered with a link.</span></div></div>
        <div class="ck ok">${ic('okc')}<div><b>You confirm</b><span>Pay the athlete directly and confirm the deal is complete.</span></div></div></div></div>
    </aside></div></div>` };
}

// ---------------------------------------------------------------- messages
function messages(o) {
  const d = D(), me = ME();
  const inbox = d.threads.filter(t => !t.request), reqs = d.threads.filter(t => t.request);
  const tab = S.ui.msgTab === 'req' && reqs.length ? 'req' : 'inbox';
  const list = tab === 'req' ? reqs : inbox;
  let cur = o.tid ? d.threads.find(t => t.id === +o.tid) : null, newTo = null;
  if (o.newTo) { const t = d.threads.find(x => x.with && x.with.id === +o.newTo); if (t) cur = t; else newTo = user(o.newTo); }
  const has = !!(cur || newTo);
  if (cur && cur.unread) { cur.unread = 0; api('/api/dm/read', { id: cur.id }).catch(() => {}); }
  const last = t => t.log[t.log.length - 1];
  const preview = t => { const m = last(t); if (!m) return ''; const p = m.by === 'me' ? 'You: ' : ''; return p + (m.offer ? `NIL offer · ${money(m.offer.amt)}` : m.t || (m.post ? 'Shared a post' : '')); };
  const lst = `<div class="lst"><div style="padding:14px 14px 0"><h1 class="h2">Messages</h1></div>
    <div class="tabs" role="tablist" style="padding:0 8px;margin:8px 0 0"><button role="tab" aria-selected="${tab === 'inbox'}" data-act="msgtab" data-v="inbox">Inbox</button><button role="tab" aria-selected="${tab === 'req'}" data-act="msgtab" data-v="req" ${reqs.length ? '' : 'disabled'}>Requests${reqs.length ? ` <span class="count">${reqs.length}</span>` : ''}</button></div>
    <div class="scroll">${list.length ? list.map(t => { const u = t.with; return `<a class="th${cur && cur.id === t.id ? ' on' : ''}${t.unread ? ' unread' : ''}" href="#/messages/${t.id}">${avatar(u, 'sm')}<div class="b"><div class="l1"><span class="n">${esc(nameOf(u))}${u && u.verified ? VF : ''}</span><span class="tm">${last(t) ? ago(last(t).at) : ''}</span></div><div class="l2">${esc(preview(t))}</div></div>${t.unread ? '<span class="dot" aria-label="Unread"></span>' : ''}</a>`; }).join('')
      : empty('inbox', tab === 'req' ? 'No requests' : 'No messages yet', tab === 'req' ? '' : 'Start a conversation from any profile.')}</div></div>`;
  let conv;
  if (cur && !cur.with) {
    conv = `<div class="conv"><div class="ch"><a class="btn ghost sm icon" href="#/messages" aria-label="Back to messages" data-mobile>${ic('left')}</a>${who(null)}</div>
      <div class="log" id="log">${cur.log.filter(m => m.t).map(m => `<div class="bub${m.by === 'me' ? ' me' : ''}">${linkify(m.t)}</div>`).join('')}</div>
      <div class="reqbar"><div class="small muted">This account was deleted. You can’t reply.</div></div></div>`;
  } else if (cur || newTo) {
    const u = cur ? cur.with : newTo;
    const log = cur ? cur.log : [];
    let lastDay = '', html = '';
    for (const m of log) {
      const day = dayLabel(m.at); if (day !== lastDay) { html += `<div class="stamp">${day}</div>`; lastDay = day; }
      if (m.offer) {
        const of = m.offer, mineSide = m.by === 'me';
        html += `<div class="ocard${mineSide ? ' me' : ''}"><div class="row between"><span class="eyebrow">NIL offer</span>${statusTag(of.status)}</div><div class="amt">${money(of.amt)}</div><div style="font-weight:500">${esc(of.what)}</div><div class="small dim">Due ${esc(of.due)} · ${esc(of.cat)}</div>
          ${!mineSide && of.status === 'Offer' && me.role === 'athlete' ? `<div class="row"><button class="btn pri sm" data-act="respond" data-id="${of.id}" data-ok="1">Accept</button><button class="btn sm" data-act="respond" data-id="${of.id}" data-ok="">Decline</button></div>` : ''}
          <a class="small" href="#/deals">Open in Deals</a></div>`;
      }
      if (m.t) html += `<div class="bub${m.by === 'me' ? ' me' : ''}" title="${esc(clock(m.at))}">${linkify(m.t)}</div>`;
      if (m.post) { const p = d.posts.find(x => x.id === m.post); html += `<a class="bub${m.by === 'me' ? ' me' : ''}" href="#/p/${m.post}">${p ? 'Shared a post: ' + esc((p.cap || p.type).slice(0, 60)) : 'Shared a post (no longer available)'}</a>`; }
    }
    if (!log.length) html = `<div class="empty" style="margin:auto">${avatar(u, 'lg')}<b>${esc(nameOf(u))}</b><p>${esc(subline(u))}${u.sch ? ' · ' + esc(u.sch) : ''}</p><p class="small dim">Say hi. If ${esc(u.f)} doesn’t follow you, your message goes to their requests.</p></div>`;
    const bottom = cur && cur.request ? `<div class="reqbar"><div class="small muted"><b style="color:var(--t)">${esc(nameOf(u))}</b> wants to message you. They won’t know you’ve seen this until you reply.</div><div class="row"><button class="btn pri sm" data-act="req" data-id="${cur.id}" data-ok="1">Accept</button><button class="btn sm" data-act="req" data-id="${cur.id}" data-ok="">Delete</button><button class="btn ghost sm" data-act="report" data-kind="user" data-id="${u.id}">Report</button></div></div>`
      : `${me.role === 'coach' && u.role === 'athlete' && schoolKey(u.sch) !== schoolKey(me.sch) && !u.portal && u.div !== 'JUCO' ? `<div class="note warn" style="margin:0 16px 8px">${ic('alert')}<span><b>Check contact rules first.</b> NCAA rules generally don’t allow coaches to contact athletes enrolled at another four-year school unless they’re in the transfer portal. ${esc(u.f)} hasn’t marked portal status. Check with your compliance office.</span></div>` : ''}${cur && cur.pending ? `<div class="note" style="margin:0 16px 8px">${ic('info')}<span>Request sent. ${esc(u.f)} will see your messages once they accept.</span></div>` : ''}<form class="cmp" data-form="dm" data-to="${u.id}"><textarea class="in" name="t" maxlength="1000" placeholder="Message ${esc(u.f)}" aria-label="Message" rows="1"></textarea><button class="btn pri icon" aria-label="Send">${ic('send')}</button></form>`;
    conv = `<div class="conv"><div class="ch"><a class="btn ghost sm icon" href="#/messages" aria-label="Back to messages" data-mobile>${ic('left')}</a>${who(u)}${me.role === 'brand' && u.role === 'athlete' ? `<button class="btn sm" data-act="offer" data-id="${u.id}">${ic('dollar')}Send offer</button>` : ''}<button class="btn ghost sm icon" data-act="profmenu" data-id="${u.id}" aria-label="More">${ic('more')}</button></div>
      <div class="log" id="log">${html}</div>${bottom}</div>`;
  } else conv = `<div class="conv">${empty('msg', 'Your messages', 'Pick a conversation, or message someone from their profile.')}</div>`;
  return { title: 'Messages', html: `<div class="card msg${has ? ' has' : ''}">${lst}${conv}</div>`, after() {
    const l = $('#log'); if (l) l.scrollTop = l.scrollHeight;
    const ta = $('.cmp textarea'); if (ta) { ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ta.form.requestSubmit(); } });
      ta.addEventListener('input', () => { ta.style.height = '40px'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; }); if (matchMedia('(min-width: 901px)').matches) ta.focus(); }
    $$('[data-mobile]').forEach(x => { if (matchMedia('(min-width: 901px)').matches) x.hidden = true; });
  } };
}

// ---------------------------------------------------------------- notifications
function notifications() {
  const n = D().notes;
  const dest = x => ({ deals: '#/deals', messages: '#/messages', campaigns: '#/campaigns', me: '#/u/' + ME().id, locker: '#/u/' + ME().id, nil: '#/deals' }[x.go] || '#/home');
  const html = `<div class="page narrow"><div class="ph"><h1 class="h1">Notifications</h1></div>
    <div class="card">${n.length ? `<div class="list">${n.map(x => { const u = user(x.by); return `<a class="nrow${x.hot ? ' hot' : ''}" href="${dest(x)}">${x.k === 'view' ? `<span class="av sm" style="color:var(--blue)">${ic('users')}</span>` : avatar(u, 'sm')}<div class="b"><b>${esc(x.who)}</b> ${esc(x.t)}</div><span class="tm">${ago(x.at)}</span></a>`; }).join('')}</div>` : empty('bell', 'You’re all caught up', 'Offers, follows, props and comments show up here.')}</div></div>`;
  if (n.some(x => x.hot)) { n.forEach(x => { x.hot = false; }); api('/api/notes/read', {}).catch(() => {}); }
  return { title: 'Notifications', html };
}

// ---------------------------------------------------------------- settings and profile editing
function settings() {
  const me = ME();
  return { title: 'Settings', html: `<div class="page narrow stack lg"><h1 class="h1">Settings</h1>
    <div class="card"><div class="card-h"><h2 class="h2">Account</h2></div><div class="card-b stack">
      <div class="row between"><div><div class="small dim">Email</div><div>${esc(me.email)}</div></div></div>
      <div class="row between"><div><div class="small dim">Account type</div><div>${esc(ROLE_NAME[me.role])}${me.verified ? ' · Verified' : ''}</div></div><a class="btn sm" href="#/edit">Edit profile</a></div></div></div>
    <div class="card"><div class="card-h"><h2 class="h2">Password</h2></div><form class="card-b stack" data-form="pw" novalidate>
      <label class="field"><span>Current password</span><input class="in" type="password" name="old" autocomplete="current-password" required></label>
      <label class="field"><span>New password</span><input class="in" type="password" name="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" required></label>
      <p class="err" hidden></p><div><button class="btn pri">Change password</button></div><p class="tiny dim" style="margin:0">Changing your password signs you out everywhere else.</p></form></div>
    ${(me.blocked || []).length ? `<div class="card"><div class="card-h"><h2 class="h2">Blocked</h2></div><div class="list">${me.blocked.map(id => `<div class="row" style="padding:12px 16px"><span class="grow small">Account #${id}</span><button class="btn sm" data-act="unblock" data-id="${id}">Unblock</button></div>`).join('')}</div></div>` : ''}
    <div class="card"><div class="card-h"><h2 class="h2">Help and legal</h2></div><div class="card-b stack small">
      <a href="/terms.html">Terms of Service</a><a href="/privacy.html">Privacy Policy</a><a href="mailto:${SUPPORT}">Contact support</a>
      <span class="dim">Next Level is a marketplace, not an agent. We don’t give legal, tax or financial advice.</span></div></div>
    <div class="card"><div class="card-b row between wrap"><button class="btn" data-act="logout">${ic('out')}Log out</button><button class="btn danger" data-act="delacct">${ic('trash')}Delete account</button></div></div></div>` };
}
function pairEditor(name, list, max, hints) {
  const rows = (list || []).slice(); while (rows.length < Math.min(max, Math.max(3, rows.length + 1))) rows.push({ k: '', v: '' });
  return `<div class="pairs" data-pairs="${name}" data-max="${max}"><datalist id="dl-${name}">${(hints || []).map(h => `<option value="${esc(h)}">`).join('')}</datalist>
    ${rows.slice(0, max).map(r => `<div class="pr"><input class="in" list="dl-${name}" maxlength="24" placeholder="Label" value="${esc(r.k)}" aria-label="Label"><input class="in" maxlength="16" placeholder="Value" value="${esc(r.v)}" aria-label="Value"><button type="button" class="btn icon" data-act="pairrm" aria-label="Remove">${ic('x')}</button></div>`).join('')}
    <button type="button" class="btn ghost sm" data-act="pairadd" style="justify-self:start">${ic('plus')}Add row</button></div>`;
}
function editProfile() {
  const me = ME(), d = D(), r = me.role, soc = me.soc || {};
  const opt = (arr, v, blank) => (blank ? `<option value="">${blank}</option>` : '') + arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const sec = (t, body, sub) => `<div class="card"><div class="card-h"><div><h2 class="h2">${t}</h2>${sub ? `<div class="small dim" style="margin-top:4px">${sub}</div>` : ''}</div></div><div class="card-b stack">${body}</div></div>`;
  const photo = sec(r === 'brand' ? 'Logo' : 'Photo', `<div class="row wrap" style="gap:16px">${avatar(me, 'lg')}<div class="row wrap"><label class="btn" for="avfile">${ic('camera')}${me.av ? 'Change' : 'Upload'}</label><input type="file" id="avfile" accept="image/jpeg,image/png,image/webp" hidden>${me.av ? '<button type="button" class="btn ghost" data-act="avrm">Remove</button>' : ''}</div></div>`);
  let body = '';
  if (r === 'athlete') {
    body = sec('Basics', `<div class="grid2"><label class="field"><span>First name</span><input class="in" name="f" maxlength="30" value="${esc(me.f)}"></label><label class="field"><span>Last name</span><input class="in" name="l" maxlength="30" value="${esc(me.l)}"></label></div>
      <div class="grid2"><label class="field"><span>School</span><input class="in" name="sch" maxlength="60" value="${esc(me.sch)}"></label><label class="field"><span>School state</span><select class="in" name="st">${opt(STATES, me.st, 'Choose…')}</select></label></div>
      <div class="grid3"><label class="field"><span>Sport</span><select class="in" name="sp">${opt(SPORTS, me.sp, 'Choose…')}</select></label><label class="field"><span>Position</span><input class="in" name="pos" maxlength="12" value="${esc(me.pos)}" placeholder="e.g. OH, WR"></label><label class="field"><span>Jersey #</span><input class="in" name="num" maxlength="3" inputmode="numeric" value="${esc(me.num)}"></label></div>
      <div class="grid3"><label class="field"><span>Class</span><select class="in" name="yr">${opt(CLASSES, me.yr, 'Choose…')}</select></label><label class="field"><span>Grad year</span><input class="in" name="grad" maxlength="4" inputmode="numeric" placeholder="2027" value="${esc(me.grad)}"></label><label class="field"><span>Division</span><select class="in" name="div">${opt(DIVS, me.div, 'Choose…')}</select></label></div>
      <div class="grid3"><label class="field"><span>Height</span><input class="in" name="ht" maxlength="8" placeholder="6'1&quot;" value="${esc(me.ht)}"></label><label class="field"><span>Weight</span><input class="in" name="wt" maxlength="8" placeholder="185 lb" value="${esc(me.wt)}"></label><label class="field"><span>Hometown</span><input class="in" name="home" maxlength="60" placeholder="Plano, TX" value="${esc(me.home)}"></label></div>
      <label class="field"><span>Bio</span><textarea class="in" name="bio" maxlength="300" rows="3" placeholder="Who you are as a player and person">${esc(me.bio)}</textarea></label>
      <label class="check"><input type="checkbox" name="portal" ${me.portal ? 'checked' : ''}> I’m in the NCAA transfer portal. Only turn this on after your school has entered you, so coaches from other schools can contact you.</label>`)
      + sec('Stats', pairEditor('stats', me.stats, 8, STAT_HINTS[me.sp] || []), 'Up to 8. The first 4 show on your card. Keep them current and accurate.')
      + sec('Measurables', pairEditor('meas', me.meas, 6, MEAS_HINTS), 'Optional. e.g. 40-yard dash 4.52s')
      + sec('Academics', `<div class="grid2"><label class="field"><span>GPA</span><input class="in" name="gpa" maxlength="4" inputmode="decimal" placeholder="3.6" value="${esc(me.gpa)}"></label><label class="field"><span>Major</span><input class="in" name="major" maxlength="60" value="${esc(me.major)}"></label></div>`)
      + sec('Film', `<label class="field"><span>Highlight film link</span><input class="in" name="hl" type="url" maxlength="200" placeholder="https://www.hudl.com/… or https://youtu.be/…" value="${esc(me.hl)}"><small>Put your best clips first. Coaches often stop after 30 seconds.</small></label>`)
      + sec('Socials', `${[['ig', 'Instagram'], ['tt', 'TikTok'], ['x', 'X']].map(([k, l]) => `<div class="grid2"><label class="field"><span>${l} handle</span><input class="in" name="soc_${k}" maxlength="40" placeholder="@" value="${esc(soc[k])}"></label><label class="field"><span>${l} followers</span><input class="in" name="soc_${k}N" type="number" min="0" inputmode="numeric" value="${soc[k + 'N'] || ''}"></label></div>`).join('')}`, 'Brands see your follower counts when they search.')
      + sec('Awards', `<label class="field"><span>One per line</span><textarea class="in" name="awards" rows="3" placeholder="All-Conference First Team (2025)">${esc((me.awards || []).join('\n'))}</textarea></label>`)
      + sec('NIL', `<div class="field"><span>Rate card (USD)</span><div class="grid3">${['Story', 'Post or reel', 'Appearance'].map((l, i) => `<label class="field"><span class="tiny dim">${l}</span><input class="in" name="rate${i}" type="number" min="0" inputmode="numeric" value="${(me.rate || [])[i] || 0}"></label>`).join('')}</div><small>Offers far above your rates get flagged as over fair market value.</small></div>
        <label class="check"><input type="checkbox" name="appear_on" ${me.appear && me.appear.on ? 'checked' : ''}> I’m available for in-person appearances (signings, store events, camps).</label>
        <label class="field"><span>Where you can do appearances</span><input class="in" name="appear_area" maxlength="60" placeholder="e.g. Dallas–Fort Worth" value="${esc(me.appear ? me.appear.area : '')}"></label>
        <div class="field"><span>Open to brands in</span><div class="row wrap" data-cats>${d.rules.CATS.map(c => `<button type="button" class="chip" aria-pressed="${(me.open || []).includes(c)}" data-act="cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div><small>${esc(d.rules.BANNED.join(', '))} are always blocked.</small></div>`);
  } else if (r === 'coach') {
    body = sec('Basics', `<div class="grid2"><label class="field"><span>First name</span><input class="in" name="f" maxlength="30" value="${esc(me.f)}"></label><label class="field"><span>Last name</span><input class="in" name="l" maxlength="30" value="${esc(me.l)}"></label></div>
      <div class="grid2"><label class="field"><span>Title</span><input class="in" name="title" maxlength="40" value="${esc(me.title)}" placeholder="Assistant coach"></label><label class="field"><span>Sport</span><select class="in" name="sp">${opt(SPORTS, me.sp, 'Choose…')}</select></label></div>
      <div class="grid3"><label class="field" style="grid-column:span 1"><span>School</span><input class="in" name="sch" maxlength="60" value="${esc(me.sch)}"></label><label class="field"><span>State</span><select class="in" name="st">${opt(STATES, me.st, 'Choose…')}</select></label><label class="field"><span>Division</span><select class="in" name="div">${opt(DIVS, me.div, 'Choose…')}</select></label></div>
      <label class="field"><span>About</span><textarea class="in" name="bio" maxlength="300" rows="3" placeholder="What your program looks for">${esc(me.bio)}</textarea></label>`);
  } else if (r === 'brand') {
    const b = me.brand || {};
    body = sec('Brand', `<label class="field"><span>Brand name</span><input class="in" name="b_name" maxlength="60" value="${esc(b.name)}"></label>
      <div class="grid2"><label class="field"><span>Category</span><select class="in" name="b_cat">${opt(d.rules.CATS, b.cat)}</select></label><label class="field"><span>Website</span><input class="in" name="b_site" type="url" maxlength="100" placeholder="https://" value="${esc(b.site)}"></label></div>
      <div class="grid2"><label class="field"><span>City</span><input class="in" name="home" maxlength="60" value="${esc(me.home)}"></label><label class="field"><span>State</span><select class="in" name="st">${opt(STATES, me.st, 'Choose…')}</select></label></div>
      <label class="field"><span>About</span><textarea class="in" name="bio" maxlength="300" rows="3" placeholder="What you sell and what kind of athletes you like to work with">${esc(me.bio)}</textarea></label>`)
      + sec('Contact person', `<div class="grid2"><label class="field"><span>First name</span><input class="in" name="f" maxlength="30" value="${esc(me.f)}"></label><label class="field"><span>Last name</span><input class="in" name="l" maxlength="30" value="${esc(me.l)}"></label></div>`);
  } else {
    body = sec('Basics', `<div class="grid2"><label class="field"><span>First name</span><input class="in" name="f" maxlength="30" value="${esc(me.f)}"></label><label class="field"><span>Last name</span><input class="in" name="l" maxlength="30" value="${esc(me.l)}"></label></div>
      <label class="field"><span>Bio</span><textarea class="in" name="bio" maxlength="300" rows="3">${esc(me.bio)}</textarea></label>`);
  }
  return { title: 'Edit profile', html: `<div class="page narrow"><div class="ph"><div><a class="btn ghost sm" href="#/u/${me.id}" style="margin-bottom:10px">${ic('left')}Profile</a><h1 class="h1">Edit profile</h1></div></div>
    <div class="stack lg">${photo}<form class="stack lg" data-form="profile" novalidate>${body}<p class="err" hidden></p>
    <div class="row savebar"><a class="btn" href="#/u/${me.id}">Cancel</a><button class="btn pri lg">Save profile</button></div></form></div></div>`,
    after() {
      const inp = $('#avfile'); if (inp) inp.onchange = e => { const f = e.target.files[0]; if (!f) return; run(null, async () => { const img = await readImage(f, 600); take(await api('/api/avatar', { img })); toast('Photo updated'); render(); }); };
    } };
}
function collectPairs(form, name) {
  return $$(`[data-pairs=${name}] .pr`, form).map(r => { const [k, v] = $$('input', r); return { k: k.value.trim(), v: v.value.trim() }; }).filter(x => x.k && x.v);
}

// ---------------------------------------------------------------- admin
function admin() {
  const a = D().admin, tab = S.ui.tab.admin || 'verify', c = a.counts;
  const rep = a.reports;
  return { title: 'Admin', html: `<div class="page"><div class="ph"><div><h1 class="h1">Admin</h1></div></div>
    <div class="stats4" style="margin-bottom:12px"><div class="card stat"><b>${c.users}</b><span>Accounts</span></div><div class="card stat"><b>${c.athletes}</b><span>Athletes</span></div><div class="card stat"><b>${c.brands}</b><span>Brands</span></div><div class="card stat"><b>${c.coaches}</b><span>Coaches</span></div></div>
    <div class="stats4" style="margin-bottom:20px"><div class="card stat"><b>${c.active}</b><span>Deals in progress</span></div><div class="card stat"><b>${c.completed}</b><span>Deals completed</span></div><div class="card stat"><b style="color:var(--yellow)">${money(c.value)}</b><span>Deal value</span></div><div class="card stat"><b>${c.campaigns}</b><span>Open campaigns</span></div></div>
    <div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === 'verify'}" data-act="tab" data-k="admin" data-v="verify">Verify <span class="count">${a.pending.length}</span></button><button role="tab" aria-selected="${tab === 'reports'}" data-act="tab" data-k="admin" data-v="reports">Reports <span class="count">${rep.length}</span></button><button role="tab" aria-selected="${tab === 'accounts'}" data-act="tab" data-k="admin" data-v="accounts">Accounts <span class="count">${a.accounts.length}</span></button></div>
    ${tab === 'accounts' ? `<div class="row" style="margin-bottom:12px;justify-content:flex-end"><button class="btn sm" data-act="csvaccounts">${ic('upload')}Export CSV</button></div><input class="in" id="acctq" placeholder="Search name, email, school" aria-label="Search accounts" value="${esc(S.ui.acctq || '')}" style="margin-bottom:12px"><div id="acctlist">${accountRows()}</div>` :
      tab === 'verify' ? (a.pending.length ? `<div class="card"><div class="list">${a.pending.map(u => `<div class="row wrap" style="padding:14px 16px;gap:12px">${who(u, { sub: [ROLE_NAME[u.role], u.sp, u.sch, u.email].filter(Boolean).join(' · ') })}<span class="tiny dim">${ago(u.created)}</span><button class="btn pri sm" data-act="verify" data-id="${u.id}" data-on="1">${ic('check')}Verify</button></div>`).join('')}</div></div>
      <p class="small dim">Check athletes against the school’s official roster page and coaches against the staff directory before verifying.</p>` : `<div class="card">${empty('shieldok', 'No one waiting', 'New athletes and coaches show up here to verify.')}</div>`)
      : (rep.length ? `<div class="stack">${rep.map(x => `<div class="card deal"><div class="row between"><span class="tag red">${esc(x.kind)}</span><span class="tiny dim">${ago(x.at)}</span></div>
        ${x.target.img ? `<img src="${esc(x.target.img)}" alt="" style="max-height:200px;border-radius:8px;object-fit:contain;background:#000">` : ''}<div style="white-space:pre-wrap">${esc(x.target.text)}</div>
        <div class="small muted">Reason: ${esc(x.why || 'Not given')} · Reported by ${esc(nameOf(x.reporter))}${x.target.by ? ` · <a href="#/u/${x.target.by}">View account</a>` : ''}</div>
        <div class="row"><button class="btn danger sm" data-act="resolve" data-kind="${esc(x.kind)}" data-id="${x.id}" data-rm="1">Remove ${x.kind === 'user' ? 'account' : x.kind}</button><button class="btn sm" data-act="resolve" data-kind="${esc(x.kind)}" data-id="${x.id}" data-rm="">Keep</button></div></div>`).join('')}</div>`
        : `<div class="card">${empty('flag', 'No reports', 'Reported posts, comments and accounts show up here.')}</div>`)}</div>` };
}

function accountRows() {
  const q = (S.ui.acctq || '').toLowerCase(), all = D().admin.accounts;
  const list = all.filter(u => !q || [u.f + ' ' + u.l, u.email, u.sch, u.brand && u.brand.name].join(' ').toLowerCase().includes(q)).slice(0, 200);
  return list.length ? `<div class="card"><div class="list">${list.map(u => `<div class="row wrap" style="padding:12px 16px;gap:10px">${who(u, { sub: [ROLE_NAME[u.role], u.email, u.sch].filter(Boolean).join(' · ') })}
    ${u.tempPw ? '<span class="tag yellow">Temp password</span>' : ''}
    ${u.role === 'athlete' || u.role === 'coach' ? `<button class="btn sm" data-act="verify" data-id="${u.id}" data-on="${u.verified ? '' : '1'}">${u.verified ? 'Unverify' : 'Verify'}</button>` : ''}
    <button class="btn sm icon" data-act="acctmenu" data-id="${u.id}" aria-label="More for ${esc(nameOf(u))}">${ic('more')}</button></div>`).join('')}</div></div>`
    : `<div class="card">${empty('users', 'No accounts match', '')}</div>`;
}

// ---------------------------------------------------------------- one listener for every button
const ACT = {
  close: () => closeSheet(),
  storycard: el => run(el, async () => {
    const me = ME(), blob = await storyCard(me); if (!blob) throw new Error('Couldn’t make the image. Try again.');
    const url = URL.createObjectURL(blob), file = (me.f + '-' + me.l).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-next-level.png';
    sheet('Your card', `<div class="stack"><img src="${url}" alt="Your athlete card image" style="width:100%;max-width:300px;justify-self:center;border-radius:12px;border:1px solid var(--line2)">
      <p class="small muted" style="margin:0;text-align:center">Post it to your story with your profile link so coaches and brands can find you.</p></div>`,
      `<button class="btn" data-act="copytext" data-v="${esc(location.origin + '/a/' + me.id)}">Copy profile link</button><a class="btn pri" href="${url}" download="${esc(file)}">Download image</a>`);
  }),
  csvdeals: () => {
    const me = ME(), mine = D().offers.filter(o => me.role === 'brand' ? o.brandId === me.id : o.to === me.id).sort((a, b) => a.at - b.at);
    csv(me.role === 'brand' ? 'next-level-deals.csv' : 'next-level-earnings.csv', [[me.role === 'brand' ? 'Athlete' : 'Brand', 'Category', 'Work', 'Amount (USD)', 'Status', 'Offered', 'Accepted', 'Delivered', 'Completed', 'Post link'],
      ...mine.map(o => [me.role === 'brand' ? nameOf(user(o.to)) : o.brand, o.cat, o.what, o.amt, o.status, day(o.at), o.status !== 'Declined' ? day(o.answered) : '', day(o.delivered), day(o.completed), o.proof])]);
  },
  csvaccounts: () => csv('next-level-accounts.csv', [['ID', 'Name', 'Email', 'Type', 'School', 'Sport', 'Verified', 'Joined'],
    ...D().admin.accounts.map(u => [u.id, nameOf(u), u.email, ROLE_NAME[u.role], u.sch, u.sp, u.verified ? 'Yes' : 'No', day(u.created)])]),
  sendedit: el => run(el, async () => { const f = $('[data-form=editpost]'); try { take(await api('/api/posts/edit', { id: +f.dataset.id, cap: f.cap.value, tag: f.tag.value })); } catch (e) { return formErr(f, e.message); } closeSheet(); toast('Post updated'); render(); }),
  zoom: el => { const s = sheet('Photo', `<img src="${esc(el.dataset.src)}" alt="" style="width:100%;max-height:75dvh;object-fit:contain;border-radius:8px;background:#000">`, '', { wide: true }); },
  reload: () => location.reload(),
  copytext: el => { (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.v) : Promise.reject()).then(() => toast('Copied'), () => toast('Select the text and copy it', true)); },
  back: () => { if (history.length > 1) history.back(); else go('home'); },
  signin: () => authSheet('in'),
  join: el => authSheet('up', el.dataset.role),
  acct: el => {
    const me = ME();
    menu(el, [{ html: `<div class="hd">${who(me, { sub: me.email })}</div>` }, '-', { href: '#/u/' + me.id, icon: 'user', label: 'Your profile' }, { href: '#/edit', icon: 'edit', label: 'Edit profile' }, { href: '#/settings', icon: 'gear', label: 'Settings' },
      ...(me.admin ? [{ href: '#/admin', icon: 'shield', label: 'Admin' }] : []), '-', { href: 'mailto:' + SUPPORT, icon: 'info', label: 'Help' }, { icon: 'out', label: 'Log out', fn: logout }]);
  },
  feed: el => { S.ui.feed = el.dataset.v; render(); },
  fsp: el => { S.ui.fsp = el.dataset.v; render(); },
  schsp: el => { S.ui.schsp = el.dataset.v; render(); },
  tab: el => { S.ui.tab[el.dataset.k] = el.dataset.v; if (el.tagName === 'A' && location.hash !== el.getAttribute('href')) return; render(); },
  cmpadd: el => { const id = +el.dataset.id, i = S.cmp.indexOf(id); if (i >= 0) S.cmp.splice(i, 1); else { if (S.cmp.length >= 3) return toast('You can compare up to 3 athletes.', true); S.cmp.push(id); } render(); },
  cmpclear: () => { S.cmp = []; if (route()[0] === 'compare') go('athletes'); else render(); },
  msgtab: el => { S.ui.msgTab = el.dataset.v; render(); },
  savedtab: el => { S.ui.f.saved = !!el.dataset.v; render(); },
  save: el => run(el, async () => { const id = +el.dataset.id, r = await api('/api/save', { athlete: id }); const l = D().saved; if (r.saved) l.push(id); else l.splice(l.indexOf(id), 1); toast(r.saved ? 'Saved to your list' : 'Removed from your list'); render(); }),
  toggle: el => { S.ui.open[el.dataset.k] = !S.ui.open[el.dataset.k]; render(); },
  cmts: el => { const id = el.dataset.id; S.ui.open[id] = !S.ui.open[id]; render(); if (S.ui.open[id]) { const i = $(`#post-${id} [name=t]`); if (i) i.focus(); } },
  compose: () => composer(),
  clearf: () => { S.ui.f = { q: '', sp: '', yr: '', st: '', pos: '', vf: false, nil: false, cat: '', sort: 'best', grad: '', gpa: '', fol: '', saved: false }; render(); },
  prop: el => need(() => run(null, async () => {
    const p = D().posts.find(x => x.id === +el.dataset.id), k = el.dataset.k; if (!p) return;
    if (p.mine === k) { p.props[k]--; p.mine = null; } else { if (p.mine) p.props[p.mine]--; p.props[k]++; p.mine = k; }
    render();
    try { await api('/api/props', { post: p.id, k: p.mine ? k : '' }); } catch (e) { await refresh(); render(); throw e; }
  })),
  follow: el => need(() => run(el, async () => {
    const id = +el.dataset.id, r = await api('/api/follow', { to: id });
    const f = D().following; if (r.following) f.push(id); else f.splice(f.indexOf(id), 1);
    const u = user(id); if (u) u.fol += r.following ? 1 : -1;
    toast(r.following ? 'Following ' + nameOf(u) : 'Unfollowed'); render();
  })),
  postmenu: el => {
    const p = D().posts.find(x => x.id === +el.dataset.id), me = ME(); if (!p) return;
    menu(el, [{ icon: 'link', label: 'Copy link', fn: () => copy(link('p/' + p.id)) },
      ...(me && p.by === me.id ? [{ icon: 'star', label: me.pin === p.id ? 'Unpin from profile' : 'Pin to profile', fn: () => run(null, async () => { take(await api('/api/posts/pin', { id: p.id })); toast(ME().pin ? 'Pinned to your profile' : 'Unpinned'); render(); }) }, { icon: 'edit', label: 'Edit caption', fn: () => editPost(p) }, { icon: 'trash', label: 'Delete post', bad: true, fn: async () => { if (await confirmBox('Delete this post?', 'It will be removed for everyone, along with its props and comments.', 'Delete', true)) run(null, async () => { await api('/api/posts/delete', { id: p.id }); await refresh(); toast('Post deleted'); if (route()[0] === 'p') go('u/' + me.id); else render(); }); } }]
        : [{ icon: 'flag', label: 'Report post', bad: true, fn: () => need(() => reportSheet('post', p.id)) }])]);
  },
  profmenu: el => {
    const u = user(el.dataset.id), me = ME(); if (!u) return;
    const blocked = me && (me.blocked || []).includes(u.id);
    menu(el, [{ icon: 'link', label: 'Copy profile link', fn: () => copy(location.origin + '/a/' + u.id) },
      ...(u.role === 'athlete' && route()[0] === 'u' ? [{ icon: 'upload', label: 'Print or save one-pager (PDF)', fn: () => { document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50); } }] : []),
      ...(me && me.id !== u.id ? ['-', { icon: 'flag', label: 'Report', bad: true, fn: () => reportSheet('user', u.id) }, { icon: 'x', label: blocked ? 'Unblock' : 'Block', bad: !blocked, fn: () => toggleBlock(u.id) }] : [])]);
  },
  report: el => need(() => reportSheet(el.dataset.kind, +el.dataset.id)),
  offer: el => offerSheet(el.dataset.id, el.dataset.camp ? D().campaigns.find(c => c.id === +el.dataset.camp) : null),
  sendoffer: el => run(el, async () => {
    const f = $('[data-form=offer]'), b = fd(f);
    if (!(+b.amt > 0)) return formErr(f, 'Enter an amount.');
    await api('/api/offers', { to: +f.dataset.id, ...b, amt: +b.amt, del: +b.del });
    closeSheet(); await refresh(); toast('Offer sent'); render();
  }),
  respond: el => run(el, async () => {
    const ok = !!el.dataset.ok, me = ME();
    if (ok && !(await confirmBox('Accept this offer?', `By accepting, you agree to do the work described. Before you post: disclose the deal to your school’s compliance office${D().offers.find(o => o.id === +el.dataset.id)?.amt >= 600 ? ', report it in NIL Go,' : ''} and label the post as a paid partnership.${me.intl ? ' <b>International students:</b> check with your international student office first.' : ''}`, 'Accept offer'))) return;
    if (!ok && !(await confirmBox('Decline this offer?', 'The brand will get a polite message that you’re passing.', 'Decline', true))) return;
    await api('/api/offers/respond', { id: +el.dataset.id, accept: ok }); await refresh(); toast(ok ? 'Offer accepted' : 'Offer declined'); render();
  }),
  // Builds a ready-to-send disclosure email for the athlete's compliance office.
  disclose: el => {
    const o = D().offers.find(x => x.id === +el.dataset.id), me = ME(), b = user(o.brandId);
    const lines = [`Hello,`, ``, `I'm disclosing an NIL agreement, as my school's policy requires.`, ``,
      `Athlete: ${me.f} ${me.l}${me.sp ? ', ' + me.sp : ''}${me.sch ? ', ' + me.sch : ''}`, `Brand: ${o.brand}${b && b.brand && b.brand.site ? ' (' + b.brand.site + ')' : ''}`,
      `Category: ${o.cat}`, `Work: ${o.what}`, `Payment: $${o.amt.toLocaleString('en-US')}`, `Due: ${o.due}`, `Accepted: ${new Date(o.answered || o.at).toLocaleDateString('en-US')}`,
      ``, o.amt >= 600 ? `This deal is $600 or more, so I'm also reporting it in NIL Go.` : `This deal is under $600.`, ``, `The deal is not tied to athletic performance or to choosing, staying at or transferring schools.`, ``, `Thank you,`, `${me.f} ${me.l}`];
    const body = lines.join('\n');
    sheet('Disclose to your school', `<form class="stack" data-form="disc"><p class="muted" style="margin:0">Send this to your compliance office. Check it, then open it in your email app.</p>
      <label class="field"><span>Compliance office email</span><input class="in" type="email" name="to" placeholder="compliance@yourschool.edu" value="${esc(store2.get('nl.compliance') || '')}"></label>
      <textarea class="in" name="body" rows="12" aria-label="Disclosure email">${esc(body)}</textarea></form>`,
      `<button class="btn" data-act="copytext" data-v="${esc(body)}">Copy</button><button class="btn pri" data-act="senddisc" data-sub="${esc('NIL disclosure: ' + o.brand)}">Open in email</button>`, { wide: true });
  },
  senddisc: el => { const f = $('[data-form=disc]'); const to = f.to.value.trim(); if (to) store2.set('nl.compliance', to);
    location.href = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(el.dataset.sub) + '&body=' + encodeURIComponent(f.body.value); },
  deliver: el => {
    const id = +el.dataset.id;
    sheet('Mark delivered', `<form class="stack" data-form="deliver" data-id="${id}" novalidate><p class="muted" style="margin:0">Let the brand know the work is done. They’ll confirm and the deal moves to complete.</p>
      <label class="field"><span>Link to the post <small>(recommended)</small></span><input class="in" name="proof" type="url" maxlength="200" placeholder="https://www.instagram.com/p/…"></label><p class="err" hidden></p></form>`,
      `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="senddeliver">Mark delivered</button>`);
  },
  senddeliver: el => run(el, async () => { const f = $('[data-form=deliver]'); try { take(await api('/api/offers/deliver', { id: +f.dataset.id, proof: f.proof.value.trim() })); } catch (e) { return formErr(f, e.message); } closeSheet(); toast('Marked delivered'); render(); }),
  complete: el => run(el, async () => { if (!(await confirmBox('Confirm this deal is complete?', 'Only confirm after the athlete delivered and you’ve paid them.', 'Confirm complete'))) return; take(await api('/api/offers/complete', { id: +el.dataset.id })); toast('Deal complete'); render(); }),
  apply: el => need(() => { const c = D().campaigns.find(x => x.id === +el.dataset.id); if (!c) return;
    sheet('Apply', `<form class="stack" data-form="apply" data-id="${c.id}"><div><div class="small muted">${esc(c.brandName)}</div><div class="d" style="font-size:28px;margin-top:4px">${esc(c.title)}</div><p class="small muted" style="margin:6px 0 0">${esc(c.del)}</p></div>
      <label class="field"><span>Why you’re a fit <small>(optional)</small></span><textarea class="in" name="pitch" maxlength="300" rows="3" placeholder="e.g. I post game-day content every week and most of my followers are in Dallas."></textarea></label>
      <p class="small dim" style="margin:0">The brand sees your athlete card and this note.</p><p class="err" hidden></p></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendapply">Apply</button>`); }),
  sendapply: el => run(el, async () => { const f = $('[data-form=apply]'); try { await api('/api/campaigns/apply', { id: +f.dataset.id, pitch: f.pitch.value }); } catch (e) { return formErr(f, e.message); } closeSheet(); await refresh(); toast('Applied. The brand will see your card.'); render(); }),
  newcamp: () => campSheet(),
  sendcamp: el => run(el, async () => { const f = $('[data-form=camp]'), b = fd(f), id = f.dataset.id; if (!b.title.trim() || !b.del.trim()) return formErr(f, 'Add a title and what athletes will do.');
    try { if (id) take(await api('/api/campaigns/edit', { ...b, id: +id, spots: +b.spots })); else await api('/api/campaigns', { ...b, spots: +b.spots }); } catch (e) { return formErr(f, e.message); }
    closeSheet(); if (id) { toast('Changes saved'); render(); } else { await refresh(); toast('Campaign posted'); go('campaigns'); } }),
  editcamp: el => campSheet(D().campaigns.find(c => c.id === +el.dataset.id)),
  decide: el => run(el, async () => { take(await api('/api/campaigns/decide', { app: +el.dataset.app, accept: !!el.dataset.ok })); toast(el.dataset.ok ? 'Accepted. We messaged them next steps.' : 'Declined'); render(); }),
  closecamp: el => run(el, async () => { take(await api('/api/campaigns/close', { id: +el.dataset.id })); toast('Saved'); render(); }),
  boardadd: el => boardSheet(el.dataset.id),
  boardsave: el => run(el, async () => { const f = $('[data-form=board]'), b = fd(f); take(await api('/api/board', { athlete: +f.dataset.id, stage: b.stage, note: b.note })); closeSheet(); toast('Board updated'); render(); }),
  boardrm: el => run(el, async () => { take(await api('/api/board', { athlete: +el.dataset.id, stage: '' })); closeSheet(); toast('Removed from board'); render(); }),
  msgnew: () => go('athletes'),
  req: el => run(el, async () => { const ok = !!el.dataset.ok; await api('/api/dm/request', { id: +el.dataset.id, accept: ok }); await refresh(); S.ui.msgTab = 'inbox'; toast(ok ? 'Request accepted' : 'Request deleted'); if (ok) render(); else go('messages'); }),
  cat: el => { el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true'); },
  pairadd: el => { const box = el.closest('[data-pairs]'), n = $$('.pr', box).length; if (n >= +box.dataset.max) return toast('That’s the most you can add.'); const r = $('.pr', box).cloneNode(true); $$('input', r).forEach(i => { i.value = ''; }); el.before(r); $('input', r).focus(); },
  pairrm: el => { const box = el.closest('[data-pairs]'), r = el.closest('.pr'); if ($$('.pr', box).length > 1) r.remove(); else $$('input', r).forEach(i => { i.value = ''; }); },
  avrm: el => run(el, async () => { take(await api('/api/avatar', { img: null })); toast('Photo removed'); render(); }),
  logout: () => logout(),
  unblock: el => toggleBlock(+el.dataset.id),
  delacct: () => {
    sheet('Delete your account', `<form class="stack" data-form="del" novalidate><div class="note bad">${ic('alert')}<span>This permanently deletes your profile, posts, photos, comments and follows. It can’t be undone.</span></div>
      <label class="field"><span>Enter your password to confirm</span><input class="in" type="password" name="password" autocomplete="current-password" required></label><p class="err" hidden></p></form>`,
      `<button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="senddel">Delete account</button>`);
  },
  senddel: el => run(el, async () => { const f = $('[data-form=del]'); try { await api('/api/delete-account', { password: f.password.value }); } catch (e) { return formErr(f, e.message); } S.token = null; store.set(null); closeSheet(); await refresh(); toast('Your account was deleted'); go(''); }),
  verify: el => run(el, async () => { take(await api('/api/admin/verify', { id: +el.dataset.id, on: !!el.dataset.on })); toast(el.dataset.on ? 'Verified' : 'Verification removed'); render(); }),
  acctmenu: el => {
    const u = D().admin.accounts.find(x => x.id === +el.dataset.id); if (!u) return;
    menu(el, [{ href: '#/u/' + u.id, icon: 'user', label: 'View profile' }, { href: 'mailto:' + u.email, icon: 'msg', label: 'Email ' + u.f },
      ...(u.id !== ME().id ? [{ icon: 'gear', label: 'Give temporary password', fn: () => resetPw(u) }, '-', { icon: 'trash', label: 'Remove account', bad: true, fn: () => removeAcct(u) }] : [])]);
  },
  resolve: el => run(el, async () => { const rm = !!el.dataset.rm; if (rm && !(await confirmBox('Remove it?', 'This deletes it for everyone and can’t be undone.', 'Remove', true))) return; take(await api('/api/admin/resolve', { kind: el.dataset.kind, id: +el.dataset.id, remove: rm })); toast(rm ? 'Removed' : 'Kept'); render(); })
};
function resetPw(u) {
  confirmBox('Give a temporary password?', `This signs ${esc(nameOf(u))} out everywhere and replaces their password. Only do this after they email you from <b>${esc(u.email)}</b>.`, 'Create password').then(ok => ok && run(null, async () => {
    const r = await api('/api/admin/reset', { id: u.id }); await refresh(); render();
    sheet('Temporary password', `<div class="stack"><p class="muted" style="margin:0">Send this to <b>${esc(r.email)}</b>. They’ll be asked to choose a new one after logging in.</p>
      <input class="in" readonly value="${esc(r.temp)}" style="font-size:18px;letter-spacing:.04em" aria-label="Temporary password">
      <p class="tiny dim" style="margin:0">It won’t be shown again.</p></div>`, `<button class="btn" data-act="copytext" data-v="${esc(r.temp)}">Copy</button><a class="btn pri" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Your Next Level temporary password')}">Email them</a>`);
  }));
}
function removeAcct(u) {
  confirmBox('Remove this account?', `This permanently deletes ${esc(nameOf(u))}’s profile, posts, photos and comments. It can’t be undone.`, 'Remove account', true).then(ok => ok && run(null, async () => { take(await api('/api/admin/remove-user', { id: u.id })); toast('Account removed'); render(); }));
}
// Spreadsheet exports, built in the browser so nothing extra leaves the server.
function csv(name, rows) {
  const cell = v => { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const blob = new Blob(['\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Downloaded ' + name);
}
const day = t => t ? new Date(t).toISOString().slice(0, 10) : '';
// A 1080x1920 story image of the athlete's card, drawn in the browser, for Instagram and TikTok stories.
async function storyCard(u) {
  try { await Promise.all([document.fonts.load('600 160px Teko'), document.fonts.load('400 40px Rubik'), document.fonts.load('500 40px Rubik')]); } catch (e) {}
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); if (!x.roundRect) x.roundRect = (a, b, w, h) => x.rect(a, b, w, h);
  const D_ = 'Teko, "Arial Narrow", sans-serif', B_ = 'Rubik, system-ui, sans-serif';
  const fit = (t, weight, size, fam, max, min) => { x.font = `${weight} ${size}px ${fam}`; while (x.measureText(t).width > max && size > min) { size -= 4; x.font = `${weight} ${size}px ${fam}`; } return size; };
  const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  x.fillStyle = '#0B0C0E'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, '#12263A'); g.addColorStop(1, '#0B0C0E'); x.fillStyle = g; x.fillRect(0, 0, W, 900);
  const art = (FIELD[SPORT_FIELD[u.sp]] || FIELD.grid).replace(/class="hot"/g, 'stroke="#22A6FF" stroke-opacity=".7" stroke-width="2.2"');
  const fimg = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="2000" height="800"><g fill="none" stroke="rgba(236,238,241,.16)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>`));
  if (fimg) { x.save(); x.globalAlpha = .9; x.drawImage(fimg, -460, 80, 2000, 800); x.restore(); }
  const fade = x.createLinearGradient(0, 600, 0, 900); fade.addColorStop(0, 'rgba(11,12,14,0)'); fade.addColorStop(1, '#0B0C0E'); x.fillStyle = fade; x.fillRect(0, 600, W, 300);
  // brand mark
  x.strokeStyle = '#22A6FF'; x.lineWidth = 9; x.lineCap = x.lineJoin = 'round'; x.beginPath(); x.moveTo(80, 152); x.lineTo(112, 124); x.lineTo(144, 152); x.stroke();
  x.strokeStyle = '#FFE500'; x.lineWidth = 8; x.beginPath(); x.moveTo(92, 130); x.lineTo(112, 112); x.lineTo(132, 130); x.stroke();
  x.fillStyle = '#ECEEF1'; x.font = `600 64px ${D_}`; x.textBaseline = 'alphabetic'; x.fillText('NEXT LEVEL', 166, 160);
  // photo
  let y = 760;
  if (u.av) { const im = await load(u.av); if (im) { x.save(); x.beginPath(); x.arc(200, 560, 120, 0, Math.PI * 2); x.clip(); const k = Math.max(240 / im.width, 240 / im.height); x.drawImage(im, 200 - im.width * k / 2, 560 - im.height * k / 2, im.width * k, im.height * k); x.restore();
    x.strokeStyle = '#0B0C0E'; x.lineWidth = 10; x.beginPath(); x.arc(200, 560, 122, 0, Math.PI * 2); x.stroke(); y = 700; } }
  // number plate + name
  let nx = 80;
  if (u.num) { x.font = `600 150px ${D_}`; const w = Math.max(150, x.measureText(u.num).width + 56); x.fillStyle = '#FFE500'; x.beginPath(); x.roundRect(80, y + 20, w, 150, 16); x.fill(); x.fillStyle = '#0B0C0E'; x.fillText(u.num, 80 + (w - x.measureText(u.num).width) / 2, y + 160); nx = 80 + w + 32; }
  x.fillStyle = '#ECEEF1'; let size = 150; const name = (u.f + ' ' + u.l).toUpperCase();
  x.font = `600 ${size}px ${D_}`; while (x.measureText(name).width > W - nx - 60 && size > 70) { size -= 6; x.font = `600 ${size}px ${D_}`; }
  if (x.measureText(name).width > W - nx - 60) { x.fillText(u.f.toUpperCase(), nx, y + 160 - size * .55); x.fillText(u.l.toUpperCase(), nx, y + 160 + size * .35); y += size * .4; } else x.fillText(name, nx, y + 160);
  y += 250;
  const l1 = [u.sp, u.pos, u.yr].filter(Boolean).join('  ·  '), l2 = [u.sch, u.st].filter(Boolean).join(', ') + (u.verified ? '   ✓ Verified' : '');
  x.fillStyle = '#A3A9B3'; fit(l1, 400, 44, B_, W - 160, 28); x.fillText(l1, 80, y); y += 66;
  x.fillStyle = '#6E7580'; fit(l2, 400, 40, B_, W - 160, 26); x.fillText(l2, 80, y); y += 70;
  // stats
  const st = (u.stats || []).slice(0, 4);
  x.strokeStyle = '#262A31'; x.lineWidth = 3; x.beginPath(); x.moveTo(80, y); x.lineTo(W - 80, y); x.stroke(); y += 40;
  const bh = Math.min(220, Math.floor((H - 280 - y) / 2) - 20);
  if (st.length) st.forEach((s2, i) => { const cx = 80 + (i % 2) * 470, cy = y + Math.floor(i / 2) * (bh + 20);
    x.fillStyle = '#121418'; x.beginPath(); x.roundRect(cx, cy, 450, bh, 20); x.fill(); x.strokeStyle = '#262A31'; x.lineWidth = 2; x.stroke();
    x.fillStyle = '#FFE500'; fit(s2.v, 600, Math.round(bh * .58), D_, 390, 50); x.fillText(s2.v, cx + 32, cy + bh * .64);
    x.fillStyle = '#6E7580'; fit(s2.k.toUpperCase(), 500, 32, B_, 390, 20); x.fillText(s2.k.toUpperCase(), cx + 32, cy + bh - 30); });
  else { x.fillStyle = '#A3A9B3'; x.font = `400 40px ${B_}`; x.fillText('Add your stats on Next Level', 80, y + 60); }
  // footer
  x.fillStyle = '#22A6FF'; x.fillRect(0, H - 220, W, 6);
  x.fillStyle = '#ECEEF1'; fit('SEE MY CARD ON NEXT LEVEL', 600, 72, D_, W - 160, 36); x.fillText('SEE MY CARD ON NEXT LEVEL', 80, H - 110);
  x.fillStyle = '#A3A9B3'; fit(location.host + '/a/' + u.id, 400, 38, B_, W - 160, 22); x.fillText(location.host + '/a/' + u.id, 80, H - 56);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}
function need(fn) { if (!ME()) { authSheet('up'); return; } return fn(); }
async function logout() { try { await api('/api/logout', {}); } catch (e) {} S.token = null; store.set(null); await refresh().catch(() => {}); go(''); toast('Logged out'); }
function toggleBlock(id) {
  const me = ME(), blocked = (me.blocked || []).includes(id);
  const doIt = () => run(null, async () => { const r = await api('/api/block', { id }); await refresh(); toast(r.blocked ? 'Blocked' : 'Unblocked'); if (r.blocked && route()[0] === 'messages') go('messages'); else render(); });
  if (blocked) return doIt();
  confirmBox('Block this account?', 'They won’t be able to message you or see your posts, and you won’t see theirs. They aren’t notified.', 'Block', true).then(ok => ok && doIt());
}
function reportSheet(kind, id) {
  sheet('Report', `<form class="stack" data-form="report" data-kind="${esc(kind)}" data-id="${id}"><label class="field"><span>What’s wrong?</span><select class="in" name="why">
    <option>Spam or scam</option><option>Harassment or bullying</option><option>Fake account or impersonation</option><option>Inappropriate content</option><option>Asked for pay-for-play or a recruiting inducement</option><option>Something else</option></select></label>
    ${kind === 'user' ? '<label class="check"><input type="checkbox" name="block" checked> Also block this account</label>' : ''}
    <p class="small dim" style="margin:0">Reports are private. Content with several reports is hidden while we review it.</p></form>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendreport">Send report</button>`);
}
ACT.sendreport = el => run(el, async () => {
  const f = $('[data-form=report]'), kind = f.dataset.kind, id = +f.dataset.id;
  await api('/api/report', { kind, id, why: f.why.value });
  if (f.block && f.block.checked && !(ME().blocked || []).includes(id)) await api('/api/block', { id });
  closeSheet(); await refresh(); toast('Thanks. We’ll review it.'); render();
});
ACT.sendpost = el => run(el, async () => {
  const f = $('[data-form=post]'), b = fd(f);
  if (!f._img && !b.cap.trim()) return formErr(f, 'Add a photo or write a caption.');
  if (b.type === 'NIL partner' && !b.partner.trim()) return formErr(f, 'Add the brand you partnered with.');
  el.textContent = 'Posting…';
  try { await api('/api/posts', { ...b, img: f._img || null }); } catch (e) { return formErr(f, e.message); }
  closeSheet(); await refresh(); toast('Posted'); if (route()[0] !== 'home' && route()[0] !== 'u') go('home'); else render();
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { if (el.tagName !== 'A' || el.dataset.act === 'compose') e.preventDefault(); ACT[el.dataset.act](el, e); return; }
  const n = e.target.closest('[data-need]'); if (n && !ME()) { e.preventDefault(); authSheet('up'); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-act=stage]')) run(null, async () => { const b = boardRow(el.dataset.id); take(await api('/api/board', { athlete: +el.dataset.id, stage: el.value, note: b ? b.note : '' })); toast('Moved to ' + el.value); render(); });
  if (el.form && el.form.dataset.form === 'filters') readFilters(el.form);
});
let ft = null;
document.addEventListener('input', e => { if (e.target.id === 'acctq') { S.ui.acctq = e.target.value; const b = $('#acctlist'); if (b) b.innerHTML = accountRows(); return; } const f = e.target.form; if (f && f.dataset.form === 'filters') { clearTimeout(ft); ft = setTimeout(() => readFilters(f), 150); } });
function readFilters(f) { const box = $('#results'); if (!box || !f.isConnected) return; const b = fd(f); Object.assign(S.ui.f, { q: b.q || '', sp: b.sp || '', yr: b.yr || '', st: b.st || '', pos: b.pos || '', cat: b.cat || '', sort: b.sort || 'best', vf: !!b.vf, portal: !!b.portal, appear: !!b.appear, grad: b.grad || '', gpa: b.gpa || '', fol: b.fol || '' }); box.innerHTML = results(); }

// ---------------------------------------------------------------- forms
const FORM = {
  filters: () => {},
  topsearch: f => { S.ui.f.q = f.q.value.trim(); go('athletes'); },
  login: async (f, btn) => { const b = fd(f); if (!b.email || !b.password) return formErr(f, 'Enter your email and password.'); try { take(await api('/api/login', b)); } catch (e) { return formErr(f, e.message); } closeSheet(); toast('Welcome back, ' + ME().f); go(PRIVATE.includes(route()[0]) ? route().join('/') : 'home'); },
  signup: async f => {
    const b = fd(f); const data = { ...b, adult: !!b.adult, intl: !!b.intl, terms: !!b.terms };
    if (!b.f || !b.l) return formErr(f, 'Add your first and last name.');
    if (!data.terms) return formErr(f, 'Agree to the Terms and Privacy Policy to continue.');
    if (b.role === 'athlete' && !data.adult) return formErr(f, 'Athlete accounts are for enrolled college athletes 18 or older.');
    try { take(await api('/api/signup', data)); } catch (e) { return formErr(f, e.message); }
    closeSheet(); const r = ME().role;
    toast(r === 'athlete' ? 'Welcome! Finish your card so coaches and brands can find you.' : 'Welcome to Next Level');
    go(r === 'athlete' ? 'edit' : r === 'coach' ? 'athletes' : r === 'brand' ? 'home' : 'athletes');
  },
  comment: async f => { const t = f.t.value.trim(); if (!t) return; await api('/api/comments', { post: +f.dataset.id, t }); await refresh(); render(); const i = $(`#post-${f.dataset.id} [name=t]`); if (i) i.focus(); },
  dm: async f => {
    const t = f.t.value.trim(); if (!t) return; f.t.value = ''; f.t.disabled = true;
    try { const r = await api('/api/dm', { to: +f.dataset.to, t }); await refresh(); if (route()[1] !== String(r.thread.id)) go('messages/' + r.thread.id); else render(); }
    catch (e) { f.t.value = t; f.t.disabled = false; toast(e.message, true); }
  },
  pw: async f => { const b = fd(f); if (!b.old || !b.password) return formErr(f, 'Fill in both passwords.'); try { await api('/api/password', b); } catch (e) { return formErr(f, e.message); } f.reset(); formErr(f, ''); await refresh().catch(() => {}); toast('Password changed'); render(); },
  board: async () => ACT.boardsave($('[data-act=boardsave]')),
  offer: async () => { const b = $('[data-act=sendoffer]'); if (!b.disabled) ACT.sendoffer(b); },
  camp: async () => ACT.sendcamp($('[data-act=sendcamp]')),
  deliver: async () => ACT.senddeliver($('[data-act=senddeliver]')),
  report: async () => ACT.sendreport($('[data-act=sendreport]')),
  del: async () => ACT.senddel($('[data-act=senddel]')),
  post: async () => ACT.sendpost($('[data-act=sendpost]')),
  editpost: async () => ACT.sendedit($('[data-act=sendedit]')),
  apply: async () => ACT.sendapply($('[data-act=sendapply]')),
  profile: async f => {
    const me = ME(), b = fd(f), out = {};
    for (const k of ['f', 'l', 'sch', 'sp', 'pos', 'num', 'yr', 'grad', 'div', 'ht', 'wt', 'home', 'bio', 'gpa', 'major', 'hl', 'title', 'st']) if (k in b) out[k] = b[k].trim();
    if (me.role === 'athlete') {
      out.portal = !!b.portal;
      out.appear = { on: !!b.appear_on, area: (b.appear_area || '').trim() };
      out.stats = collectPairs(f, 'stats'); out.meas = collectPairs(f, 'meas');
      out.awards = (b.awards || '').split('\n').map(s => s.trim()).filter(Boolean);
      out.soc = { ig: b.soc_ig, tt: b.soc_tt, x: b.soc_x, igN: +b.soc_igN || 0, ttN: +b.soc_ttN || 0, xN: +b.soc_xN || 0 };
      out.rate = [b.rate0, b.rate1, b.rate2].map(x => +x || 0);
      out.open = $$('[data-cats] [aria-pressed=true]', f).map(x => x.dataset.v);
    }
    if (me.role === 'brand') out.brand = { name: b.b_name, cat: b.b_cat, site: b.b_site.trim() };
    if (out.f === '' || out.l === '') return formErr(f, 'First and last name can’t be empty.');
    try { take(await api('/api/me', out)); } catch (e) { return formErr(f, e.message); }
    toast('Profile saved'); go('u/' + me.id);
  }
};
document.addEventListener('submit', e => {
  const f = e.target; if (!f.dataset.form) return;
  e.preventDefault(); const h = FORM[f.dataset.form]; if (!h) return; const btn = f.querySelector('button:not([type=button])') || null;
  if (f._busy) return; f._busy = true; if (btn) btn.disabled = true;
  Promise.resolve(h(f, btn)).catch(er => formErr(f, er.message)).finally(() => { f._busy = false; if (btn && btn.isConnected) btn.disabled = false; });
});

// ---------------------------------------------------------------- start, and keep data fresh
window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); });
function safeToRedraw() {
  const a = document.activeElement;
  if (sheetEl || menuEl) return false;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return false;
  return true;
}
async function poll() {
  if (document.hidden || !S.token) return;
  try {
    const before = JSON.stringify([S.data.threads.map(t => [t.id, t.log.length]), S.data.notes.length, S.data.offers.map(o => o.status), S.data.posts.length]);
    await refresh();
    const after = JSON.stringify([S.data.threads.map(t => [t.id, t.log.length]), S.data.notes.length, S.data.offers.map(o => o.status), S.data.posts.length]);
    if (before !== after) { if (safeToRedraw()) render(); else S.pending = true; }
  } catch (e) {}
}
document.addEventListener('focusout', () => setTimeout(() => { if (S.pending && safeToRedraw()) { S.pending = false; render(); } }, 0));
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
(async function start() {
  try { await refresh(); } catch (e) { S.failed = true; }
  render(); setInterval(poll, 15000);
})();
})();
