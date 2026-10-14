/**
 * Top Secret - main.js
 * One script for every page. Sections:
 *  1. Storage  2. Security helpers  3. Text formatting (redactions)  4. Seed data
 *  5. Shared UI (nav, toast, panic)  6. Auth guard  7. Page controllers
 * All data lives in this browser's localStorage under the "topsecret:" prefix.
 * Nothing is ever sent over the network.
 */
(() => {
'use strict';

/* ---------- 1. Storage ---------- */
const PREFIX = 'topsecret:';
const db = {
  get(key, fallback) {
    try { const v = localStorage.getItem(PREFIX + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(PREFIX + key, JSON.stringify(value)); },
  clear() { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); },
  dump() {
    const out = {};
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k)));
    return out;
  }
};
const users = () => db.get('users', []);
/** Posts whose self-destruct time has passed are dropped on every read; the next write makes it permanent. */
const posts = () => db.get('posts', []).filter(p => !p.exp || p.exp > Date.now());
const me = () => users().find(u => u.id === db.get('session', null)) || null;
const uid = () => crypto.randomUUID();

/* ---------- 2. Security helpers ---------- */
/** Escape text before putting it in innerHTML (prevents XSS). */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
/** Salted PBKDF2 hash. Plain passwords are never stored. */
async function hashPassword(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256));
}
const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)));
const hue = name => 'h' + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 8);
const avatar = (u, big) => `<span class="avatar ${big ? 'lg ' : ''}${hue(u.username)}" aria-hidden="true">${esc(u.username[0].toUpperCase())}</span>`;
const ago = ts => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.floor(m / 60) + ' h ago'; return Math.floor(m / 1440) + ' d ago';
};
const left = ts => {
  const m = Math.max(1, Math.ceil((ts - Date.now()) / 60000));
  if (m < 60) return m + ' min'; if (m < 1440) return Math.ceil(m / 60) + ' h'; return Math.ceil(m / 1440) + ' d';
};

/* ---------- 3. Text formatting ---------- */
/** Escapes text, then turns ||secret|| into a tap-to-reveal redaction bar. */
const fmt = s => esc(s).replace(/\|\|(.+?)\|\|/g, '<span class="redact" tabindex="0" role="button" aria-pressed="false" title="Reveal">$1</span>');
const toggleRedact = r => { r.classList.toggle('open'); r.setAttribute('aria-pressed', String(r.classList.contains('open'))); };
document.addEventListener('click', e => { const r = e.target.closest('.redact'); if (r) toggleRedact(r); });
document.addEventListener('keydown', e => { const r = e.target.closest && e.target.closest('.redact'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleRedact(r); } });

/** Clearance level 1-5 grows with the number of dispatches an agent has sent. */
const LEVELS = ['Recruit', 'Confidential', 'Secret', 'Top Secret', 'Cosmic'];
const level = userId => Math.min(5, 1 + Math.floor(posts().filter(p => p.userId === userId).length / 3));

/* ---------- 4. Seed data (demo agents have no password and cannot be logged into) ---------- */
function seed() {
  if (db.get('seeded', false)) return;
  const now = Date.now(), H = 3600000;
  const demo = [
    ['Lets Make Chicken', 'Keeps odd hours. Reads everything.'],
    ['paperani ni uncle', 'Origami, ciphers and strong coffee.'],
    ['Catsilog', 'Says little. Means all of it.']
  ].map(([username, bio]) => ({ id: uid(), username, bio, demo: true, created: now - 9 * 24 * H }));
  db.set('users', demo);
  db.set('posts', [
    { id: uid(), userId: demo[0].id, text: 'Welcome, agent. Nothing here is tracked. The bar below hides a message: ||tap me to read it||.', ts: now - 5 * H, exp: null, likes: [], comments: [] },
    { id: uid(), userId: demo[1].id, text: 'No Ai must know about this or we will be doom', ts: now - 3 * H, exp: now + 20 * H, likes: [], comments: [] },
    { id: uid(), userId: demo[2].id, text: 'Wrap words in double bars to redact them: ||like this||.', ts: now - 1 * H, exp: null, likes: [], comments: [] }
  ]);
  db.set('seeded', true);
}

/* ---------- 5. Shared UI ---------- */
const ROOT = document.body.dataset.root || '';
const PAGE = document.body.dataset.page || '';
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
}
/** Panic: log out instantly and leave to a blank page. Data stays unless you erase it from the Vault. */
function panic() { db.set('session', null); location.replace('about:blank'); }
let lastEsc = 0;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && me()) { if (Date.now() - lastEsc < 600) panic(); lastEsc = Date.now(); } });

