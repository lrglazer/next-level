// Visits every screen as each role and flags controls a screen reader couldn't name.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const base = process.argv[2];
const users = [['maya@e2e.dev', 'password123', ['home', 'athletes', 'deals', 'messages', 'notifications', 'settings', 'edit']],
  ['brand@e2e.dev', 'password123', ['home', 'athletes', 'campaigns', 'deals', 'messages', 'compare']],
  ['coach@e2e.dev', 'password123', ['home', 'athletes', 'board', 'messages']], ['owner@e2e.dev', 'password123', ['admin']]];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const issues = [];
  const check = async (p, where) => {
    const r = await p.evaluate(() => {
      const name = el => (el.getAttribute('aria-label') || el.textContent || el.title || (el.querySelector('img[alt]') || {}).alt || '').trim();
      const out = [];
      document.querySelectorAll('button, a[href]').forEach(el => { if (el.offsetParent !== null && !name(el)) out.push('unnamed ' + el.tagName + ' ' + (el.className || '') + ' ' + (el.dataset.act || '')); });
      document.querySelectorAll('input:not([type=hidden]), select, textarea').forEach(el => { if (el.offsetParent === null) return;
        if (!(el.closest('label') || el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.placeholder)) out.push('unlabeled ' + el.tagName + ' ' + el.name); });
      document.querySelectorAll('img').forEach(el => { if (!el.hasAttribute('alt')) out.push('img without alt ' + el.src.slice(-30)); });
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id); ids.filter((x, i) => ids.indexOf(x) !== i).forEach(x => out.push('duplicate id ' + x));
      if (!document.querySelector('h1')) out.push('no h1');
      return out;
    });
    r.forEach(x => issues.push(where + ': ' + x));
  };
  const v = await (await b.newContext()).newPage(); await v.route(/fonts\./, r => r.abort());
  await v.goto(base + '/#/'); await v.waitForSelector('.hero'); await check(v, 'landing'); await v.goto(base + '/#/athletes'); await v.waitForTimeout(300); await check(v, 'visitor athletes');
  for (const [email, pw, routes] of users) {
    const p = await (await b.newContext()).newPage(); await p.route(/fonts\./, r => r.abort());
    await p.goto(base + '/#/'); await p.click('.top [data-act=signin]'); await p.fill('[data-form=login] [name=email]', email); await p.fill('[data-form=login] [name=password]', pw);
    await p.click('[data-form=login] button.pri'); await p.waitForSelector('.side');
    for (const r of routes) { await p.goto(base + '/#/' + r); await p.waitForTimeout(300); await check(p, email.split('@')[0] + ' #/' + r); }
    const prof = await p.evaluate(() => (document.querySelector('.acard') || {}).getAttribute?.('href'));
    await p.goto(base + '/#/athletes'); await p.waitForTimeout(200); const h = await p.evaluate(() => document.querySelector('.acard')?.getAttribute('href'));
    if (h) { await p.goto(base + '/' + h); await p.waitForTimeout(300); await check(p, email.split('@')[0] + ' profile'); }
  }
  await b.close(); console.log(issues.length ? [...new Set(issues)].join('\n') : 'A11Y CLEAN');
})();
