const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs');
const [base, out, W] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const roles = [['maya@e2e.dev', 'a', ['home', 'athletes', 'deals', 'messages', 'notifications', 'settings', 'edit', 'u/ME']], ['brand@e2e.dev', 'b', ['home', 'athletes', 'campaigns', 'deals', 'messages']], ['coach@e2e.dev', 'c', ['home', 'athletes', 'board', 'messages']], ['owner@e2e.dev', 'o', ['admin']]];
(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const errs = []; let n = 0;
  for (const [email, tag, routes] of roles) {
    const p = await (await br.newContext({ viewport: { width: +W, height: 844 } })).newPage(); await p.route(/fonts\./, r => r.abort()); p.on('pageerror', e => errs.push(email + ' ' + e.message));
    await p.goto(base + '/#/'); await p.click('.top [data-act=signin]'); await p.fill('[data-form=login] [name=email]', email); await p.fill('[data-form=login] [name=password]', 'password123'); await p.click('[data-form=login] button.pri'); await p.waitForTimeout(800);
    const me = await p.evaluate(() => (document.querySelector('a[href^="#/u/"]') || {}).getAttribute?.('href'));
    for (let r of routes) { if (r === 'u/ME') r = (me || '#/u/0').slice(2); await p.goto(base + '/#/' + r); await p.waitForTimeout(350); await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
      const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) errs.push(`${tag} #/${r} h-scroll ${o}`);
      const clip = await p.evaluate(() => [...document.querySelectorAll('.btn, .chip, .tag, .h1, .h2, .stat b')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible').map(e => e.textContent.trim().slice(0, 30)).slice(0, 5));
      if (clip.length) errs.push(`${tag} #/${r} clipped: ${clip.join(' | ')}`);
      const strays = await p.evaluate(() => [...document.querySelectorAll('#main input:not([type=hidden]):not([type=file]), #main select, #main textarea, #main .chip')].filter(e => e.offsetParent).filter(e => { const c = e.closest('.card, form, .filters, .tabs, .row, .stack'); if (!c) return false; const a = e.getBoundingClientRect(), b = c.getBoundingClientRect(); return a.top < b.top - 2 || a.bottom > b.bottom + 2 || a.left < b.left - 2 || a.right > b.right + 2; }).map(e => (e.name || e.textContent || e.tagName).trim().slice(0, 20)).slice(0, 5));
      if (strays.length) errs.push(`${tag} #/${r} controls outside their box: ${strays.join(' | ')}`);
      const abs = await p.evaluate(() => [...document.querySelectorAll('label.field')].filter(l => getComputedStyle(l).position !== 'static').length);
      if (abs) errs.push(`${tag} #/${r} ${abs} form labels not in normal flow`);
      await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${tag}-${r.replace(/\//g, '_')}.png`, fullPage: true }); }
  }
  await br.close(); console.log(errs.join('\n') || 'SWEEP OK', n);
})();
