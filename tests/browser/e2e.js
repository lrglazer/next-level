// Browser walkthrough of every role. Usage: node e2e.js <baseUrl> <shotDir>
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const photo = path.join(out, 'photo.png');
// a real-size image so resizing runs
const errors = [];
let step = 0;

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  async function ctx(w, h, name) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(`[${name}] pageerror: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|net::/.test(m.text())) errors.push(`[${name}] console: ${m.text()}`); });
    p.on('dialog', d => { errors.push(`[${name}] native dialog appeared: ${d.message()}`); d.dismiss(); });
    return p;
  }
  const shot = async (p, n) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, String(++step).padStart(2, '0') + '-' + n + '.png'), fullPage: false }); };
  const fill = async (p, sel, v) => p.fill(sel, v);
  async function signup(p, role, f) {
    await p.goto(base + '/#/'); await p.waitForSelector('.hero');
    await p.click(`.hero [data-role=${role}], .aud [data-role=${role}]`);
    await p.waitForSelector('[data-form=signup]');
    await p.check(`[data-form=signup] [name=role][value=${role}]`);
    for (const [k, v] of Object.entries(f)) {
      const el = p.locator(`[data-form=signup] [name=${k}]`);
      if (typeof v === 'boolean') { if (v) await el.check(); } else if (await el.evaluate(e => e.tagName) === 'SELECT') await el.selectOption(v); else await el.fill(v);
    }
    await p.check('[data-form=signup] [name=terms]');
    await p.click('[data-form=signup] button.pri');
    await p.waitForFunction(() => !document.querySelector('.scrim'), null, { timeout: 5000 });
  }
  const toastText = async p => (await p.locator('.toast').last().textContent().catch(() => ''));

  // ---------- landing
  const land = await ctx(1440, 900, 'landing');
  await land.goto(base + '/#/'); await land.waitForSelector('.hero'); await shot(land, 'landing-desktop');
  await land.locator('.rules').scrollIntoViewIfNeeded(); await shot(land, 'landing-rules');
  const landM = await ctx(390, 844, 'landing-m');
  await landM.goto(base + '/#/'); await landM.waitForSelector('.hero'); await shot(landM, 'landing-mobile');
  await landM.click('.top [data-act=join]'); await landM.waitForSelector('.sheet'); await shot(landM, 'join-sheet-mobile');

  // validation: no terms
  await landM.fill('[data-form=signup] [name=f]', 'Test');
  await landM.click('[data-form=signup] button.pri'); const e1 = await landM.locator('[data-form=signup] .err').textContent();
  if (!/last name|Agree/.test(e1)) errors.push('signup validation message missing: ' + e1);

  // ---------- athlete
  const ath = await ctx(1440, 900, 'athlete');
  await signup(ath, 'athlete', { f: 'Maya', l: 'Lindqvist', sch: 'UT Dallas', sp: 'Volleyball', yr: 'Jr', email: 'maya@e2e.dev', password: 'password123', adult: true });
  await ath.waitForSelector('[data-form=profile]'); await shot(ath, 'athlete-edit-start');
  await ath.setInputFiles('#avfile', photo); await ath.waitForSelector('.crop canvas');
  const cb = await ath.locator('.crop canvas').boundingBox(); await ath.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await ath.mouse.down(); await ath.mouse.move(cb.x + cb.width / 2 - 60, cb.y + cb.height / 2 + 20, { steps: 5 }); await ath.mouse.up();
  await ath.evaluate(() => { const r = document.querySelector('[data-zoom]'); r.value = 1.8; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await ath.click('.sheet [data-rot]'); await ath.click('.sheet [data-rot]'); await ath.click('.sheet [data-rot]'); await ath.click('.sheet [data-rot]');
  await shot(ath, 'photo-editor'); await ath.click('.sheet [data-save]'); await ath.waitForFunction(() => document.querySelector('.av.lg img'));
  await ath.click('[data-act=avadjust]'); await ath.waitForSelector('.crop canvas'); await ath.waitForTimeout(300);
  if (await ath.evaluate(() => { const c = document.querySelector('.crop canvas'); const d = c.getContext('2d').getImageData(300, 300, 1, 1).data; return d[0] + d[1] + d[2] === 0 && d[3] === 255 ? 'black' : ''; }) === 'black') errors.push('adjust opened a blank photo');
  await ath.keyboard.press('Escape');
  await ath.fill('[name=pos]', 'OH'); await ath.fill('[name=num]', '12'); await ath.selectOption('[name=st]', 'TX');
  await ath.fill('[name=bio]', 'Outside hitter. Two-time all-conference. Business major.');
  const rows = ath.locator('[data-pairs=stats] .pr');
  const stats = [['Kills', '312'], ['Hit %', '.287'], ['Aces', '41'], ['Digs', '198']];
  for (let i = 0; i < stats.length; i++) { if (i >= await rows.count()) await ath.click('[data-pairs=stats] [data-act=pairadd]'); await rows.nth(i).locator('input').nth(0).fill(stats[i][0]); await rows.nth(i).locator('input').nth(1).fill(stats[i][1]); }
  await ath.locator('[data-pairs=meas] .pr').nth(0).locator('input').nth(0).fill('Vertical');
  await ath.locator('[data-pairs=meas] .pr').nth(0).locator('input').nth(1).fill('30 in');
  await ath.fill('[name=gpa]', '3.8'); await ath.fill('[name=major]', 'Business'); await ath.fill('[name=hl]', 'https://youtu.be/dQw4w9WgXcQ');
  await ath.fill('[name=soc_ig]', '@maya.hits'); await ath.fill('[name=soc_igN]', '12400');
  await ath.fill('[name=awards]', 'All-Conference First Team (2025)\nAcademic All-District');
  await ath.click('[data-cats] [data-v="Food & drink"]').catch(() => {});
  await ath.check('[name=appear_on]'); await ath.fill('[name=appear_area]', 'Dallas–Fort Worth');
  await ath.click('.savebar button.pri'); await ath.waitForSelector('.prof'); await shot(ath, 'athlete-profile');
  if (!(await ath.locator('.film iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]').count())) errors.push('film embed missing');
  await ath.emulateMedia({ media: 'print' }); await ath.screenshot({ path: path.join(out, 'print-onepager.png'), fullPage: true }); await ath.emulateMedia({ media: 'screen' });
  // new post
  await ath.click('[data-act=compose]'); await ath.waitForSelector('[data-form=post]');
  await ath.setInputFiles('#pfile', photo); await ath.waitForSelector('.preview img');
  await ath.selectOption('[data-form=post] [name=type]', 'Game day'); await ath.fill('[data-form=post] [name=tag]', 'vs. SMU');
  await ath.fill('[data-form=post] [name=cap]', 'Senior night. Thank you all.'); await shot(ath, 'composer');
  await ath.click('[data-act=sendpost]'); await ath.waitForFunction(() => !document.querySelector('.scrim'));
  await ath.goto(base + '/#/home'); await ath.waitForSelector('.post'); await shot(ath, 'athlete-home');
  await ath.click('.post [data-act=postmenu]'); await ath.click('.pop button.mi:has-text("Pin to profile")'); await ath.waitForFunction(() => /Pinned/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  const myHref = await ath.evaluate(() => document.querySelector('.tabbar a:last-child, .side a[href^="#/u/"]').getAttribute('href'));
  await ath.goto(base + '/' + myHref); await ath.waitForSelector('.sec-h:has-text("Pinned") + .post');
  await ath.click('[data-act=storycard]'); await ath.waitForSelector('.sheet img[alt="Your athlete card image"]');
  const [sdl] = await Promise.all([ath.waitForEvent('download'), ath.click('.sheet a[download]')]); const sp = await sdl.path(); const sb = require('fs').readFileSync(sp);
  if (sb.slice(1, 4).toString() !== 'PNG' || sb.readUInt32BE(16) !== 1080 || sb.readUInt32BE(20) !== 1920) errors.push('story card not a 1080x1920 PNG');
  require('fs').copyFileSync(sp, path.join(out, 'story-card.png')); await ath.click('.sheet [data-act=close]');

  // ---------- brand
  const br = await ctx(1440, 900, 'brand');
  await signup(br, 'brand', { f: 'Bo', l: 'Reyes', brandName: 'Peak Bars', cat: 'Food & drink', email: 'brand@e2e.dev', password: 'password123' });
  await br.waitForSelector('.stats4'); await shot(br, 'brand-dashboard');
  await br.goto(base + '/#/athletes'); await br.waitForSelector('.acard'); await shot(br, 'brand-search');
  await br.selectOption('[data-form=filters] [name=sp]', 'Golf'); await br.waitForSelector('.empty');
  await br.selectOption('[data-form=filters] [name=sp]', 'Volleyball'); await br.waitForSelector('.acard');
  await br.click('.acard'); await br.waitForSelector('.prof'); await shot(br, 'brand-views-athlete');
  await br.click('[data-act=offer]'); await br.waitForSelector('[data-form=offer]');
  await br.fill('[data-form=offer] [name=what]', '1 reel with our new protein bar');
  await br.selectOption('[data-form=offer] [name=del]', '2'); if (!(await br.locator('[data-appwarn]').isHidden())) errors.push('appearance warning shown for available athlete');
  await br.selectOption('[data-form=offer] [name=del]', '1');
  await br.fill('[data-form=offer] [name=amt]', '5000'); await br.waitForFunction(() => /Fix/.test(document.querySelector('#ckstate').textContent), null, { timeout: 4000 });
  await shot(br, 'offer-fails-fmv');
  if (!(await br.locator('[data-act=sendoffer]').isDisabled())) errors.push('send not disabled on failing offer');
  await br.fill('[data-form=offer] [name=amt]', '450'); await br.fill('[data-form=offer] [name=due]', 'Dec 5');
  await br.waitForFunction(() => /All checks pass/.test(document.querySelector('#ckstate').textContent), null, { timeout: 4000 });
  await shot(br, 'offer-passes');
  await br.click('[data-act=sendoffer]'); await br.waitForFunction(() => !document.querySelector('.scrim'));
  // campaign
  await br.goto(base + '/#/campaigns'); await br.waitForSelector('.empty'); await shot(br, 'campaigns-empty');
  await br.click('.ph [data-act=newcamp]'); await br.waitForSelector('[data-form=camp]');
  await br.fill('[data-form=camp] [name=title]', 'Game-day story'); await br.fill('[data-form=camp] [name=del]', '1 Instagram story on game day with our bar, tag @peakbars');
  await br.fill('[data-form=camp] [name=need]', 'Any sport · Texas schools'); await br.fill('[data-form=camp] [name=pay]', '$200 per athlete'); await br.fill('[data-form=camp] [name=due]', 'Dec 1');
  await br.click('[data-act=sendcamp]'); await br.waitForSelector('a.card.deal'); await shot(br, 'campaigns-list');

  // ---------- athlete: deals
  await ath.goto(base + '/#/deals'); await ath.waitForSelector('.deal'); await shot(ath, 'athlete-deals-offer');
  await ath.click('.deal [data-act=respond][data-ok="1"]'); await ath.waitForSelector('.sheet [data-yes]'); await shot(ath, 'accept-confirm');
  await ath.click('.sheet [data-yes]'); await ath.waitForFunction(() => /accepted/i.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  await ath.click('[data-act=tab][data-v=active]'); await ath.waitForSelector('[data-act=deliver]'); await shot(ath, 'athlete-deal-active');
  const [dl] = await Promise.all([ath.waitForEvent('download'), ath.click('[data-act=csvdeals]')]); const csvp = await dl.path(); const csvt = require('fs').readFileSync(csvp, 'utf8');
  if (!/Peak Bars/.test(csvt) || !/Amount \(USD\)/.test(csvt)) errors.push('earnings CSV wrong: ' + csvt.slice(0, 120));
  await ath.click('[data-act=disclose]'); await ath.waitForSelector('[data-form=disc]');
  if (!/Peak Bars/.test(await ath.inputValue('[data-form=disc] textarea'))) errors.push('disclosure email missing brand');
  await ath.press('[data-form=disc] [name=to]', 'Enter'); if (!ath.url().endsWith('#/deals')) errors.push('form enter navigated away: ' + ath.url());
  await shot(ath, 'disclosure'); await ath.click('.sheet [data-act=close]');
  await ath.click('[data-act=deliver]'); await ath.fill('[data-form=deliver] [name=proof]', 'https://www.instagram.com/p/abc123'); await ath.click('[data-act=senddeliver]');
  await ath.waitForFunction(() => !document.querySelector('.scrim'));
  await ath.click('[data-act=tab][data-v=opps]'); await ath.waitForSelector('[data-act=apply]'); await ath.click('[data-act=apply]'); await ath.fill('[data-form=apply] [name=pitch]', 'I post game-day content every week.'); await ath.click('[data-act=sendapply]');
  await ath.waitForFunction(() => /Applied/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));

  // ---------- brand: confirm + review applicant
  await br.goto(base + '/#/home'); await br.reload(); await br.waitForSelector('.stats4'); await shot(br, 'brand-dashboard-active');
  await br.goto(base + '/#/deals'); await br.waitForSelector('[data-act=complete]'); await br.click('[data-act=complete]'); await br.click('.sheet [data-yes]');
  await br.waitForFunction(() => /complete/i.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  await br.goto(base + '/#/campaigns'); await br.click('a.card.deal'); await br.waitForSelector('[data-act=decide]'); await shot(br, 'campaign-applicants');
  if (!(await br.locator('.acard .pitch').count())) errors.push('pitch not shown to brand');
  await br.click('[data-act=decide][data-ok="1"]'); await br.waitForFunction(() => /Accepted/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  await br.click('[data-act=editcamp]'); await br.fill('[data-form=camp] [name=title]', 'Game-day story (Texas)'); await br.click('[data-act=sendcamp]');
  await br.waitForFunction(() => /Changes saved/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  if (!(await br.locator('h1', { hasText: 'Texas' }).count())) errors.push('campaign title not updated');
  await br.click('[data-act=tab][data-v=Accepted]'); await br.click('[data-act=offer][data-camp]'); await br.waitForSelector('[data-form=offer]');
  await br.waitForFunction(() => /All checks pass/.test(document.querySelector('#ckstate').textContent), null, { timeout: 4000 });
  if ((await br.inputValue('[data-form=offer] [name=amt]')) !== '200') errors.push('campaign pay not prefilled');
  await shot(br, 'offer-from-campaign'); await br.click('.sheet [data-act=close]');
  // shortlist
  await br.goto(base + '/#/athletes'); await br.click('.acard'); await br.click('[data-act=save]');
  await br.waitForFunction(() => /Saved to your list/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  await br.goto(base + '/#/athletes'); await br.click('[data-act=savedtab][data-v="1"]'); await br.waitForSelector('.acard'); await shot(br, 'brand-saved');
  await br.selectOption('[data-form=filters] [name=fol]', '50000'); await br.waitForSelector('#results .empty');
  await br.selectOption('[data-form=filters] [name=fol]', '');
  await br.goto(base + '/#/athletes'); await br.click('[data-act=savedtab][data-v=""]'); await br.click('.acard'); await br.click('[data-act=cmpadd]'); await br.waitForSelector('.cmptray');
  await br.click('.cmptray a'); await br.waitForSelector('table.cmp'); await shot(br, 'compare');

  // ---------- coach
  const co = await ctx(1440, 900, 'coach');
  await signup(co, 'coach', { f: 'Cam', l: 'Ortiz', sch: 'SMU', sp: 'Volleyball', title: 'Assistant coach', email: 'coach@e2e.dev', password: 'password123' });
  await co.waitForSelector('.acard'); await shot(co, 'coach-search');
  await co.click('.acard'); await co.waitForSelector('[data-act=boardadd]'); await co.click('[data-act=boardadd]');
  await co.fill('[data-form=board] [name=note]', 'Big arm. Watch vs. Baylor film.'); await co.click('[data-act=boardsave]');
  await co.waitForFunction(() => !document.querySelector('.scrim'));
  await co.goto(base + '/#/board'); await co.waitForSelector('.bcard'); await shot(co, 'coach-board');
  await co.selectOption('.bcard [data-act=stage]', 'Offered'); await co.waitForFunction(() => /Moved/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  // message athlete
  const athId = await co.evaluate(() => document.querySelector('.bcard a.who').getAttribute('href').split('/').pop());
  await co.goto(base + '/#/messages/new/' + athId); await co.waitForSelector('.cmp textarea');
  if (!(await co.locator('.conv .note.warn', { hasText: 'contact rules' }).count())) errors.push('coach contact warning missing');
  await co.fill('.cmp textarea', 'Hi Maya, we loved your senior night film. Are you open to a call this week?'); await co.press('.cmp textarea', 'Enter');
  await co.waitForSelector('.bub.me'); await shot(co, 'coach-message');
  if (await co.locator('.conv .ch [data-act=offer]').count()) errors.push('coach should not see Send offer in DMs');

  // ---------- athlete: inbox, request, notifications
  await ath.goto(base + '/#/messages'); await ath.reload(); await ath.waitForSelector('.msg'); await shot(ath, 'athlete-inbox');
  if (await ath.locator('[data-act=msgtab][data-v=req]').isEnabled()) { await ath.click('[data-act=msgtab][data-v=req]'); await ath.click('.th'); await ath.waitForSelector('.reqbar'); await shot(ath, 'request'); await ath.click('.reqbar [data-act=req][data-ok="1"]'); await ath.waitForSelector('.cmp textarea'); }
  await ath.fill('.cmp textarea', 'Thanks coach! Yes, Thursday works.'); await ath.press('.cmp textarea', 'Enter'); await ath.waitForSelector('.bub.me');
  await shot(ath, 'athlete-thread');
  await ath.goto(base + '/#/notifications'); await ath.waitForSelector('.nrow'); await shot(ath, 'notifications');

  // ---------- fan: feed, props, comment, report
  const fan = await ctx(1440, 900, 'fan');
  await signup(fan, 'fan', { f: 'Fay', l: 'Fan', email: 'fan@e2e.dev', password: 'password123' });
  await fan.goto(base + '/#/home'); await fan.waitForSelector('.post');
  await fan.click('.post [data-act=prop][data-k=goat]'); await fan.click('.post [data-act=cmts]');
  await fan.fill('.post [data-form=comment] [name=t]', 'Let’s go Maya!'); await fan.press('.post [data-form=comment] [name=t]', 'Enter');
  await fan.waitForSelector('.cmt'); await shot(fan, 'fan-feed');
  await fan.click('.post [data-act=postmenu]'); await fan.click('.pop .mi.bad'); await fan.click('[data-act=sendreport]');
  await fan.waitForFunction(() => /review/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));

  // ---------- admin (owner)
  const ad = await ctx(1440, 900, 'admin');
  await signup(ad, 'fan', { f: 'Leya', l: 'Glazer', email: 'owner@e2e.dev', password: 'password123' });
  await ad.goto(base + '/#/admin'); await ad.waitForSelector('[data-act=verify]'); await shot(ad, 'admin-verify');
  await ad.click('[data-act=verify]'); await ad.waitForFunction(() => /Verified/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  await ad.click('[data-act=tab][data-v=reports]'); await shot(ad, 'admin-reports');
  await ad.click('[data-act=tab][data-v=accounts]'); await ad.fill('#acctq', 'fan@'); await ad.waitForFunction(() => document.querySelectorAll('#acctlist .row').length === 1);
  await ad.click('#acctlist [data-act=acctmenu]'); await ad.click('.pop button.mi:not(.bad)'); await ad.click('.sheet [data-yes]');
  await ad.waitForSelector('.sheet input[readonly]'); const temp = await ad.inputValue('.sheet input[readonly]'); await shot(ad, 'admin-temp-password');
  await ad.click('.sheet [data-act=close]');
  const tp = await ctx(1440, 900, 'temp-user'); await tp.goto(base + '/#/'); await tp.click('.top [data-act=signin]');
  await tp.fill('[data-form=login] [name=email]', 'fan@e2e.dev'); await tp.fill('[data-form=login] [name=password]', temp); await tp.click('[data-form=login] button.pri');
  await tp.waitForSelector('.note.warn'); await shot(tp, 'temp-banner');
  await tp.goto(base + '/#/settings'); await tp.fill('[data-form=pw] [name=old]', temp); await tp.fill('[data-form=pw] [name=password]', 'brandnewpass1'); await tp.click('[data-form=pw] button.pri');
  await tp.waitForFunction(() => /Password changed/.test([...document.querySelectorAll('.toast')].map(t => t.textContent).join()));
  await tp.goto(base + '/#/home'); await tp.waitForSelector('.post'); if (await tp.locator('.note.warn').count()) errors.push('temp banner still shown after change');

  // ---------- phone screens
  const m = await ctx(390, 844, 'athlete-m');
  await m.goto(base + '/#/'); await m.click('.top [data-act=signin]'); await m.fill('[data-form=login] [name=email]', 'maya@e2e.dev'); await m.fill('[data-form=login] [name=password]', 'password123');
  await m.click('[data-form=login] button.pri'); await m.waitForSelector('.tabbar');
  for (const [r, n] of [['home', 'm-home'], ['athletes', 'm-explore'], ['deals', 'm-deals'], ['messages', 'm-messages']]) { await m.goto(base + '/#/' + r); await m.waitForTimeout(300); await shot(m, n); }
  await m.click('.th'); await m.waitForSelector('.cmp'); await shot(m, 'm-thread');
  const meId = await m.evaluate(() => document.querySelector('.tabbar a:last-child').getAttribute('href'));
  await m.goto(base + '/' + meId); await m.waitForSelector('.prof'); await shot(m, 'm-profile');
  await m.goto(base + '/#/edit'); await m.waitForSelector('[data-form=profile]'); await shot(m, 'm-edit');
  const bm = await ctx(390, 844, 'brand-m');
  await bm.goto(base + '/#/'); await bm.click('.top [data-act=signin]'); await bm.fill('[data-form=login] [name=email]', 'brand@e2e.dev'); await bm.fill('[data-form=login] [name=password]', 'password123');
  await bm.click('[data-form=login] button.pri'); await bm.waitForSelector('.tabbar'); await shot(bm, 'm-brand-dashboard');
  const cm = await ctx(390, 844, 'coach-m');
  await cm.goto(base + '/#/board'); await cm.waitForSelector('[data-form=login]'); await cm.fill('[data-form=login] [name=email]', 'coach@e2e.dev'); await cm.fill('[data-form=login] [name=password]', 'password123');
  await cm.click('[data-form=login] button.pri'); await cm.waitForSelector('.board'); await shot(cm, 'm-coach-board');
  // horizontal overflow check on every phone page
  for (const [p, r] of [[m, 'home'], [m, 'athletes'], [m, 'deals'], [m, 'messages'], [m, 'edit'], [m, 'settings'], [m, 'notifications'], [bm, 'home'], [bm, 'campaigns'], [bm, 'deals'], [landM, '']]) {
    await p.goto(base + '/#/' + r); await p.waitForTimeout(250);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) errors.push(`horizontal scroll on phone #/${r}: ${over}px`);
  }
  // signed-out visitor deep links
  const v = await ctx(1440, 900, 'visitor');
  await v.goto(base + '/#/u/' + athId); await v.waitForSelector('.prof'); await shot(v, 'visitor-profile');
  await v.click('[data-act=follow]'); await v.waitForSelector('[data-form=signup]');
  await v.goto(base + '/#/deals'); await v.waitForSelector('[data-form=login]:not([hidden])');
  await v.goto(base + '/#/u/' + athId); await v.waitForSelector('a.schl'); await v.click('a.schl'); await v.waitForSelector('.sch-hero'); await shot(v, 'program-page');
  if (!(await v.locator('.sch-hero h1', { hasText: 'UT Dallas' }).count())) errors.push('program page title wrong');
  await v.goto(base + '/#/athletes'); await v.fill('[data-form=filters] [name=q]', 'dallas'); await v.waitForSelector('#results a.chip'); 
  await v.goto(base + '/#/nonsense/route'); await v.waitForTimeout(200); await shot(v, 'visitor-404');

  await browser.close();
  console.log('STEPS', step); console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
})().catch(e => { console.log('E2E CRASH', e.message.split('\n').slice(0, 6).join('\n')); console.log(errors.join('\n')); process.exit(1); });
