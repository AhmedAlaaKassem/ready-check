// Data lives in localStorage as plain JSON so it can be exported, migrated,
// or ported to a native app later.
//
// Shape (schemaVersion 1):
// {
//   schemaVersion: 1,
//   lists: [{ id, name, createdAt, autoResetHours, completedAt,
//             items: [{ id, text, done, doneAt }] }],
//   ui:   { lastListId },
//   meta: { createdAt, lastExportAt }
// }
// Unknown fields are always preserved, so data written by a newer version
// survives a round trip through this one.

export const KEY = 'readycheck.v1';
export const SCHEMA_VERSION = 1;

export function uid() { return Math.random().toString(36).slice(2, 10); }

function mk(name, items) {
  return newList(name, items.map(function (t) { return { id: uid(), text: t, done: false, doneAt: null }; }));
}

export function newList(name, items) {
  return { id: uid(), name: name, createdAt: Date.now(), autoResetHours: 0, completedAt: null, items: items || [] };
}

export function seed() {
  return {
    schemaVersion: SCHEMA_VERSION,
    lists: [
      mk('Gym bag', ['Towel', 'Water bottle filled', 'Training shoes', 'Shaker + protein', 'Headphones charged', 'Locker lock', 'Change of clothes', 'Gym card']),
      mk('Table tennis training', ['Racket in case', 'Balls (3+)', 'Indoor court shoes', 'Towel', 'Wristband', 'Water', 'Spare shirt']),
      mk('Leaving the house', ['Keys', 'Wallet', 'Phone charged', 'AirPods', 'Lights off', 'Door locked'])
    ],
    ui: { lastListId: null },
    meta: { createdAt: Date.now(), lastExportAt: null }
  };
}

/* ---------- validation + migration ---------- */

// Throws with a readable message if `d` can't be turned into app data.
// Returns a migrated, normalized copy.
export function migrate(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.lists)) throw new Error('This file has no checklists in it.');
  var v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0;
  if (v > SCHEMA_VERSION) throw new Error('This backup was made by a newer version of Ready Check. Update the app first.');

  var out = JSON.parse(JSON.stringify(d)); // deep copy, keeps unknown fields

  // v0 → v1: the draft format ({ lists }) had no version, timestamps or options.
  if (v < 1) out.schemaVersion = 1;
  // Future: if (v < 2) { ...; out.schemaVersion = 2; }

  return normalize(out);
}

function normalize(d) {
  var seen = {};
  function freshId(id) {
    if (typeof id !== 'string' || !id || seen[id]) id = uid();
    seen[id] = true;
    return id;
  }
  d.lists = d.lists.filter(function (l) { return l && typeof l === 'object'; }).map(function (l) {
    l.id = freshId(l.id);
    l.name = typeof l.name === 'string' && l.name.trim() ? l.name : 'Untitled';
    if (typeof l.createdAt !== 'number') l.createdAt = Date.now();
    if (typeof l.autoResetHours !== 'number' || l.autoResetHours < 0) l.autoResetHours = 0;
    if (typeof l.completedAt !== 'number') l.completedAt = null;
    l.items = (Array.isArray(l.items) ? l.items : []).filter(function (i) {
      return i && typeof i === 'object' && typeof i.text === 'string';
    }).map(function (i) {
      i.id = freshId(i.id);
      i.done = i.done === true;
      i.doneAt = i.done && typeof i.doneAt === 'number' ? i.doneAt : (i.done ? Date.now() : null);
      return i;
    });
    syncCompleted(l);
    return l;
  });
  if (!d.ui || typeof d.ui !== 'object') d.ui = {};
  if (typeof d.ui.lastListId !== 'string') d.ui.lastListId = null;
  if (!d.meta || typeof d.meta !== 'object') d.meta = {};
  if (typeof d.meta.createdAt !== 'number') d.meta.createdAt = Date.now();
  if (typeof d.meta.lastExportAt !== 'number') d.meta.lastExportAt = null;
  return d;
}

/* ---------- persistence ---------- */

export function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Ready Check: could not read saved data', e);
    // Keep the unreadable copy aside instead of overwriting it.
    try { if (raw) localStorage.setItem(KEY + '.unreadable.' + Date.now(), raw); } catch (_) {}
  }
  return seed();
}

export function save(store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); return true; }
  catch (e) { console.warn('Ready Check: could not save', e); return false; }
}

// Ask the browser not to evict our storage under pressure.
export function persist() {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persisted().then(function (p) { return p || navigator.storage.persist(); }).catch(function () { return false; });
  }
  return Promise.resolve(false);
}

/* ---------- list helpers ---------- */

export function stats(list) {
  var done = list.items.filter(function (i) { return i.done; }).length;
  return { done: done, total: list.items.length };
}

export function isComplete(list) {
  var s = stats(list);
  return s.total > 0 && s.done === s.total;
}

// Track when a list became fully ticked (for auto-reset).
export function syncCompleted(list) {
  if (isComplete(list)) { if (!list.completedAt) list.completedAt = Date.now(); }
  else list.completedAt = null;
}

export function resetList(list) {
  list.items.forEach(function (i) { i.done = false; i.doneAt = null; });
  list.completedAt = null;
}

// Untick lists that were completed more than their autoResetHours ago.
// Returns true if anything changed.
export function applyAutoResets(store, now) {
  now = now || Date.now();
  var changed = false;
  store.lists.forEach(function (l) {
    if (l.autoResetHours > 0 && l.completedAt && now - l.completedAt >= l.autoResetHours * 3600e3) {
      resetList(l); changed = true;
    }
  });
  return changed;
}