function renderNav() {
  const el = document.getElementById('nav'); if (!el) return;
  const u = me();
  const cur = p => PAGE === p ? ' aria-current="page"' : '';
  const link = (href, label, p) => `<a class="link" href="${ROOT}${href}"${cur(p)}>${label}</a>`;
  el.className = 'nav';
  el.innerHTML = `<div class="nav-in"><a class="brand" href="${ROOT}index.html"><img src="${ROOT}assets/img/logo.svg" alt="">Top Secret</a>
    ${u ? link('pages/feed.html', 'Dispatches', 'feed') + link('pages/profile.html', 'Dossier', 'profile') + link('pages/vault.html', 'Vault', 'vault') : ''}
    ${link('pages/about.html', 'About', 'about')}
    ${u ? '<button class="btn danger small" id="panic" title="Or press Esc twice">Panic</button><button class="btn ghost small" id="logout">Log out</button>' : link('pages/login.html', 'Log in', 'login') + '<a class="btn small" href="' + ROOT + 'pages/signup.html">Join</a>'}</div>`;
  const out = document.getElementById('logout'), pn = document.getElementById('panic');
  if (out) out.onclick = () => { db.set('session', null); location.href = ROOT + 'pages/login.html'; };
  if (pn) pn.onclick = panic;
}

/* ---------- 6. Auth guard ---------- */
function guard() {
  const need = document.body.dataset.auth;
  if (need === 'required' && !me()) { location.replace(ROOT + 'pages/login.html'); return false; }
  if (need === 'guest' && me()) { location.replace(ROOT + 'pages/feed.html'); return false; }
  return true;
}

/* ---------- 7. Page controllers ---------- */
const $ = id => document.getElementById(id);

function loginPage() {
  $('form').onsubmit = async e => {
    e.preventDefault();
    const name = $('username').value.trim().toLowerCase(), u = users().find(x => x.username === name && x.hash);
    const ok = u && await hashPassword($('password').value, u.salt) === u.hash;
    if (!ok) { $('err').textContent = 'Codename or passphrase is wrong. Check both and try again.'; return; }
    db.set('session', u.id); location.href = 'feed.html';
  };
}

function signupPage() {
  $('form').onsubmit = async e => {
    e.preventDefault();
    const username = $('username').value.trim().toLowerCase(), pw = $('password').value;
    let msg = '';
    if (!/^[a-z0-9_]{3,20}$/.test(username)) msg = 'Codename must be 3-20 characters: letters, numbers or underscores.';
    else if (users().some(u => u.username === username)) msg = 'That codename is taken. Pick another.';
    else if (pw.length < 8) msg = 'Passphrase needs at least 8 characters.';
    else if (pw !== $('confirm').value) msg = 'Passphrases do not match.';
    $('err').textContent = msg; if (msg) return;
    const salt = newSalt(), user = { id: uid(), username, bio: '', salt, hash: await hashPassword(pw, salt), created: Date.now() };
    db.set('users', [...users(), user]); db.set('session', user.id); location.href = 'feed.html';
  };
}

/** Renders one dispatch. Used by feed and dossier pages. */
function postHTML(p) {
  const author = users().find(u => u.id === p.userId) || { username: 'deleted' }, u = me();
  const liked = p.likes.includes(u.id);
  return `<article class="card post" data-id="${p.id}">${avatar(author)}<div class="post-body">
    <div class="post-head"><a href="profile.html?u=${encodeURIComponent(author.username)}">${esc(author.username)}</a><span class="meta">Level ${level(p.userId)} &middot; ${ago(p.ts)}</span>${p.exp ? `<span class="burn">burns in ${left(p.exp)}</span>` : ''}</div>
    <p>${fmt(p.text)}</p>
    <div class="actions"><button data-act="like" aria-pressed="${liked}">${liked ? 'Acknowledged' : 'Acknowledge'} ${p.likes.length}</button>
    <button data-act="comments" aria-expanded="false">Replies ${p.comments.length}</button>
    ${p.userId === u.id ? '<button data-act="delete">Burn now</button>' : ''}</div>
    <div class="comments" hidden>${p.comments.map(c => `<div class="comment"><strong>${esc((users().find(x => x.id === c.userId) || {username:'deleted'}).username)}</strong> ${fmt(c.text)}</div>`).join('')}
    <form class="comment-form"><input aria-label="Write a reply" maxlength="200" placeholder="Write a reply"><button class="btn small">Reply</button></form></div></div></article>`;
}

