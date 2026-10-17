// Ready Check: boot, view state and event wiring.

import { load, save, persist, uid, newList, syncCompleted, resetList, applyAutoResets } from './store.js';
import { homeHTML, listHTML, settingsHTML } from './views.js';
import { capture, play } from './flip.js';
import { enableReorder } from './reorder.js';
import { exportBackup, readBackup } from './backup.js';

var app = document.getElementById('app');
var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var store = load();
applyAutoResets(store);
var info = { persisted: false, version: null };
var view;
var registration = null;

function homeView() {
  return { screen: 'home', listId: null, editing: false, confirmDelete: false, newOpen: false };
}
function listView(id, focus) {
  return { screen: 'list', listId: id, editing: false, confirmDelete: false, newOpen: false, focus: focus || null };
}
function current() { return store.lists.find(function (l) { return l.id === view.listId; }); }
function commit() { save(store); }

function openList(id, focus) {
  applyAutoResets(store);
  store.ui.lastListId = id;
  commit();
  view = listView(id, focus);
  render(); window.scrollTo(0, 0);
}
function goHome() {
  store.ui.lastListId = null;
  commit();
  view = homeView();
  render();
}

/* ---------- render ---------- */

function render(animate) {
  var first = animate && !reduced ? capture(app) : null;
  if (view.screen === 'list' && !current()) view = homeView();
  if (view.screen === 'home') app.innerHTML = homeHTML(store, view);
  else if (view.screen === 'list') app.innerHTML = listHTML(current(), view);
  else app.innerHTML = settingsHTML(store, view, info);
  if (first) play(app, first);
  if (view.focus) {
    var f = document.getElementById(view.focus);
    if (f) f.focus({ preventScroll: view.focus === 'add-input' ? false : true });
    view.focus = null;
  }
  view.just = null;
}

/* ---------- events ---------- */

app.addEventListener('click', function (e) {
  var t = e.target.closest('[data-open],[data-toggle],[data-del],[data-act]');
  if (!t) return;
  var l = current();

  if (t.dataset.open) { openList(t.dataset.open); return; }
  if (t.dataset.toggle) {
    var it = l.items.find(function (i) { return i.id === t.dataset.toggle; });
    it.done = !it.done; it.doneAt = it.done ? Date.now() : null;
    syncCompleted(l);
    view.just = it.id; commit(); render(true); return;
  }
  if (t.dataset.del) {
    l.items = l.items.filter(function (i) { return i.id !== t.dataset.del; });
    syncCompleted(l);
    commit(); render(true); return;
  }
  switch (t.dataset.act) {
    case 'back': goHome(); break;
    case 'edit': view.editing = !view.editing; view.confirmDelete = false; render(); break;
    case 'reset': resetList(l); commit(); render(true); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); break;
    case 'new': view.newOpen = true; view.focus = 'new-name'; render(); break;
    case 'cancel-new': view.newOpen = false; render(); break;
    case 'ask-delete': view.confirmDelete = true; render(); break;
    case 'keep-list': view.confirmDelete = false; render(); break;
    case 'delete-list':
      store.lists = store.lists.filter(function (x) { return x.id !== l.id; });
      goHome(); break;

    case 'settings': openSettings(); break;
    case 'export':
      exportBackup(store).then(function (how) {
        if (how === 'cancelled') return;
        store.meta.lastExportAt = Date.now(); commit();
        view.notice = { kind: 'ok', text: how === 'shared' ? 'Backup ready. Save it to Files or iCloud Drive.' : 'Backup downloaded.' };
        render();
      });
      break;
    case 'import':
      view.notice = null;
      document.getElementById('import-file').click();
      break;
    case 'confirm-import':
      store = view.pendingImport.data; commit();
      view.pendingImport = null;
      view.notice = { kind: 'ok', text: 'Backup restored: ' + store.lists.length + ' checklists.' };
      render(); break;
    case 'cancel-import': view.pendingImport = null; render(); break;
  }
});

app.addEventListener('submit', function (e) {
  e.preventDefault();
  if (e.target.id === 'add-form') {
    var inp = document.getElementById('add-input');
    var text = inp.value.trim();
    if (!text) return;
    var l = current();
    l.items.push({ id: uid(), text: text, done: false, doneAt: null });
    syncCompleted(l);
    commit(); view.focus = 'add-input'; render(true);
  }
  if (e.target.id === 'new-form') {
    var name = document.getElementById('new-name').value.trim();
    if (!name) return;
    var nl = newList(name);
    store.lists.push(nl);
    openList(nl.id, 'add-input');
  }
});

app.addEventListener('input', function (e) {
  var l = current();
  if (!l) return;
  if (e.target.id === 'rename') { l.name = e.target.value.trim() || 'Untitled'; commit(); }
  if (e.target.dataset.item) {
    var it = l.items.find(function (i) { return i.id === e.target.dataset.item; });
    if (it) { it.text = e.target.value.trim() || it.text; commit(); }
  }
});

app.addEventListener('change', function (e) {
  if (e.target.id === 'auto-reset') {
    var l = current();
    l.autoResetHours = Math.max(0, Number(e.target.value) || 0);
    commit();
  }
  if (e.target.id === 'import-file') {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    readBackup(file).then(function (res) {
      view.pendingImport = res; view.notice = null; render();
    }, function (err) {
      view.notice = { kind: 'err', text: err.message || 'Could not read that file.' }; render();
    });
  }
});

enableReorder(app, function (id, to, viaKeyboard) {
  var l = current();
  var from = l.items.findIndex(function (i) { return i.id === id; });
  if (from < 0) return;
  var moved = l.items.splice(from, 1)[0];
  l.items.splice(to, 0, moved);
  commit();
  if (viaKeyboard) view.focus = null;
  render(true);
  if (viaKeyboard) {
    var h = app.querySelector('[data-handle="' + id + '"]');
    if (h) h.focus();
  }
});

/* ---------- settings ---------- */

function openSettings() {
  store.ui.lastListId = null; commit();
  view = { screen: 'settings', notice: null, pendingImport: null };
  render(); window.scrollTo(0, 0);
  // Fill in details that are only known asynchronously.
  Promise.all([
    navigator.storage && navigator.storage.persisted ? navigator.storage.persisted().catch(function () { return false; }) : false,
    'caches' in window ? caches.keys().catch(function () { return []; }) : []
  ]).then(function (r) {
    info.persisted = !!r[0];
    var k = r[1].find(function (n) { return n.indexOf('readycheck-') === 0; });
    info.version = k ? k.slice('readycheck-'.length) : null;
    if (view.screen === 'settings' && !view.pendingImport) render();
  });
}

/* ---------- lifecycle ---------- */

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible') return;
  var changed = applyAutoResets(store);
  if (changed) commit();
  var typing = document.activeElement && /INPUT|SELECT/.test(document.activeElement.tagName);
  if ((changed || view.screen === 'home') && !typing) render();
  if (registration) registration.update().catch(function () {});
});

// Boot: reopen the checklist that was open last time.
var last = store.ui.lastListId && store.lists.find(function (l) { return l.id === store.ui.lastListId; });
view = last ? listView(last.id) : homeView();
commit(); // writes seed / migrated data on first run
render();
persist().then(function (p) { info.persisted = !!p; });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').then(function (reg) { registration = reg; })
      .catch(function (e) { console.warn('Ready Check: service worker failed', e); });
  });
}
