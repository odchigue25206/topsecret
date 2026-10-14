# Top Secret

A lightweight, privacy-first social media prototype with a classified-dossier theme. Pure HTML, CSS and vanilla JavaScript. No backend, database, API, build step or dependencies.

## Run it
Open `index.html` in a browser. Or serve the folder: `python3 -m http.server 8000` and visit http://localhost:8000.
(Password hashing uses the Web Crypto API, which needs `localhost` or `https`; some browsers also allow it from `file://`.)

## Try it
1. Join with a codename (no email needed); you land on Dispatches.
2. Send a dispatch. Pick a burn timer and wrap words in `||double bars||` to redact them. Tap a bar to reveal it.
3. Acknowledge, reply, or burn dispatches. Open your Dossier to edit your cover story.
4. Press **Esc twice** (or click Panic) to log out and jump to a blank page.
5. Three demo agents (`nightowl`, `paperfox`, `quietcrow`) are pre-loaded. They cannot be logged into.

## Structure
```
.
├── index.html            Landing page
├── pages/
│   ├── login.html        Log in
│   ├── signup.html       Get clearance (create account)
│   ├── feed.html         Dispatches: composer + feed
│   ├── profile.html      Dossier: own, or another agent's via ?u=codename
│   ├── vault.html        What is stored, export, burn account, erase all
│   ├── about.html        About, privacy design, honest limits
│   └── 404.html          Not-found page
├── src/
│   ├── css/style.css     Tokens, layout, components, dark mode
│   └── js/main.js        All behavior (see docs/ARCHITECTURE.md)
├── assets/img/logo.svg
└── docs/ARCHITECTURE.md
```

## Features
- **Burn timers**: 1 hour, 1 day, 7 days or never. Expired posts disappear.
- **Redaction bars**: `||text||` is hidden until tapped or activated with Enter/Space.
- **Clearance levels**: 1 (Recruit) to 5 (Cosmic), earned by sending dispatches.
- **Panic**: Esc twice or the Panic button logs out and opens `about:blank`.
- **Vault**: export (credentials excluded), burn account, erase everything.

## ⚠️ Panic Button
The red **Panic** button is for emergencies only. Use it if you think someone or something (like an AI) is watching or has breached your session.

- It logs you out immediately and jumps to a blank page.
- Shortcut: press `Esc` twice.
- It does **not** delete your data. Your account and dispatches stay in your browser. To erase everything, go to **Vault → Erase all data**.
- Please don't press it for fun, or you'll have to log in again.

## Privacy features
- All data stays in `localStorage` (prefix `topsecret:`). Nothing is sent anywhere.
- Content-Security-Policy meta tag on every page blocks third-party scripts, styles, fonts, images and connections.
- `referrer: no-referrer`; no cookies, analytics or fingerprinting.
- Passwords stored only as salted PBKDF2 (SHA-256, 150k iterations) hashes.
- User text is HTML-escaped before rendering.

## Known limitations
- Data is per-browser: no real cross-user sharing, and clearing site data deletes accounts.
- Client-side auth is a prototype guard, not real security: anyone with device access can read storage.
- Redactions are visual only. Burn timers are enforced only in this browser.
- No password recovery, images, or direct messages.

## Ideas for next steps
Encrypt dispatches with a key derived from the password, image dispatches, follows, and an end-to-end encrypted backend.