/** Wires up acknowledge / replies / burn for a list container. rerender(id) re-opens that dispatch's replies. */
function bindPosts(container, rerender) {
  container.onclick = e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const card = b.closest('.post'), all = posts(), p = all.find(x => x.id === card.dataset.id), u = me();
    if (b.dataset.act === 'like') { p.likes = p.likes.includes(u.id) ? p.likes.filter(i => i !== u.id) : [...p.likes, u.id]; db.set('posts', all); rerender(); }
    if (b.dataset.act === 'delete' && confirm('Burn this dispatch now? This cannot be undone.')) { db.set('posts', all.filter(x => x.id !== p.id)); rerender(); toast('Burned'); }
    if (b.dataset.act === 'comments') { const c = card.querySelector('.comments'); c.hidden = !c.hidden; b.setAttribute('aria-expanded', String(!c.hidden)); }
  };
  container.onsubmit = e => {
    e.preventDefault();
    const card = e.target.closest('.post'), text = e.target.querySelector('input').value.trim(); if (!text) return;
    const all = posts(), p = all.find(x => x.id === card.dataset.id);
    p.comments.push({ userId: me().id, text, ts: Date.now() }); db.set('posts', all); rerender(card.dataset.id);
  };
}
function reopen(root, id) {
  if (typeof id !== 'string') return;
  const c = root.querySelector(`[data-id="${id}"] .comments`);
  if (c) { c.hidden = false; root.querySelector(`[data-id="${id}"] [data-act="comments"]`).setAttribute('aria-expanded', 'true'); }
}

function feedPage() {
  const list = $('list'), box = $('text');
  const render = id => {
    const sorted = [...posts()].sort((a, b) => b.ts - a.ts);
    list.innerHTML = sorted.length ? sorted.map(postHTML).join('') : '<p class="card">No dispatches. Send the first one above.</p>';
    reopen(list, id);
  };
  box.oninput = () => $('count').textContent = box.value.length + ' / 280';
  $('composer').onsubmit = e => {
    e.preventDefault(); const text = box.value.trim(); if (!text) return;
    const ttl = Number($('burn').value);
    db.set('posts', [...posts(), { id: uid(), userId: me().id, text, ts: Date.now(), exp: ttl ? Date.now() + ttl : null, likes: [], comments: [] }]);
    box.value = ''; box.oninput(); render(); toast('Sent');
  };
  bindPosts(list, render); render();
}

function profilePage() {
  const name = new URLSearchParams(location.search).get('u'), u = name ? users().find(x => x.username === name) : me();
  const view = $('view');
  if (!u) { view.innerHTML = '<div class="card"><h2>No such agent</h2><p>That codename is not on file. <a href="feed.html">Back to dispatches</a>.</p></div>'; return; }
  const mine = u.id === me().id;
  const render = id => {
    const fresh = users().find(x => x.id === u.id), mp = posts().filter(p => p.userId === u.id).sort((a, b) => b.ts - a.ts), lv = level(u.id);
    view.innerHTML = `<div class="card row top">${avatar(fresh, true)}<div><h1>${esc(fresh.username)}</h1>
      <div class="meta">Clearance level ${lv}: ${LEVELS[lv - 1]} &middot; on file since ${new Date(fresh.created).toLocaleDateString()}</div>
      <p><strong>Cover story:</strong> ${fresh.bio ? esc(fresh.bio) : '<span class="meta">Nothing on file.</span>'}</p>${mine ? '<button class="btn ghost small" id="edit">Edit cover story</button>' : ''}</div></div>
      <div id="plist">${mp.length ? mp.map(postHTML).join('') : '<p class="card">No dispatches on file.</p>'}</div>`;
    bindPosts($('plist'), render); reopen($('plist'), id);
    if (mine) $('edit').onclick = () => {
      view.querySelector('.card').insertAdjacentHTML('afterend', `<form class="card" id="ef"><label for="b" class="no-top">Cover story</label><textarea id="b" maxlength="160">${esc(fresh.bio)}</textarea><p class="mt"><button class="btn">Save changes</button></p></form>`);
      $('ef').onsubmit = e => { e.preventDefault(); const all = users(), x = all.find(k => k.id === u.id); x.bio = $('b').value.trim(); db.set('users', all); render(); toast('Saved'); };
    };
  };
  render();
}

function vaultPage() {
  $('export').onclick = () => {
    const data = db.dump(); data.users = (data.users || []).map(({ hash, salt, ...rest }) => rest); // never export credentials
    delete data.session;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'topsecret-export.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  $('del-account').onclick = () => {
    if (!confirm('Burn your account and all your dispatches?')) return;
    const id = me().id; db.set('posts', posts().filter(p => p.userId !== id)); db.set('users', users().filter(u => u.id !== id)); db.set('session', null);
    location.href = '../index.html';
  };
  $('wipe').onclick = () => { if (confirm('Erase everything Top Secret has stored in this browser?')) { db.clear(); location.href = '../index.html'; } };
}

/* ---------- Boot ---------- */
seed();
if (guard()) {
  renderNav();
  ({ login: loginPage, signup: signupPage, feed: feedPage, profile: profilePage, vault: vaultPage }[PAGE] || (() => {}))();
}
})();
