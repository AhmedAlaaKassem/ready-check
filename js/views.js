// Screen markup. Home and list screens are ported from reference/draft.html;
// edit-mode reorder, list options and Settings are v1 additions.

import { stats } from './store.js';

var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
var GRIP = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 5h12M3 9h12M3 13h12"/></svg>';

export var AUTO_RESET_OPTIONS = [0, 4, 12, 24];

export function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- home ---------- */

export function homeHTML(store, view) {
  var d = new Date();
  var date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  var cards = store.lists.map(function (l) {
    var s = stats(l), pct = s.total ? Math.round(s.done / s.total * 100) : 0;
    var full = s.total > 0 && s.done === s.total;
    return '<li><button class="card" data-open="' + l.id + '">' +
      '<span class="card-top"><span class="card-name">' + esc(l.name) + '</span>' +
      '<span class="card-meta">' + s.done + ' / ' + s.total + '</span></span>' +
      '<span class="meter' + (full ? ' full' : '') + '"><span style="width:' + pct + '%"></span></span>' +
      (full ? '<span class="chip">Ready</span>' : '') +
      '</button></li>';
  }).join('');
  var newArea = view.newOpen
    ? '<form class="new-form" id="new-form"><label class="eyebrow" for="new-name">New checklist</label>' +
      '<input class="field" id="new-name" placeholder="e.g. Tournament day" autocomplete="off" enterkeyhint="done">' +
      '<div class="actions"><button class="solid-btn" type="submit">Create</button>' +
      '<button class="line-btn" type="button" data-act="cancel-new">Cancel</button></div></form>'
    : '<button class="new-trigger" data-act="new">+ New checklist</button>';
  return '<header class="home-head">' +
    '<div class="home-top"><p class="eyebrow">' + esc(date) + '</p>' +
    '<button class="text-btn" data-act="settings">Settings</button></div>' +
    '<h1 class="display">Ready Check</h1>' +
    '<p class="lede">Pick a checklist, tick through it, go.</p></header>' +
    '<ul class="cards">' + cards + '</ul>' +
    '<div class="new-area">' + newArea + '</div>';
}

/* ---------- checklist ---------- */

function rowHTML(i, view) {
  var cls = 'row' + (i.done ? ' is-done' : '') + (view.just === i.id && i.done ? ' just' : '');
  return '<li class="' + cls + '" data-id="' + i.id + '">' +
    '<button class="tick" data-toggle="' + i.id + '" aria-pressed="' + i.done + '">' +
    '<span class="box">' + CHECK + '</span>' +
    '<span class="txt"><span class="strike">' + esc(i.text) + '</span></span></button></li>';
}

function editRowHTML(i) {
  return '<li class="row edit-row" data-id="' + i.id + '">' +
    '<button class="handle" type="button" data-handle="' + i.id + '" aria-label="Move ' + esc(i.text) + '. Drag, or use arrow keys">' + GRIP + '</button>' +
    '<input class="field" data-item="' + i.id + '" id="item-' + i.id + '" value="' + esc(i.text) + '" aria-label="Item name" enterkeyhint="done">' +
    '<button class="del" data-del="' + i.id + '" aria-label="Delete ' + esc(i.text) + '">&times;</button></li>';
}

function autoResetLabel(h) {
  return h ? 'After ' + h + ' hours' : 'Off';
}

