// Connects the Next Level pages to the server: accounts, real posts and photos, props, comments,
// DMs, NIL offers and campaigns. Without an account the app still shows the sample athletes.
(function () {
  const API = window.NL_API_BASE || '';
  const KEY = 'nl.token';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let token = get(KEY), data = null, base = null, timer = null; const drafts = {};

  async function call(path, body) {
    const r = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const j = await r.json().catch(() => ({ error: 'The server didn’t answer. Try again.' }));
    if (r.status === 401 && token && path !== '/api/login') { token = null; put(KEY, null); }
    if (!r.ok) throw new Error(j.error || 'Something went wrong.');
    return j;
  }

  const NL = () => window.NL;
  const KIND = { athlete: 'Athlete', brand: 'Brand', coach: 'Coach', fan: 'Athlete' };
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'Just now'; if (m < 60) return m + 'm'; const h = Math.round(m / 60); if (h < 24) return h + 'h'; return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
  const nameOf = u => u ? (u.role === 'brand' && u.brand ? u.brand.name : u.f + ' ' + u.l) : 'Someone';

  // Keep a copy of the sample data so each sync starts from the same place.
  function snapshot() {
    const n = NL();
    base = { props: {}, cm: {}, RC: JSON.parse(JSON.stringify(n.RC)), DM: n.DM.slice(), OFFERS: n.OFFERS.slice(), CAMPS: n.CAMPS.slice(), ME: { ...n.ME }, CA: n.CA.slice() };
    for (const p of n.LP) { base.props[p.id] = { ...p.props }; base.cm[p.id] = p.cm; }
  }

  function apply(d) {
    data = d; const n = NL(), me = d.me;
    if (!base) snapshot();
    // athletes with accounts join the NIL marketplace and can author posts
    n.CA.length = 0; base.CA.forEach(a => n.CA.push(a));
    for (const u of d.users) if (u.role === 'athlete' && (!me || u.id !== me.id))
      n.CA.unshift({ ...u, live: true, rate: u.rate || [150, 500, 1000], open: u.open || [], eng: 0, sch: u.sch || 'College', sp: u.sp || 'Athlete' });
    // me
    Object.keys(n.ME).forEach(k => delete n.ME[k]); Object.assign(n.ME, base.ME);
    if (me && me.role === 'athlete') Object.assign(n.ME, { ...me, live: true, eng: 0, rate: me.rate || [150, 500, 1000], bio: esc(me.bio) || 'Tap Edit profile to add a bio.', season: [] });
    // posts: real posts first, then the samples
    for (let i = n.LP.length - 1; i >= 0; i--) if (n.LP[i].live) { delete n.PH[n.LP[i].id]; n.LP.splice(i, 1); }
    n.state.myprops = {};
    for (const p of n.LP) {
      const ex = d.sample[p.id];
      p.props = { ...base.props[p.id] };
      if (ex) { for (const k in ex.props) p.props[k] += ex.props[k] - (ex.mine === k ? 1 : 0); if (ex.mine) n.state.myprops[p.id] = ex.mine; }
      p.cm = base.cm[p.id] + ((d.comments[p.id] || []).length);
    }
    const live = d.posts.map(p => {
      const props = { ...p.props }; if (p.mine) { props[p.mine] -= 1; n.state.myprops[p.id] = p.mine; }
      if (p.img) n.PH[p.id] = API + p.img;
      return { id: p.id, by: p.by, type: p.type, sport: p.sport, season: p.season, tag: p.tag, pr: p.pr, partner: p.partner, cap: esc(p.cap), props, cm: p.cm, live: true, at: p.at };
    });
    n.LP.unshift(...live);
    // comments
    Object.keys(n.RC).forEach(k => delete n.RC[k]); Object.assign(n.RC, JSON.parse(JSON.stringify(base.RC)));
    for (const [id, list] of Object.entries(d.comments)) n.RC[id] = (n.RC[id] || []).concat(list.map(c => [c.name, c.t]));
    n.state.mycm = {};
    // campaigns
    n.CAMPS.length = 0;
    d.campaigns.forEach(c => n.CAMPS.push({ id: c.id, brand: c.brandName, cat: c.cat, title: c.title, pay: c.pay, spots: c.spots, left: Math.max(0, c.spots - c.taken), need: c.need, del: c.del, due: c.due, applied: c.applied, live: true, mine: !!(me && c.brand === me.id), count: c.count }));
    base.CAMPS.forEach(c => n.CAMPS.push(c));
    // DMs and offers only change once someone is signed in
    n.DM.length = 0; n.OFFERS.length = 0;
    if (!me) { base.DM.forEach(x => n.DM.push(x)); base.OFFERS.forEach(x => n.OFFERS.push(x)); }
    else {
      for (const t of d.threads) {
        const w = t.with || { f: 'Deleted', l: 'account', role: 'fan' };
        n.DM.push({ id: 's' + t.id, tid: t.id, uid: w.id, live: true, kind: t.request ? 'Request' : KIND[w.role] || 'Athlete', name: nameOf(w),
          sub: w.role === 'brand' ? (w.brand?.cat || 'Brand') + ' · NIL' : [w.sp, w.sch].filter(Boolean).join(' · ') || 'Next Level', verified: w.verified,
          unread: t.unread, request: t.request,
          log: t.log.map(m => ({ by: m.by, t: m.t ? esc(m.t) : '', at: ago(m.at), offer: m.offer ? { status: m.offer.status, amt: m.offer.amt, what: esc(m.offer.what), due: m.offer.due, brand: esc(m.offer.brand) } : null, post: m.post || null })) });
      }
      for (const [uid, dr] of Object.entries(drafts)) { if (d.threads.some(t => t.with && t.with.id === +uid)) delete drafts[uid]; else n.DM.unshift(dr); }
      n.DM.push({ id: 'welcome', kind: 'Team', name: 'Next Level', sub: 'Tips and updates', group: false, unread: 0, log: [
        { by: 'them', t: me.role === 'brand' ? 'Welcome! Head to NIL to find athletes, post a campaign, or send an offer. Every offer is checked for compliance before it’s sent.' : me.role === 'athlete' ? 'Welcome to the Locker! Post your first highlight from your Card, and set your rate card under NIL so brands can find you.' : 'Welcome! Follow athletes and give props on their highlights.', at: ago(me.created || Date.now()) }] });
      for (const o of d.offers) if (o.to === me.id && o.status !== 'Declined')
        n.OFFERS.push({ id: o.id, brand: esc(o.brand), cat: o.cat, to: o.to, amt: o.amt, what: esc(o.what), due: o.due, status: o.status, done: o.status === 'Active' ? ['Contract signed', 'School disclosure sent'] : [] });
    }
    // notifications
    if (!base.NOTES) base.NOTES = n.NOTES.slice();
    n.NOTES.length = 0;
    if (me) d.notes.forEach(x => n.NOTES.push({ k: x.k, t: '<b>' + esc(x.who) + '</b> ' + esc(x.t), at: ago(x.at), go: x.go, hot: x.hot ? 1 : 0 }));
    else base.NOTES.forEach(x => n.NOTES.push(x));
    try { n.renderBell(); } catch (e) {}
    renderAcct();
  }

  async function sync(rerender) {
    try { apply(await call('/api/sync')); } catch (e) { if (!token) return; console.warn(e); return; }
    if (rerender) safeRender();
  }
  // Re-draw only when it won't interrupt someone typing or reading a dialog.
  function safeRender() {
    const a = document.activeElement, pv = document.getElementById('pv'), od = document.getElementById('offerDlg');
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    if ((pv && pv.innerHTML) || (od && od.innerHTML) || document.getElementById('acctDlg')) return;
    const r = document.getElementById('reels'), y = r && r.scrollTop, dl = document.getElementById('dmlog');
    NL().renderNav(); NL().render();
    const r2 = document.getElementById('reels'); if (r2 && y) r2.scrollTop = y;
    const d2 = document.getElementById('dmlog'); if (d2 && dl) d2.scrollTop = d2.scrollHeight;
  }
  function poll() { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) sync(['messages', 'locker', 'reels', 'deals', 'nil', 'me'].includes(NL().state.view)); }, 15000); }

  // ---- account button and sheet ----
  function renderAcct() {
    let b = document.getElementById('acct');
    if (!b) {
      const bell = document.getElementById('bell'); if (!bell) return;
      b = document.createElement('button'); b.id = 'acct'; b.className = 'btn sm acctb'; bell.parentNode.insertBefore(b, bell);
      b.onclick = () => (data && data.me ? profileSheet() : authSheet('signup'));
      const st = document.createElement('style');
      st.textContent = `.acctb{white-space:nowrap}.acctb .av2{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);font:600 11px/1 var(--f-ui,inherit);margin:-4px 6px -4px -4px}
      .roles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.roles button{text-align:left;padding:10px 12px;border:1px solid var(--line,#2a2e35);border-radius:8px;background:none;color:inherit;font:inherit;cursor:pointer}
      .roles button[aria-pressed=true]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}.roles small{display:block;opacity:.7;margin-top:2px}
      .frow{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}.chk{display:flex;gap:8px;align-items:flex-start;font-size:13px}.chk input{margin-top:3px}
      .aerr{color:#ff6b6b;margin:0;font-size:13px}.alink{background:none;border:0;color:var(--accent);font:inherit;cursor:pointer;padding:0;text-decoration:underline}
      .catpick{display:flex;flex-wrap:wrap;gap:6px}.catpick button[aria-pressed=true]{background:var(--accent);color:var(--bg);border-color:var(--accent)}
      #acctDlg .dlg{max-height:calc(100dvh - 40px);overflow:auto}`;
      document.head.appendChild(st);
    }
    const me = data && data.me;
    let tag = document.getElementById('sampleTag');
    if (!tag) { tag = document.createElement('span'); tag.id = 'sampleTag'; tag.className = 'chip'; tag.style.cssText = 'font-size:11px;white-space:nowrap;opacity:.8';
      tag.title = 'Sample athletes, scores and posts are mixed in so the app isn’t empty. Real posts always show first.'; b.parentNode.insertBefore(tag, b.nextSibling); }
    const real = data ? data.posts.length : 0;
    tag.textContent = real >= 30 ? '' : 'Preview · sample athletes shown'; tag.hidden = real >= 30;
    b.innerHTML = me ? `<span class="av2">${esc((me.f[0] || '') + (me.l[0] || ''))}</span>${esc(me.role === 'brand' && me.brand ? me.brand.name : me.f)}` : 'Sign in';
  }
  function sheet(html) {
    close();
    const d = document.createElement('div'); d.id = 'acctDlg';
    d.innerHTML = `<div class="scrim" role="dialog" aria-modal="true"><div class="panel dlg">${html}</div></div>`;
    document.body.appendChild(d);
    d.querySelector('.scrim').addEventListener('click', e => { if (e.target.classList.contains('scrim')) close(); });
    const x = d.querySelector('[data-close]'); if (x) x.onclick = close;
    const f = d.querySelector('input'); if (f) f.focus();
    return d;
  }
  function close() { const d = document.getElementById('acctDlg'); if (d) d.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', e => { if (e.target.closest('#editMe') && data && data.me) profileSheet(); });

  function authSheet(mode, role) {
    role = role || 'athlete';
    const cats = (data && data.rules.CATS) || ['Apparel', 'Food & drink', 'Fitness', 'Local business'];
    const R = [['athlete', 'College athlete', 'Post, get props, land NIL deals'], ['brand', 'Brand or business', 'Find athletes, send offers'], ['coach', 'Coach or staff', 'Scout and message'], ['fan', 'Fan', 'Follow and hype']];
    const d = sheet(mode === 'login' ? `<div class="hd"><h2>Sign in</h2><button class="btn sm" data-close>Close</button></div>
      <form class="bd stack" id="af" style="gap:12px"><label class="fl">Email<input name="email" type="email" autocomplete="email" required></label>
      <label class="fl">Password<input name="password" type="password" autocomplete="current-password" required></label><p class="aerr" id="ae" hidden></p>
      <button class="btn pri">Sign in</button><p style="margin:0;font-size:13px">New here? <button type="button" class="alink" id="sw">Make an account</button></p></form>`
      : `<div class="hd"><h2>Join Next Level</h2><button class="btn sm" data-close>Close</button></div>
      <form class="bd stack" id="af" style="gap:12px"><div class="roles">${R.map(r => `<button type="button" data-role="${r[0]}" aria-pressed="${r[0] === role}"><b>${r[1]}</b><small>${r[2]}</small></button>`).join('')}</div>
      <div class="frow"><label class="fl">First name<input name="f" autocomplete="given-name" required></label><label class="fl">Last name<input name="l" autocomplete="family-name" required></label></div>
      ${role === 'athlete' ? `<div class="frow"><label class="fl">School<input name="sch" placeholder="Coastline U" required></label><label class="fl">Sport<input name="sp" placeholder="Volleyball" required></label></div>
        <div class="frow"><label class="fl">Position<input name="pos" placeholder="OH"></label><label class="fl">Year<select name="yr"><option>Fr</option><option>So</option><option>Jr</option><option>Sr</option><option>Grad</option></select></label><label class="fl">Jersey #<input name="num" inputmode="numeric" maxlength="3"></label></div>
        <label class="chk"><input type="checkbox" name="adult"> I’m 18 or older and enrolled at this school</label><label class="chk"><input type="checkbox" name="intl"> I’m an international student (we’ll warn you about visa limits on NIL)</label>` : ''}
      ${role === 'brand' ? `<div class="frow"><label class="fl">Brand or business<input name="brandName" required></label><label class="fl">Category<select name="cat">${cats.map(c => `<option>${c}</option>`).join('')}</select></label></div><label class="fl">Website (optional)<input name="site" type="url" placeholder="https://"></label>` : ''}
      ${role === 'coach' ? `<label class="fl">School or program<input name="sch"></label>` : ''}
      <label class="fl">Email<input name="email" type="email" autocomplete="email" required></label>
      <label class="fl">Password<input name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="8+ characters"></label>
      <label class="chk"><input type="checkbox" name="terms"> I agree to the Terms and Community Guidelines</label>
      <p class="note" style="margin:0;font-size:12px">By joining you agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms of Service</a> and <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. Next Level is a marketplace, not an agent.</p>
<p class="aerr" id="ae" hidden></p><button class="btn pri">Create account</button>
      <p style="margin:0;font-size:13px">Have an account? <button type="button" class="alink" id="sw">Sign in</button></p></form>`);
    d.querySelectorAll('[data-role]').forEach(b => b.onclick = () => authSheet('signup', b.dataset.role));
    d.querySelector('#sw').onclick = () => authSheet(mode === 'login' ? 'signup' : 'login');
    d.querySelector('#af').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, body = Object.fromEntries(new FormData(f)), btn = f.querySelector('.btn.pri'), ae = d.querySelector('#ae');
      for (const k of ['adult', 'intl', 'terms']) body[k] = !!f.elements[k] && f.elements[k].checked;
      body.role = role; btn.disabled = true; ae.hidden = true;
      try {
        const r = await call(mode === 'login' ? '/api/login' : '/api/signup', body);
        token = r.token; put(KEY, token); apply(r); close(); poll();
        NL().toast(mode === 'login' ? 'Welcome back, ' + r.me.f : 'You’re in. Welcome to Next Level.');
        NL().go(r.me.role === 'brand' ? 'nil' : r.me.role === 'athlete' ? 'me' : 'locker');
      } catch (er) { ae.textContent = er.message; ae.hidden = false; btn.disabled = false; }
    };
  }

  function profileSheet() {
    const me = data.me, cats = data.rules.CATS, open = new Set(me.open || []);
    const d = sheet(`<div class="hd"><h2>${esc(nameOf(me))}</h2><button class="btn sm" data-close>Close</button></div>
      <form class="bd stack" id="pf2" style="gap:12px"><p class="note" style="margin:0">${esc(me.email)} · ${me.role === 'brand' ? 'Brand account' : me.role === 'athlete' ? 'College athlete' : me.role === 'coach' ? 'Coach / staff' : 'Fan'}</p>
      <div class="frow"><label class="fl">First name<input name="f" value="${esc(me.f)}"></label><label class="fl">Last name<input name="l" value="${esc(me.l)}"></label></div>
      ${me.role === 'athlete' ? `<div class="frow"><label class="fl">School<input name="sch" value="${esc(me.sch)}"></label><label class="fl">Sport<input name="sp" value="${esc(me.sp)}"></label></div>
      <div class="frow"><label class="fl">Position<input name="pos" value="${esc(me.pos)}"></label><label class="fl">Jersey #<input name="num" value="${esc(me.num)}" maxlength="3"></label></div>
      <label class="fl">Bio<textarea name="bio" rows="2" maxlength="160">${esc(me.bio)}</textarea></label>
      <div class="lab">Rate card (USD)</div><div class="frow">${['Story', 'Post / reel', 'Appearance'].map((l, i) => `<label class="fl">${l}<input name="r${i}" type="number" min="0" value="${(me.rate || [])[i] || 0}"></label>`).join('')}</div>
      <div class="lab">Open to brands in</div><div class="catpick">${cats.map(c => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${open.has(c)}">${esc(c)}</button>`).join('')}</div>
      <p class="note" style="margin:0">Alcohol, vape, betting and adult brands are always blocked.</p>` : ''}
      <p class="aerr" id="ae" hidden></p><button class="btn pri">Save</button>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="lo">Sign out</button><button type="button" class="btn" id="del">Delete account</button></div></form>`);
    d.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { const c = b.dataset.cat; open.has(c) ? open.delete(c) : open.add(c); b.setAttribute('aria-pressed', open.has(c)); });
    d.querySelector('#pf2').onsubmit = async e => {
      e.preventDefault();
      const b = Object.fromEntries(new FormData(e.target));
      if (me.role === 'athlete') { b.rate = [b.r0, b.r1, b.r2]; b.open = [...open]; }
      try { apply(await call('/api/me', b)); close(); NL().toast('Saved'); safeRender(); }
      catch (er) { const ae = d.querySelector('#ae'); ae.textContent = er.message; ae.hidden = false; }
    };
    d.querySelector('#lo').onclick = async () => { try { await call('/api/logout', {}); } catch (e) {} token = null; put(KEY, null); clearInterval(timer); close(); await sync(true); NL().toast('Signed out'); };
    d.querySelector('#del').onclick = () => {
      const d2 = sheet(`<div class="hd"><h2>Delete account</h2><button class="btn sm" data-close>Close</button></div><form class="bd stack" id="df" style="gap:12px">
        <p style="margin:0">This removes your profile, posts, photos and comments for good.</p><label class="fl">Password<input name="password" type="password" required></label>
        <p class="aerr" id="ae" hidden></p><button class="btn pri">Delete my account</button></form>`);
      d2.querySelector('#df').onsubmit = async e => {
        e.preventDefault();
        try { await call('/api/delete-account', { password: e.target.password.value }); token = null; put(KEY, null); close(); await sync(true); NL().toast('Your account was deleted'); }
        catch (er) { const ae = d2.querySelector('#ae'); ae.textContent = er.message; ae.hidden = false; }
      };
    };
  }
  const needAcct = role => {
    if (!data || !data.me) { authSheet('signup', role); throw new Error('Make an account first.'); }
  };

  // ---- the hooks the page calls ----
  window.NLAPI = {
    get on() { return !!(data && data.me); },
    brandName() { return data && data.me && data.me.brand ? esc(data.me.brand.name) : null; },
    meAthlete() { return data && data.me && data.me.role === 'athlete' ? NL().ME : null; },
    async post(p) { needAcct('athlete'); const r = await call('/api/posts', p); await sync(); return r; },
    async prop(id, k) { if (!data || !data.me) return; try { await call('/api/props', { post: +id, k: k || '' }); } catch (e) { NL().toast(e.message); } },
    async comment(id, t) { needAcct('fan'); await call('/api/comments', { post: id, t }); await sync(); },
    async dm(cur, t) { const r = await call('/api/dm', { to: cur.uid, t }); delete drafts[cur.uid]; await sync(); NL().state.dm = 's' + r.thread.id; },
    async read(cur) { try { await call('/api/dm/read', { id: cur.tid }); } catch (e) {} },
    async request(cur, accept) { await call('/api/dm/request', { id: cur.tid, accept }); await sync(); },
    async offer(a, o) { needAcct('brand'); await call('/api/offers', { to: a.id, ...o }); await sync(); },
    async respond(id, accept) { await call('/api/offers/respond', { id, accept }); await sync(); },
    async apply(id) { needAcct('athlete'); await call('/api/campaigns/apply', { id }); await sync(); NL().toast('Applied. The brand will see your card.'); },
    async campaign(c) { needAcct('brand'); await call('/api/campaigns', c); await sync(); NL().toast('Campaign posted'); },
    follows(id) { return !!(data && data.following.includes(id)); },
    async follow(id) { needAcct('fan'); await call('/api/follow', { to: id }); await sync(); },
    async notesRead() { if (data && data.me) try { await call('/api/notes/read', {}); } catch (e) {} },
    reportUser(a, done) {
      needAcct('fan');
      const d = sheet(`<div class="hd"><h2>Report or block ${esc(a.f)}</h2><button class="btn sm" data-close>Close</button></div><form class="bd stack" id="rf" style="gap:12px">
        <label class="fl">What’s wrong?<select name="why"><option>Spam or scam</option><option>Harassment or bullying</option><option>Fake account or impersonation</option><option>Inappropriate content</option><option>Asked for pay-for-play or a recruiting deal</option><option>Something else</option></select></label>
        <label class="chk"><input type="checkbox" name="block" checked> Also block them (they can’t message you or see your posts)</label>
        <button class="btn pri">Send report</button></form>`);
      d.querySelector('#rf').onsubmit = async e => {
        e.preventDefault();
        try { await call('/api/report', { kind: 'user', id: a.id, why: e.target.why.value }); if (e.target.block.checked) await call('/api/block', { id: a.id });
          close(); await sync(true); NL().toast('Thanks. Our team will review it.'); if (done) done(); }
        catch (er) { NL().toast(er.message); }
      };
    },
    async message(uid) { needAcct('fan'); const n = NL(), t = n.DM.find(x => x.uid === uid); if (t) { n.state.dm = t.id; n.go('messages'); return; }
      const u = data.users.find(x => x.id === uid); if (!u) throw new Error('That account doesn’t exist.');
      drafts[uid] = { id: 'new' + uid, uid, live: true, kind: KIND[u.role] || 'Athlete', name: nameOf(u), sub: [u.sp, u.sch].filter(Boolean).join(' · ') || 'Next Level', verified: u.verified, unread: 0, log: [] };
      apply(data); n.state.dm = 'new' + uid; n.go('messages'); },
    sync
  };

  function start() { snapshot(); renderAcct(); sync(true); if (token) poll(); }
  if (window.NL) start(); else window.addEventListener('nl:ready', start, { once: true });
})();
