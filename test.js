// End-to-end API test: node test.js (server must be running on PORT, default 3999)
const B = 'http://localhost:' + (process.env.PORT || 3999);
const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
async function call(path, body, token) {
  const r = await fetch(B + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body && JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.error), { status: r.status }); return j;
}
const expectFail = async (p, msg) => { try { await p; throw new Error('should have failed: ' + msg); } catch (e) { if (e.message.startsWith('should')) throw e; console.log('  ok refused:', msg, '→', e.message); } };
(async () => {
  const s = Date.now();
  const ath = await call('/api/signup', { role: 'athlete', f: 'Leya', l: 'Test', sch: 'Coastline U', sp: 'Golf', email: `a${s}@x.com`, password: 'password1', terms: true, adult: true });
  const brand = await call('/api/signup', { role: 'brand', f: 'Sam', l: 'Shop', brandName: 'Loam Coffee', cat: 'Local business', email: `b${s}@x.com`, password: 'password1', terms: true });
  await expectFail(call('/api/signup', { role: 'brand', f: 'X', l: 'Y', brandName: 'Bet', cat: 'Sports betting', email: `c${s}@x.com`, password: 'password1', terms: true }), 'betting brand');
  await expectFail(call('/api/signup', { role: 'athlete', f: 'X', l: 'Y', sch: 'U', email: `d${s}@x.com`, password: 'password1', terms: true }), 'athlete not confirmed 18+');
  const p = await call('/api/posts', { type: 'Highlight', cap: 'First swing', img: IMG, tag: 'W 3–1' }, ath.token);
  await expectFail(call('/api/posts', { cap: 'hi' }, brand.token), 'brand posting to Locker');
  await call('/api/props', { post: p.post.id, k: 'clutch' }, brand.token);
  await call('/api/props', { post: 1, k: 'goat' }, brand.token);
  await call('/api/comments', { post: p.post.id, t: 'Too clean' }, brand.token);
  await expectFail(call('/api/offers', { to: ath.me.id, cat: 'Alcohol', del: 1, amt: 300 }, brand.token), 'alcohol offer');
  await expectFail(call('/api/offers', { to: ath.me.id, cat: 'Local business', del: 1, amt: 300, note: 'if you commit to our school' }, brand.token), 'recruiting inducement');
  await expectFail(call('/api/offers', { to: ath.me.id, cat: 'Local business', del: 1, amt: 300, perf: true }, brand.token), 'pay for play');
  const o = await call('/api/offers', { to: ath.me.id, cat: 'Local business', del: 1, amt: 650, note: 'Love your page!' }, brand.token);
  let sy = await call('/api/sync', null, ath.token);
  console.log('athlete sees thread request:', sy.threads[0].request, '| offer status:', sy.offers[0].status, '| post props:', JSON.stringify(sy.posts[0].props), 'cm', sy.posts[0].cm, '| sample1 goat', sy.sample[1].props.goat);
  await call('/api/offers/respond', { id: o.offer.id, accept: true }, ath.token);
  await call('/api/dm', { to: brand.me.id, t: 'Thank you!' }, ath.token);
  sy = await call('/api/sync', null, brand.token);
  console.log('brand thread log:', sy.threads[0].log.map(m => m.by + ':' + (m.t || '') + (m.offer ? '[offer ' + m.offer.status + ']' : '')).join(' | '));
  const c = await call('/api/campaigns', { title: 'Latte Art Week', del: '1 reel', pay: '$200', spots: 3 }, brand.token);
  await call('/api/campaigns/apply', { id: c.campaign.id }, ath.token);
  sy = await call('/api/sync', null, brand.token);
  console.log('campaign applicants:', sy.campaigns[0].applicants.map(a => a.f));
  const img = await fetch(B + sy.posts[0].img); console.log('photo served:', img.status, img.headers.get('content-type'));
  await call('/api/block', { id: brand.me.id }, ath.token);
  sy = await call('/api/sync', null, ath.token); console.log('after block, athlete threads:', sy.threads.length);
  console.log('ALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
