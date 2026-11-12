// Opens every pop-up window and checks it fits: nothing outside the sheet, no sideways scroll, no displaced labels.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs');
const [base, out, W] = process.argv.slice(2); let n = 0; fs.mkdirSync(out, { recursive: true });
(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const errs = [];
  const page = async () => { const p = await (await br.newContext({ viewport: { width: +W, height: 844 } })).newPage(); await p.route(/fonts\./, r => r.abort()); p.on('pageerror', e => errs.push('pageerror ' + e.message)); return p; };
  const login = async email => { const p = await page(); await p.goto(base + '/#/'); await p.click('.top [data-act=signin]'); await p.fill('[data-form=login] [name=email]', email); await p.fill('[data-form=login] [name=password]', 'password123'); await p.click('[data-form=login] button.pri'); await p.waitForSelector('#main'); await p.waitForTimeout(500); return p; };
  const api = (p, path, body) => p.evaluate(async ([path, body]) => { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + localStorage.getItem('nl.token') }, body: JSON.stringify(body) }); return r.json(); }, [path, body]);
  let step = '';
  const check = async (p, name) => {
    await p.waitForSelector('.sheet'); await p.waitForTimeout(250); await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    const r = await p.evaluate(() => { const s = document.querySelector('.sheet'), b = s.getBoundingClientRect(), out = [];
      s.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea, button, img, .chip').forEach(e => { if (!e.offsetParent) return; const a = e.getBoundingClientRect(); if (a.left < b.left - 1 || a.right > b.right + 1) out.push('outside: ' + (e.name || e.textContent || e.tagName).trim().slice(0, 24)); });
      const sb = s.querySelector('.sheet-b'); if (sb && sb.scrollWidth > sb.clientWidth + 1) out.push('sideways scroll in sheet');
      if (b.right > innerWidth + 1 || b.left < -1) out.push('sheet wider than screen');
      if ([...s.querySelectorAll('label.field')].some(l => getComputedStyle(l).position !== 'static')) out.push('displaced labels');
      return out; });
    r.forEach(x => errs.push(`${name}: ${x}`));
    await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  };
  const v = await page(); await v.goto(base + '/#/'); await v.click('.top [data-act=join]'); await check(v, 'join');
  await v.click('.top [data-act=signin]'); await check(v, 'login');
  const b = await login('brand@e2e.dev'), a = await login('maya@e2e.dev'), c = await login('coach@e2e.dev'), o = await login('owner@e2e.dev');
  const aid = (await api(a, '/api/me', {})).me.id;
  // fresh offer + campaign so deal/apply sheets have something to open
  const off = (await api(b, '/api/offers', { to: aid, cat: 'Food & drink', del: 1, amt: 300, what: 'Sheet test reel', due: 'Dec 9' })).offer;
  await api(a, '/api/offers/respond', { id: off.id, accept: true });
  await api(b, '/api/campaigns', { title: 'Sheet test campaign', del: '1 story', spots: 2, pay: '$100' });
  await a.reload(); await a.waitForSelector('#main');
  await a.goto(base + '/#/home'); await a.click('.ph [data-act=compose]'); await check(a, 'new-post');
  await a.click('.post [data-act=postmenu]'); await a.click('.pop button.mi:has-text("Edit caption")'); await check(a, 'edit-post');
  await a.goto(base + '/#/u/' + aid); await a.click('[data-act=storycard]'); await check(a, 'story-card');
  await a.goto(base + '/#/deals'); await a.click('[data-act=tab][data-v=active]'); await a.click('[data-act=deliver]'); await check(a, 'deliver');
  await a.click('[data-act=disclose]'); await check(a, 'disclose');
  await a.click('[data-act=tab][data-v=opps]'); await a.click('[data-act=apply]'); await check(a, 'apply');
  await a.goto(base + '/#/edit'); await a.click('[data-act=avadjust]'); await a.waitForSelector('.crop canvas'); await check(a, 'photo-editor');
  await a.goto(base + '/#/settings'); await a.click('[data-act=delacct]'); await check(a, 'delete-account');
  await b.goto(base + '/#/u/' + aid); await b.click('[data-act=offer]'); await b.fill('[data-form=offer] [name=amt]', '400'); await b.waitForTimeout(800); await check(b, 'offer');
  await b.goto(base + '/#/campaigns'); await b.click('.ph [data-act=newcamp]'); await check(b, 'campaign-new');
  await b.click('a.card.deal'); await b.click('[data-act=editcamp]'); await check(b, 'campaign-edit');
  await c.goto(base + '/#/u/' + aid); await c.click('[data-act=boardadd]'); await check(c, 'board-note');
  await c.click('[data-act=profmenu]'); await c.click('.pop button.mi:has-text("Report")'); await check(c, 'report');
  await o.goto(base + '/#/admin'); await o.click('[data-act=tab][data-v=accounts]'); await o.fill('#acctq', 'coach@'); await o.waitForTimeout(200); await o.click('#acctlist [data-act=acctmenu]'); await o.click('.pop button.mi:has-text("temporary")'); await check(o, 'temp-password-confirm');
  await br.close(); console.log(errs.join('\n') || 'SHEETS OK', n);
})().catch(e => { console.log('CRASH after', n, 'checks:', e.message.split('\n').slice(0, 3).join(' ')); process.exit(1); });
