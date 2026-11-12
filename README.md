# Next Level

Recruiting and compliant NIL deals for college athletes, coaches, brands and fans.

## What's in here

- `server.js`: the whole backend. Plain Node 20+, no dependencies.
- `lib/db.js`: accounts, sessions and collections saved as JSON on disk; photos saved in `DATA_DIR/media`.
- `lib/rules.js`: NIL compliance checks that run on the server (banned categories, pay-for-play, recruiting inducements, fair market value, NIL Go reporting at $600+).
- `public/index.html`, `public/app.css`, `public/app.js`: the app. No build step.
- `public/terms.html`, `public/privacy.html`: legal pages (have a sports lawyer review before payments launch).

## Who sees what

- **Visitors:** landing page, athlete directory and profiles.
- **Athletes:** feed, profile (stats, measurables, academics, film, socials, awards, NIL rate card), deals (offers, in progress, completed, campaigns, applications), messages.
- **Coaches:** feed, athlete search with filters, a private recruiting board with notes, messages.
- **Brands:** dashboard, athlete search, campaigns with applicant review, deals from offer to complete, messages.
- **Owner:** accounts whose email is in `ADMIN_EMAILS` get the Admin page (verify athletes and coaches, review reports).

## Run and test

```
node server.js          # http://localhost:3000
node test.js            # full API test on a throwaway data folder
```

## Deploy

On render.com: New > Blueprint, pick this repo (see `render.yaml`). The disk keeps accounts and photos between restarts.
Set `ADMIN_EMAILS` (comma-separated) in the service's Environment to turn on the Admin page for the owner.

## Before real money moves

Have a sports lawyer review `lib/rules.js`, `public/terms.html` and `public/privacy.html`, then add Stripe Connect to hold brand payments until a post goes live.

## Testing

`node test.js` runs the API tests. Browser checks live in `tests/browser` (see its README).
