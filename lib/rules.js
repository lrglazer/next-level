// NIL compliance checks, run on the server so a brand can't skip them by editing the page.
// Based on the House settlement rules (NIL Go reporting for deals of $600+, no pay-for-play or
// recruiting inducements) and Texas law (banned categories, school disclosure). This is product logic,
// not legal advice; have a sports lawyer review it before real money moves.
const BANNED = ['Alcohol', 'Tobacco & vape', 'Sports betting', 'Adult content', 'Cannabis', 'Firearms'];
const CATS = ['Apparel', 'Food & drink', 'Fitness', 'Beauty', 'Tech', 'Gaming', 'Local business', 'Auto', 'Education', 'Golf'];
const DELIVERABLES = ['1 story', '1 feed post or reel', 'In-person appearance'];
const INDUCEMENT = /\b(commit|committing|transfer|enroll|sign with|play for|attend|stay at|portal)\b/i;
const PERFORMANCE = /\b(per (touchdown|td|goal|win|point|kill|hit)|bonus (for|if)|if (you|we) win|each (touchdown|goal|win))\b/i;

function checkOffer(o, athlete) {
  const rate = (athlete.rate || [150, 500, 1000])[o.del] || 500;
  const text = `${o.what || ''} ${o.note || ''}`;
  return [
    { ok: !BANNED.includes(o.cat), t: 'Category allowed', d: BANNED.includes(o.cat) ? `${o.cat} is banned for college athletes under Texas law and most school policies.` : 'No restricted categories.' },
    { ok: !o.perf && !PERFORMANCE.test(text), t: 'Paid for real promotion', d: o.perf || PERFORMANCE.test(text) ? 'Pay tied to stats or wins is pay-for-play and is not allowed.' : 'Payment is for the deliverables themselves.' },
    { ok: !INDUCEMENT.test(text), t: 'No recruiting inducement', d: INDUCEMENT.test(text) ? 'Offers can’t mention committing, transferring or choosing a school.' : 'Nothing tied to school choice.' },
    { ok: o.amt <= rate * 2.5, t: 'Fair market value', d: o.amt > rate * 2.5 ? `Far above this athlete’s rate card ($${rate.toLocaleString()}); the clearinghouse would likely flag it.` : `In line with the athlete’s rate card ($${rate.toLocaleString()}).` },
    { ok: true, t: o.amt >= 600 ? 'NIL Go report required' : 'NIL Go report', d: o.amt >= 600 ? 'Deals of $600 or more must be reported to NIL Go. The athlete is reminded before signing.' : 'Under $600: no clearinghouse report needed.' },
    { ok: true, t: 'School disclosure', d: `Disclosed to ${athlete.sch || 'the athlete’s school'} compliance before the athlete signs.` }
  ];
}

// A small word list keeps the worst things out; reports and blocking handle the rest.
const SLURS = /\b(n[i1]gg(a|er)|f[a@]gg?ot|r[e3]tard(ed)?|k[i1]ke|sp[i1]c|ch[i1]nk|tr[a@]nny)\b/i;
const clean = s => !SLURS.test(String(s || ''));

module.exports = { BANNED, CATS, DELIVERABLES, checkOffer, clean };
