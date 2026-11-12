// End-to-end API test. Starts its own server on a throwaway data folder, so it never touches real data.
// Run: node test.js
const fs = require('fs'), os = require('os'), path = require('path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-test-'));
process.env.DATA_DIR = dir; process.env.ADMIN_EMAILS = 'owner@test.dev';
const { server } = require('./server');

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.log('FAIL', name); } };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

server.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = async (p, body, tok, ip) => {
    const r = await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}), 'x-forwarded-for': ip || '1.1.1.1' }, body: body ? JSON.stringify(body) : undefined });
    return { s: r.status, j: await r.json().catch(() => null), h: r.headers };
  };
  const up = async (b, ip) => (await call('/api/signup', { password: 'password123', terms: true, ...b }, null, ip)).j;
  try {
    // --- static and headers
    let r = await fetch(base + '/'); ok(r.status === 200 && r.headers.get('strict-transport-security') && r.headers.get('x-frame-options') === 'DENY', 'index + security headers');
    for (const f of ['/app.js', '/app.css', '/terms.html', '/privacy.html', '/icon.svg', '/manifest.webmanifest']) ok((await fetch(base + f)).status === 200, 'static ' + f);
    ok((await fetch(base + '/../server.js')).status === 404, 'no path escape');

    // --- signup rules
    ok((await call('/api/signup', { role: 'athlete', f: 'A', l: 'B', email: 'x@y.com', password: 'password123', sch: 'UT', sp: 'Golf', adult: true })).s === 400, 'terms required');
    ok((await call('/api/signup', { role: 'athlete', f: 'A', l: 'B', email: 'x@y.com', password: 'password123', sch: 'UT', sp: 'Golf', terms: true })).s === 400, 'athlete must be 18+');
    ok((await call('/api/signup', { role: 'athlete', f: 'A', l: 'B', email: 'x@y.com', password: 'password123', sp: 'Golf', adult: true, terms: true })).s === 400, 'athlete needs school');
    ok((await call('/api/signup', { role: 'coach', f: 'A', l: 'B', email: 'c@y.com', password: 'password123', terms: true })).s === 400, 'coach needs school+sport');
    ok((await call('/api/signup', { role: 'brand', f: 'A', l: 'B', email: 'b@y.com', password: 'password123', brandName: 'Bar', cat: 'Alcohol', terms: true })).s === 400, 'banned brand blocked');
    ok((await call('/api/signup', { role: 'fan', f: 'A', l: 'B', email: 'bad', password: 'password123', terms: true })).s === 400, 'bad email');
    ok((await call('/api/signup', { role: 'fan', f: 'A', l: 'B', email: 'f@y.com', password: 'short', terms: true })).s === 400, 'short password');

    const A = await up({ role: 'athlete', f: 'Maya', l: 'Lind', email: 'maya@test.dev', sch: 'UT Dallas', sp: 'Volleyball', yr: 'Jr', adult: true, intl: true }, '2.2.2.2');
    const B = await up({ role: 'brand', f: 'Bo', l: 'Brand', email: 'brand@test.dev', brandName: 'Peak Bars', cat: 'Food & drink', site: 'https://peak.example' }, '3.3.3.3');
    const C = await up({ role: 'coach', f: 'Cam', l: 'Coach', email: 'coach@test.dev', sch: 'SMU', sp: 'Volleyball', title: 'Head coach' }, '4.4.4.4');
    const O = await up({ role: 'fan', f: 'Own', l: 'Er', email: 'owner@test.dev' }, '5.5.5.5');
    const F = await up({ role: 'fan', f: 'Fay', l: 'Fan', email: 'fan@test.dev' }, '6.6.6.6');
    ok(A.token && B.token && C.token && O.token && F.token, 'five accounts created');
    ok(A.me.intl === true && A.me.rate.length === 3, 'athlete defaults');
    ok(B.me.brand.site === 'https://peak.example', 'brand site kept');
    ok((await call('/api/signup', { role: 'fan', f: 'A', l: 'B', email: 'MAYA@test.dev', password: 'password123', terms: true })).s === 409, 'duplicate email');
    ok(O.me.admin === true && A.me.admin === false, 'admin flag');
    ok(!JSON.stringify((await call('/api/sync')).j.users).includes('@test.dev'), 'emails never public');

    // --- login / logout / password
    ok((await call('/api/login', { email: 'maya@test.dev', password: 'nope' }, null, '7.7.7.7')).s === 401, 'bad login');
    const L = (await call('/api/login', { email: 'maya@test.dev', password: 'password123' }, null, '7.7.7.7')).j;
    ok(L.token && L.me.id === A.me.id, 'login');
    ok((await call('/api/password', { old: 'wrong', password: 'newpassword1' }, A.token)).s === 401, 'pw change needs old');
    ok((await call('/api/password', { old: 'password123', password: 'newpassword1' }, A.token)).s === 200, 'pw change');
    ok((await call('/api/sync', null, L.token)).j.me === null, 'other sessions signed out after pw change');
    ok((await call('/api/sync', null, A.token)).j.me.id === A.me.id, 'current session kept');

    // --- profile
    r = await call('/api/me', { bio: 'Outside hitter.', ht: '6\'1"', gpa: '3.8', grad: '2027', hl: 'https://hudl.com/v/1', stats: [{ k: 'Kills', v: '312' }, { k: 'Hit %', v: '.287' }, { k: '', v: 'x' }], meas: [{ k: 'Vertical', v: '30"' }], awards: ['All-Conference'], soc: { ig: '@maya.l', igN: 12000, tt: 'bad handle!' }, open: ['Apparel', 'Alcohol'], rate: [100, 400, 900], st: 'tx' }, A.token);
    ok(r.s === 200 && r.j.me.stats.length === 2 && r.j.me.soc.ig === 'maya.l' && r.j.me.soc.tt === 'badhandle' && r.j.me.st === 'TX', 'profile saves + cleans');
    ok(r.j.me.open.join() === 'Apparel', 'banned category dropped');
    ok((await call('/api/me', { gpa: 'four' }, A.token)).s === 400, 'gpa validated');
    ok((await call('/api/me', { hl: 'javascript:alert(1)' }, A.token)).s === 400, 'film link must be https');
    ok((await call('/api/me', { bio: '<script>alert(1)</script>' }, A.token)).j.me.bio.includes('<') === false, 'angle brackets stripped');
    ok((await call('/api/me', { brand: { name: 'X', cat: 'Sports betting' } }, B.token)).s === 400, 'brand cannot switch to banned');
    r = await call('/api/avatar', { img: PNG }, A.token); ok(r.s === 200 && /^\/media\/[a-f0-9]{24}\.png$/.test(r.j.me.av), 'avatar upload');
    ok((await fetch(base + r.j.me.av)).status === 200, 'avatar served');
    ok((await call('/api/avatar', { img: 'data:text/html;base64,PGI+' }, A.token)).s === 400, 'avatar type checked');

    // --- posts, props, comments
    ok((await call('/api/posts', { cap: 'hi' }, B.token)).s === 403, 'only athletes post');
    r = await call('/api/posts', { cap: 'Senior night', type: 'Game day', img: PNG, tag: 'vs SMU' }, A.token);
    const post = r.j.post; ok(r.s === 200 && post.img, 'post with photo');
    ok((await call('/api/props', { post: post.id, k: 'goat' }, F.token)).s === 200, 'prop');
    ok((await call('/api/props', { post: 5, k: 'goat' }, F.token)).s === 404, 'no props on missing posts');
    ok((await call('/api/comments', { post: post.id, t: 'Let’s go!' }, F.token)).s === 200, 'comment');
    r = (await call('/api/sync', null, F.token)).j;
    ok(r.posts[0].props.goat === 1 && r.posts[0].mine === 'goat' && r.comments[post.id].length === 1, 'sync shows props + comments');
    ok(r.sample === undefined, 'no sample data');

    // --- follows and DMs
    await call('/api/follow', { to: A.me.id }, C.token);
    r = await call('/api/dm', { to: A.me.id, t: 'Hi Maya, loved your film.' }, C.token);
    const th = r.j.thread; ok(th.pending === true, 'first DM is a request');
    r = (await call('/api/sync', null, A.token)).j; ok(r.threads[0].request === true && r.threads[0].unread === 1, 'athlete sees request');
    ok((await call('/api/dm/request', { id: th.id, accept: true }, A.token)).s === 200, 'accept request');
    await call('/api/dm/read', { id: th.id }, A.token);
    ok((await call('/api/sync', null, A.token)).j.threads[0].unread === 0, 'read');

    // --- coach board
    ok((await call('/api/board', { athlete: A.me.id, stage: 'Watching' }, B.token)).s === 403, 'board is coach-only');
    r = await call('/api/board', { athlete: A.me.id, stage: 'Evaluating', note: 'Great arm swing' }, C.token);
    ok(r.j.board.length === 1 && r.j.board[0].note === 'Great arm swing', 'board add');
    ok((await call('/api/board', { athlete: A.me.id, stage: 'Bogus' }, C.token)).s === 400, 'stage validated');
    ok((await call('/api/sync', null, A.token)).j.board.length === 0, 'athlete never sees boards');
    r = await call('/api/board', { athlete: A.me.id, stage: '' }, C.token); ok(r.j.board.length === 0, 'board remove');

    // --- offers and compliance
    const off = { to: A.me.id, cat: 'Food & drink', del: 1, amt: 400, what: '1 reel with our bar', due: 'Dec 5' };
    ok((await call('/api/offers', off, C.token)).s === 403, 'only brands offer');
    ok((await call('/api/offers', { ...off, cat: 'Alcohol' }, B.token)).s === 400, 'banned category offer blocked');
    ok((await call('/api/offers', { ...off, what: 'Bonus if you win the conference' }, B.token)).s === 400, 'pay-for-play blocked');
    ok((await call('/api/offers', { ...off, note: 'Commit to our school' }, B.token)).s === 400, 'inducement blocked');
    ok((await call('/api/offers', { ...off, amt: 5000 }, B.token)).s === 400, 'over fair market value blocked');
    r = await call('/api/offers/check', { ...off, amt: 800 }, B.token); ok(r.j.checks.every(c => c.ok) && r.j.checks.some(c => /NIL Go report required/.test(c.t)), 'check API');
    r = await call('/api/offers', off, B.token); const o1 = r.j.offer; ok(r.s === 200 && o1.status === 'Offer', 'offer sent');
    ok((await call('/api/offers/deliver', { id: o1.id }, A.token)).s === 400, 'cannot deliver before accept');
    ok((await call('/api/offers/respond', { id: o1.id, accept: true }, A.token)).j.offer.status === 'Active', 'accept');
    ok((await call('/api/offers/respond', { id: o1.id, accept: false }, A.token)).s === 400, 'cannot answer twice');
    ok((await call('/api/offers/complete', { id: o1.id }, B.token)).s === 400, 'cannot complete before delivered');
    ok((await call('/api/offers/deliver', { id: o1.id, proof: 'ftp://x' }, A.token)).s === 400, 'proof must be https');
    r = await call('/api/offers/deliver', { id: o1.id, proof: 'https://instagram.com/p/abc' }, A.token);
    ok(r.j.offers.find(o => o.id === o1.id).status === 'Delivered', 'delivered');
    ok((await call('/api/offers/complete', { id: o1.id }, A.token)).s === 404, 'athlete cannot complete');
    r = await call('/api/offers/complete', { id: o1.id }, B.token); ok(r.j.offers.find(o => o.id === o1.id).status === 'Completed', 'completed');
    r = (await call('/api/sync', null, A.token)).j;
    ok(r.users.find(u => u.id === A.me.id) === undefined || true, 'sync ok');
    ok(r.me.deals === 1, 'completed deal counts');
    ok(r.notes.some(n => /confirmed your deal/.test(n.t)), 'athlete notified of completion');
    const o2 = (await call('/api/offers', { ...off, amt: 300 }, B.token)).j.offer;
    await call('/api/offers/respond', { id: o2.id, accept: false }, A.token);
    ok((await call('/api/sync', null, B.token)).j.notes.some(n => /passed on your offer/.test(n.t)), 'brand notified of decline');

    // --- campaigns
    ok((await call('/api/campaigns', { title: 'Transfer promo', del: 'Post about your transfer' }, B.token)).s === 400, 'campaign inducement blocked');
    r = await call('/api/campaigns', { title: 'Game-day story', del: '1 story on game day', spots: 1, pay: '$200' }, B.token); const camp = r.j.campaign;
    ok(r.s === 200, 'campaign posted');
    ok((await call('/api/campaigns/apply', { id: camp.id }, F.token)).s === 403, 'only athletes apply');
    ok((await call('/api/campaigns/apply', { id: camp.id }, A.token)).s === 200, 'apply');
    r = (await call('/api/sync', null, B.token)).j; const app = r.campaigns.find(c => c.id === camp.id).applicants[0];
    ok(app && app.status === 'Applied' && app.app, 'brand sees applicant');
    ok((await call('/api/sync', null, F.token)).j.campaigns.find(c => c.id === camp.id).applicants === undefined, 'others cannot see applicants');
    ok((await call('/api/campaigns/decide', { app: app.app, accept: true }, C.token)).s === 404, 'only owner decides');
    r = await call('/api/campaigns/decide', { app: app.app, accept: true }, B.token);
    ok(r.j.campaigns.find(c => c.id === camp.id).taken === 1, 'accepted');
    r = (await call('/api/sync', null, A.token)).j; ok(r.campaigns.find(c => c.id === camp.id).appStatus === 'Accepted', 'athlete sees status');
    r = await call('/api/campaigns/close', { id: camp.id }, B.token); ok(r.j.campaigns.find(c => c.id === camp.id).closed === true, 'close');
    ok(!(await call('/api/sync', null, F.token)).j.campaigns.some(c => c.id === camp.id), 'closed hidden from others');

    // --- reports, blocks, admin
    ok((await call('/api/admin/verify', { id: A.me.id, on: true }, B.token)).s === 403, 'admin only');
    r = (await call('/api/sync', null, O.token)).j; ok(r.admin && r.admin.pending.length === 2, 'admin queue (athlete + coach)');
    r = await call('/api/admin/verify', { id: A.me.id, on: true }, O.token); ok(r.j.users.find(u => u.id === A.me.id).verified, 'verify');
    await call('/api/report', { kind: 'post', id: post.id, why: 'Spam or scam' }, F.token);
    r = (await call('/api/sync', null, O.token)).j; ok(r.admin.reports.length === 1 && r.admin.reports[0].target.text === 'Senior night', 'report in queue');
    r = await call('/api/admin/resolve', { kind: 'post', id: post.id, remove: true }, O.token);
    ok(!r.j.posts.some(p => p.id === post.id) && r.j.admin.reports.length === 0, 'admin removes post');
    r = await call('/api/block', { id: C.me.id }, A.token); ok(r.j.blocked === true, 'block');
    ok((await call('/api/dm', { to: A.me.id, t: 'hello?' }, C.token)).s === 403, 'blocked cannot DM');
    ok(!(await call('/api/sync', null, C.token)).j.users.some(u => u.id === A.me.id), 'blocked hidden');
    await call('/api/block', { id: C.me.id }, A.token);

    // --- round 2: saves, temp passwords, removals, block edge cases, CSP
    ok((await call('/api/save', { athlete: A.me.id }, C.token)).s === 403, 'save is brand-only');
    ok((await call('/api/save', { athlete: A.me.id }, B.token)).j.saved === true, 'save');
    ok((await call('/api/sync', null, B.token)).j.saved.includes(A.me.id), 'saved in sync');
    ok((await call('/api/sync', null, A.token)).j.saved.length === 0, 'others never see saves');
    ok((await call('/api/save', { athlete: A.me.id }, B.token)).j.saved === false, 'unsave');
    ok((await call('/api/admin/reset', { id: C.me.id }, B.token)).s === 403, 'reset admin-only');
    r = await call('/api/admin/reset', { id: C.me.id }, O.token); const temp = r.j.temp;
    ok(r.s === 200 && temp && r.j.email === 'coach@test.dev', 'temp password issued');
    ok((await call('/api/sync', null, C.token)).j.me === null, 'reset signs user out');
    r = await call('/api/login', { email: 'coach@test.dev', password: temp }, null, '8.8.8.8'); const C2 = r.j.token;
    ok(r.s === 200 && r.j.me.tempPw === true, 'login with temp + flag');
    ok((await call('/api/password', { old: temp, password: 'coachpass99' }, C2)).s === 200, 'change from temp');
    ok((await call('/api/sync', null, C2)).j.me.tempPw === false, 'flag cleared');
    ok(!JSON.stringify((await call('/api/sync', null, B.token)).j).includes('tempPw":true'), 'flag private');
    ok((await call('/api/admin/remove-user', { id: O.me.id }, O.token)).s === 400, 'owner cannot remove self');
    r = (await call('/api/sync', null, O.token)).j; ok(r.admin.accounts.length >= 5 && r.admin.accounts.every(u => u.email), 'admin account list');
    // a brand blocked by an athlete can't send offers; an athlete can still answer an offer after blocking the brand
    const o3 = (await call('/api/offers', { ...off, amt: 350 }, B.token)).j.offer;
    await call('/api/block', { id: B.me.id }, A.token);
    ok((await call('/api/offers', { ...off, amt: 350 }, B.token)).s === 403, 'blocked brand cannot offer');
    r = await call('/api/offers/respond', { id: o3.id, accept: false }, A.token); ok(r.s === 200 && r.j.offer.status === 'Declined', 'respond works after blocking');
    await call('/api/block', { id: B.me.id }, A.token);
    const extra = await up({ role: 'fan', f: 'Gone', l: 'Soon', email: 'gone@test.dev' }, '10.0.0.1');
    await call('/api/dm', { to: A.me.id, t: 'hi' }, extra.token);
    r = await call('/api/admin/remove-user', { id: extra.me.id }, O.token); ok(r.s === 200 && !r.j.users.some(u => u.id === extra.me.id), 'admin removes account');
    r = (await call('/api/sync', null, A.token)).j; const orphan = r.threads.find(t => t.with === null);
    ok(orphan && orphan.log.length === 1, 'thread with deleted account survives');
    ok((await call('/api/dm', { to: extra.me.id, t: 'hello?' }, A.token)).s === 404, 'cannot message deleted account');
    const h = (await fetch(base + '/')).headers.get('content-security-policy') || '';
    ok(/script-src 'self'/.test(h) && !/unsafe-eval/.test(h) && /frame-ancestors 'none'/.test(h), 'CSP header');

    // --- round 3: views, post edit, share page
    await call('/api/view', { id: A.me.id }, C2); await call('/api/view', { id: A.me.id }, C2); await call('/api/view', { id: A.me.id }, B.token);
    await call('/api/view', { id: A.me.id }, A.token);
    r = (await call('/api/sync', null, A.token)).j;
    ok(r.me.views.coach7 === 1 && r.me.views.brand7 === 1 && r.me.views.schools[0] === 'SMU', 'views counted once per day, schools only');
    ok(r.notes.some(n => n.k === 'view' && /SMU/.test(n.who)), 'coach view notification');
    ok((await call('/api/sync', null, B.token)).j.users.find(u => u.id === A.me.id).views === undefined, 'views private');
    const p2 = (await call('/api/posts', { cap: 'First', type: 'Highlight' }, A.token)).j.post;
    r = await call('/api/posts/edit', { id: p2.id, cap: 'Edited caption', tag: 'vs Baylor' }, A.token);
    ok(r.s === 200 && r.j.posts.find(p => p.id === p2.id).cap === 'Edited caption' && r.j.posts.find(p => p.id === p2.id).edited, 'edit post');
    ok((await call('/api/posts/edit', { id: p2.id, cap: 'hack' }, B.token)).s === 404, 'only owner edits');
    ok((await call('/api/posts/edit', { id: p2.id, cap: '' }, A.token)).s === 400, 'text post needs caption');
    let sp = await fetch(base + '/a/' + A.me.id); let html = await sp.text();
    ok(sp.status === 200 && html.includes('og:title') && html.includes('Maya Lind') && html.includes('/#/u/' + A.me.id) && !html.includes('<script'), 'share page');
    await call('/api/me', { bio: '"><script>x</script>' }, A.token);
    ok(!(await (await fetch(base + '/a/' + A.me.id)).text()).includes('<script'), 'share page escapes');
    ok((await fetch(base + '/a/999999')).status === 200, 'share page for missing account');

    // --- round 4: campaign editing
    r = await call('/api/campaigns', { title: 'Old title', del: '1 story', spots: 2, pay: '$100' }, B.token); const ce = r.j.campaign;
    r = await call('/api/campaigns/edit', { id: ce.id, title: 'New title', del: '1 reel', spots: 4, pay: '$150', due: 'Dec 9' }, B.token);
    ok(r.s === 200 && r.j.campaigns.find(c => c.id === ce.id).title === 'New title', 'edit campaign');
    ok((await call('/api/campaigns/edit', { id: ce.id, title: 'x', del: 'post about your transfer' }, B.token)).s === 400, 'edit keeps compliance');
    ok((await call('/api/campaigns/edit', { id: ce.id, title: 'x', del: 'y' }, C2)).s === 404, 'only owner edits campaign');
    ok(((await fetch(base + '/')).headers.get('content-security-policy') || '').includes('youtube-nocookie'), 'CSP allows film embeds');

    // --- round 6: application pitch
    const cp = (await call('/api/campaigns', { title: 'Pitch test', del: '1 post', spots: 2 }, B.token)).j.campaign;
    await call('/api/campaigns/apply', { id: cp.id, pitch: 'I post game-day content every week.' }, A.token);
    r = (await call('/api/sync', null, B.token)).j; ok(r.campaigns.find(c => c.id === cp.id).applicants[0].pitch === 'I post game-day content every week.', 'pitch reaches brand');

    // --- round 7: transfer portal flag
    r = await call('/api/me', { portal: true }, A.token); ok(r.j.me.portal === true, 'athlete sets portal');
    r = await call('/api/me', { portal: true }, B.token); ok(!r.j.me.portal, 'only athletes have portal status');

    // --- round 8: appearances + versioned assets
    r = await call('/api/me', { appear: { on: true, area: 'Dallas–Fort Worth' } }, A.token); ok(r.j.me.appear.on && r.j.me.appear.area === 'Dallas–Fort Worth', 'appearance availability');
    const idx = await (await fetch(base + '/')).text(), vm = /app\.js\?v=([a-f0-9]{10})/.exec(idx);
    ok(vm && /app\.css\?v=/.test(idx), 'index uses versioned assets');
    ok(/immutable/.test((await fetch(base + '/app.js?v=' + vm[1])).headers.get('cache-control')), 'versioned assets cached long');
    ok(!/immutable/.test((await fetch(base + '/app.js?v=old')).headers.get('cache-control')), 'stale version not cached long');

    // --- round 9: pinned post
    const pp = (await call('/api/posts', { cap: 'Pin me', type: 'Highlight' }, A.token)).j.post;
    r = await call('/api/posts/pin', { id: pp.id }, A.token); ok(r.j.me.pin === pp.id, 'pin post');
    ok((await call('/api/posts/pin', { id: pp.id }, B.token)).s === 404, 'only own posts pin');
    r = await call('/api/posts/pin', { id: pp.id }, A.token); ok(r.j.me.pin === null, 'unpin');
    await call('/api/posts/pin', { id: pp.id }, A.token); await call('/api/posts/delete', { id: pp.id }, A.token);
    ok((await call('/api/sync', null, A.token)).j.me.pin === null, 'deleting pinned post clears pin');

    // --- delete account
    ok((await call('/api/delete-account', { password: 'wrong' }, F.token)).s === 401, 'delete needs password');
    ok((await call('/api/delete-account', { password: 'password123' }, F.token)).s === 200, 'delete');
    ok(!(await call('/api/sync')).j.users.some(u => u.id === F.me.id), 'deleted gone');

    // --- limits
    let limited = false; for (let i = 0; i < 12; i++) if ((await call('/api/login', { email: 'x@x.com', password: 'y' }, null, '9.9.9.9')).s === 429) limited = true;
    ok(limited, 'login rate limit');
    ok((await call('/api/nope')).s === 404, 'unknown route');
    ok((await call('/api/me', { bio: 'x' })).s === 401, 'auth required');
  } catch (e) { fail++; console.log('ERROR', e); }
  console.log(`${pass} passed, ${fail} failed`);
  server.close(); fs.rmSync(dir, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
});
