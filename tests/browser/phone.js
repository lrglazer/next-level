const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const base = process.argv[2], out = process.argv[3];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const errs = [];
  const login = async (email, pw) => { const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage(); await p.route(/fonts\./, r => r.abort());
    p.on('pageerror', e => errs.push(e.message)); await p.goto(base + '/#/'); await p.click('.top [data-act=signin]'); await p.fill('[data-form=login] [name=email]', email); await p.fill('[data-form=login] [name=password]', pw); await p.click('[data-form=login] button.pri'); await p.waitForSelector('.tabbar'); return p; };
  const shots = [];
  const a = await login('maya@e2e.dev', 'password123');
  await a.goto(base + '/#/deals'); await a.waitForTimeout(300); await a.screenshot({ path: out + '/p1.png' });
  const br = await login('brand@e2e.dev', 'password123');
  await br.goto(base + '/#/athletes'); await br.waitForSelector('.acard'); await br.click('.acard'); await br.click('[data-act=cmpadd]'); await br.goto(base + '/#/compare'); await br.waitForSelector('table.cmp'); await br.screenshot({ path: out + '/p2.png' });
  const v = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await v.route(/fonts\./, r => r.abort()); await v.goto(base + '/#/'); await v.locator('.how').scrollIntoViewIfNeeded(); await v.screenshot({ path: out + '/p3.png' });
  const vd = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await vd.route(/fonts\./, r => r.abort()); await vd.goto(base + '/#/'); await vd.locator('.how').scrollIntoViewIfNeeded(); await vd.screenshot({ path: out + '/p4.png' });
  for (const p of [a, br, v]) { const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) errs.push('h-scroll ' + o); }
  await b.close(); console.log(errs.join('\n') || 'PHONE OK');
})();