export function listHTML(l, view) {
  var s = stats(l);
  var complete = s.total > 0 && s.done === s.total;
  var todo = l.items.filter(function (i) { return !i.done; });
  var done = l.items.filter(function (i) { return i.done; }).sort(function (a, b) { return (a.doneAt || 0) - (b.doneAt || 0); });

  var segs = l.items.map(function (_, idx) { return '<span class="seg' + (idx < s.done ? ' on' : '') + '"></span>'; }).join('');
  var title = view.editing
    ? '<input class="field rename" id="rename" value="' + esc(l.name) + '" aria-label="Checklist name" enterkeyhint="done">'
    : '<h1 class="display">' + esc(l.name) + '</h1>';

  var ready = (complete && !view.editing)
    ? '<section class="ready" aria-live="polite"><p class="eyebrow" style="color:inherit;opacity:.8">All ' + s.total + ' checked</p>' +
      '<h2 class="display">Ready to go</h2><p>Everything on the list is with you.</p>' +
      '<button data-act="reset">Reset for next time</button></section>'
    : '';

  var addRow = '<li class="add-row"><form id="add-form"><input class="field" id="add-input" placeholder="Add item" autocomplete="off" aria-label="New item" enterkeyhint="done">' +
    '<button class="solid-btn" type="submit">Add</button></form></li>';

  var rows;
  if (view.editing) {
    // Edit mode: every item in its saved order, so it can be dragged.
    rows = l.items.map(editRowHTML).join('') + addRow;
  } else {
    var row = function (i) { return rowHTML(i, view); };
    rows = todo.map(row).join('') + addRow +
      (done.length ? '<li class="divider">Checked</li>' + done.map(row).join('') : '');
  }

  var foot = '';
  if (view.editing) {
    var opts = AUTO_RESET_OPTIONS.map(function (h) {
      return '<option value="' + h + '"' + (l.autoResetHours === h ? ' selected' : '') + '>' + autoResetLabel(h) + '</option>';
    }).join('');
    if (AUTO_RESET_OPTIONS.indexOf(l.autoResetHours) < 0) {
      opts += '<option value="' + l.autoResetHours + '" selected>' + autoResetLabel(l.autoResetHours) + '</option>';
    }
    foot = '<div class="opt"><label class="eyebrow" for="auto-reset">Auto-reset when done</label>' +
      '<select class="field" id="auto-reset">' + opts + '</select>' +
      '<p class="hint">Unticks everything once the list has been complete this long.</p></div>' +
      (view.confirmDelete
        ? '<div class="confirm"><p>Delete “' + esc(l.name) + '” and its ' + s.total + ' items?</p>' +
          '<div class="actions"><button class="danger-btn" data-act="delete-list">Delete checklist</button>' +
          '<button class="line-btn" data-act="keep-list">Keep it</button></div></div>'
        : '<button class="danger-btn" data-act="ask-delete">Delete checklist</button>');
  } else if (s.done > 0 && !complete) {
    foot = '<button class="line-btn" data-act="reset">Uncheck all</button>';
  }

  return '<nav class="bar"><button class="text-btn" data-act="back">‹ Lists</button>' +
    '<button class="text-btn" data-act="edit">' + (view.editing ? 'Done' : 'Edit') + '</button></nav>' +
    '<header class="list-head">' + title +
    '<div class="count"><span class="num">' + s.done + '</span><span class="of">/ ' + s.total + '</span><span class="lbl">checked</span></div>' +
    (s.total ? '<div class="segs' + (complete ? ' complete' : '') + '">' + segs + '</div>' : '') +
    '</header>' + ready +
    (s.total === 0 ? '<p class="empty">No items yet. Add the first one below.</p>' : '') +
    '<ul class="items">' + rows + '</ul>' +
    (foot ? '<div class="foot">' + foot + '</div>' : '');
}

/* ---------- settings ---------- */

function fmtDate(t) {
  return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function settingsHTML(store, view, info) {
  var itemCount = store.lists.reduce(function (n, l) { return n + l.items.length; }, 0);
  var last = store.meta.lastExportAt ? 'Last export: ' + esc(fmtDate(store.meta.lastExportAt)) + '.' : 'No backup exported yet.';

  var notice = view.notice
    ? '<p class="notice ' + (view.notice.kind === 'err' ? 'err' : 'ok') + '" role="status">' + esc(view.notice.text) + '</p>'
    : '';

  var pending = view.pendingImport;
  var importBlock = pending
    ? '<div class="confirm"><p>Replace your ' + store.lists.length + ' checklist' + (store.lists.length === 1 ? '' : 's') +
      ' with the ' + pending.data.lists.length + ' in this backup' +
      (pending.exportedAt ? ' from ' + esc(fmtDate(pending.exportedAt)) : '') + '? This can’t be undone.</p>' +
      '<div class="actions"><button class="danger-btn" data-act="confirm-import">Replace data</button>' +
      '<button class="line-btn" data-act="cancel-import">Cancel</button></div></div>'
    : '<div class="actions"><button class="solid-btn" data-act="export">Export backup</button>' +
      '<button class="line-btn" data-act="import">Import backup</button></div>';

  return '<nav class="bar"><button class="text-btn" data-act="back">‹ Lists</button><span></span></nav>' +
    '<header class="settings-head"><h1 class="display">Settings</h1></header>' +
    '<section class="panel" aria-labelledby="backup-h">' +
      '<p class="eyebrow" id="backup-h">Backup</p>' +
      '<p>Your checklists live only on this iPhone. Removing Ready Check from the Home Screen erases them, so export a backup now and then.</p>' +
      '<p class="muted">' + store.lists.length + ' checklists, ' + itemCount + ' items. ' + last + '</p>' +
      notice + importBlock +
      '<input type="file" id="import-file" class="visually-hidden" tabindex="-1" aria-hidden="true">' +
    '</section>' +
    '<section class="panel" aria-labelledby="about-h">' +
      '<p class="eyebrow" id="about-h">About</p>' +
      '<p class="muted">Works offline. Nothing leaves your phone.<br>' +
      'Storage: ' + (info.persisted ? 'protected from automatic clean-up' : 'standard') + '.' +
      (info.version ? '<br>Version: ' + esc(info.version) : '') + '</p>' +
    '</section>';
}
