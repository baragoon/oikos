---
name: public-pages
description: Rules for frontend pages and web components
paths:
  - oikos/public/pages/**/*.js
  - oikos/public/components/**/*.js
---

- **Pages** (`public/pages/*.js`) export an async `render(container, params)` function. No side effects on import — only the default `render` export may mutate state. Pages are invoked by `public/router.js`.
- **Components** (`public/components/*.js`) — one custom element per file, class name ends in `Element`, tag name uses the `oikos-` prefix (`<oikos-task-list>`). Register once per file with `customElements.define`.
- **UI text** — every string the user reads goes through `t('key')` from `public/i18n.js`. Never hardcode German, English, or any other language. Add the key to every locale file under `public/locales/`. `de` is the reference locale and must stay complete.
- **Dates and times** — `formatDate(value, opts)` and `formatTime(value, opts)` from `public/i18n.js`. Never call `toLocaleString`, `toISOString`, `Intl.DateTimeFormat` directly in pages or components.
- **No `innerHTML`** — not for user data, not for static SVG strings, not for templates. Use `document.createElement`, `document.createElementNS` (for SVG), `replaceChildren`, `appendChild`, `textContent`. The PostToolUse hook blocks violations on save.
- **API calls** — go through `apiFetch()` from `public/api.js`. It handles CSRF, session expiry, and error envelope. Never call `fetch()` directly from a page.
- **Navigation** — use `router.navigate(path)` from `public/router.js`. Never set `location.href` or `location.pathname` directly.
- **Styling** — reference tokens from `public/styles/tokens.css`. No raw hex, rgb(), rem, or px in component CSS — use `var(--token-name)`.
- **Icons** — use the self-hosted Lucide helper if one exists in the repo, otherwise `createElementNS('http://www.w3.org/2000/svg', ...)`. Never inline an SVG via `innerHTML`.
- **Lifecycle** — components must clean up listeners in `disconnectedCallback`. Debounce or throttle heavy handlers via `public/utils/ux.js`.
