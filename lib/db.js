// Accounts, sessions and every shared collection (posts, comments, messages, offers, campaigns),
// kept in memory and written to JSON files on disk. Each write goes to a temp file first and is then
// renamed into place, so a crash mid-write never leaves a half-written file. Fine for the first few
// thousand users; move to a real database (Postgres) before that.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLLECTIONS = ['users', 'posts', 'comments', 'props', 'threads', 'offers', 'campaigns', 'apps', 'reports', 'follows'];

function createDB(dataDir) {
  fs.mkdirSync(path.join(dataDir, 'media'), { recursive: true });
  const file = name => path.join(dataDir, name + '.json');
  const load = (name, d) => { try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch (e) { return d; } };
  const data = {};
  for (const c of COLLECTIONS) data[c] = load(c, []);
  const meta = load('meta', { seq: 1000, sessions: {} });

  const dirty = new Set();
  let timer = null;
  function flush() {
    timer = null;
    for (const name of dirty) {
      const obj = name === 'meta' ? meta : data[name], tmp = file(name) + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, file(name));
    }
    dirty.clear();
  }
  // Writes are batched for 50 ms so a burst of likes is one disk write, not fifty.
  const touch = (...names) => { names.forEach(n => dirty.add(n)); if (!timer) timer = setTimeout(flush, 50); };
  process.on('SIGTERM', () => { try { flush(); } finally { process.exit(0); } });

  const nextId = () => { meta.seq += 1; touch('meta'); return meta.seq; };
  const sha = s => crypto.createHash('sha256').update(s).digest('hex');
  const hashPassword = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
  const err = (status, message) => Object.assign(new Error(message), { status });

  function createUser(email, password, fields) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err(400, 'Enter a valid email address.');
    if (String(password || '').length < 8) throw err(400, 'Use a password with at least 8 characters.');
    if (data.users.some(u => u.email === email)) throw err(409, 'That email already has an account. Log in instead.');
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { id: nextId(), email, salt, hash: hashPassword(password, salt), created: Date.now(), blocked: [], ...fields };
    data.users.push(u); touch('users');
    return u;
  }
  function checkLogin(email, password) {
    const u = data.users.find(x => x.email === String(email || '').trim().toLowerCase());
    if (!u) return null;
    const a = Buffer.from(u.hash, 'hex'), b = Buffer.from(hashPassword(String(password || ''), u.salt), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? u : null;
  }
  function newSession(u) {
    const token = crypto.randomBytes(32).toString('hex');
    meta.sessions[sha(token)] = { uid: u.id, created: Date.now() }; touch('meta');
    return token;
  }
  function userFromToken(token) {
    const s = token && meta.sessions[sha(token)];
    if (!s) return null;
    if (Date.now() - s.created > 90 * 86400e3) { delete meta.sessions[sha(token)]; touch('meta'); return null; }
    return data.users.find(u => u.id === s.uid) || null;
  }
  function endSession(token) { if (token) { delete meta.sessions[sha(token)]; touch('meta'); } }
  function deleteUser(u) {
    for (const [k, s] of Object.entries(meta.sessions)) if (s.uid === u.id) delete meta.sessions[k];
    data.users = data.users.filter(x => x.id !== u.id);
    for (const p of data.posts.filter(p => p.by === u.id)) removeMedia(p.img);
    data.posts = data.posts.filter(p => p.by !== u.id);
    data.comments = data.comments.filter(c => c.by !== u.id);
    data.props = data.props.filter(c => c.by !== u.id);
    data.follows = data.follows.filter(f => f.by !== u.id && f.to !== u.id);
    data.apps = data.apps.filter(a => a.by !== u.id);
    touch(...COLLECTIONS, 'meta');
  }

  // Photos are saved as files; only the file name is kept on the post.
  function saveMedia(dataUrl) {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) throw err(400, 'That photo could not be read. Try a JPG or PNG.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2.5e6) throw err(413, 'That photo is too large. Try one under 2.5 MB.');
    const name = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
    fs.writeFileSync(path.join(dataDir, 'media', name), buf);
    return name;
  }
  function removeMedia(name) { if (name && /^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) fs.rmSync(path.join(dataDir, 'media', name), { force: true }); }
  const mediaPath = name => /^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name) ? path.join(dataDir, 'media', name) : null;

  return { data, touch, nextId, createUser, checkLogin, newSession, userFromToken, endSession, deleteUser, saveMedia, removeMedia, mediaPath, err, flush };
}
module.exports = { createDB };
