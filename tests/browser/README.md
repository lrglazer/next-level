# Browser checks

Run against a throwaway server, never the live one:

```
DATA_DIR=/tmp/nl-e2e ADMIN_EMAILS=owner@e2e.dev PORT=3999 node server.js
```

Run `e2e.js` first (it creates the test accounts), restarting the server between scripts so the login rate limit resets:

- `e2e.js <base> <shots>`: every role through every feature
- `a11y.js <base>`: unlabeled buttons, inputs and images; missing page titles
- `phone.js <base> <shots>`: phone layouts, no sideways scrolling
- `sweep.js <base> <out> <width>`: every page per role; overflow, clipping, controls outside their box
- `sheets.js <base> <out> <width>`: every pop-up window, same checks

They use Playwright and Chrome from the dev machine's paths at the top of each file.
