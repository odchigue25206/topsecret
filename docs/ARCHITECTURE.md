# Architecture

## Page contract
Every page's `<body>` carries data attributes that `main.js` reads:
| Attribute | Meaning |
|---|---|
| `data-root` | Relative path to the repo root (`""` for index, `"../"` for pages/) so shared links and images resolve |
| `data-page` | Which controller runs: `login`, `signup`, `feed`, `profile`, `vault` (other pages only get the nav) |
| `data-auth` | `required` redirects guests to login; `guest` redirects logged-in users to the feed |

Each page contains `<header id="nav">`, filled by `renderNav()`.

## main.js sections
1. **Storage** - `db.get/set/clear/dump` wrap localStorage with the `topsecret:` prefix. `posts()` filters out expired posts on every read.
2. **Security helpers** - `esc()` (XSS), `hashPassword()` (PBKDF2 via `crypto.subtle`), `newSalt()`, time formatting.
3. **Text formatting** - `fmt()` escapes text first, then converts `||x||` into redaction spans. A delegated click/keydown listener toggles them. `level()` computes clearance.
4. **Seed data** - demo agents and dispatches, created once.
5. **Shared UI** - `renderNav()`, `toast()`, `panic()` (also bound to Esc twice).
6. **Auth guard** - redirects based on `data-auth`.
7. **Page controllers** - one function per page; feed and profile share `postHTML()` and `bindPosts()`.

## Data model (localStorage keys)
- `users`: `[{ id, username, bio, salt, hash, created, demo? }]`
- `posts`: `[{ id, userId, text, ts, exp (ms timestamp or null), likes: [userId], comments: [{ userId, text, ts }] }]`
- `session`: current user id or `null`
- `seeded`: boolean

## Styling
`style.css` order: tokens (light + dark via `prefers-color-scheme`), base, nav, buttons/forms, cards, badge avatars (8 hue classes from the codename), posts, redactions, layout helpers, landing/stamp, utilities. Visible focus and reduced-motion support included. No inline styles, because the CSP forbids them.

## Adding a page
Copy a page from `pages/`, set the three body attributes, add a controller function and register it in the lookup at the bottom of `main.js`, then add a link in `renderNav()`.
