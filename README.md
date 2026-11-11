# Next Level

Recruiting, a college-athlete Locker (posts, highlights, props, comments), DMs, and compliant NIL deals between brands and enrolled athletes.

- `server.js`: the whole backend, plain Node 20+, no dependencies.
- `lib/db.js`: accounts, sessions and collections saved as JSON on disk; photos saved in `DATA_DIR/media`.
- `lib/rules.js`: NIL compliance checks run on the server (banned categories, pay-for-play, recruiting inducements, fair market value, NIL Go reporting at $600+).
- `public/index.html`: the app. `public/live.js` connects it to the server.

Run locally: `node server.js`, then open http://localhost:3000. Test: start the server with `PORT=3999`, then `node test.js`.

Deploy: on render.com choose New > Blueprint and pick this repo (see `render.yaml`). The disk keeps accounts and photos between restarts.

Before real money moves: have a sports lawyer review `lib/rules.js` and the Terms, and add payments (Stripe Connect) for holding brand payments until a post goes live.
