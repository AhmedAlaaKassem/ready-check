// Backup export (share sheet on iOS, download elsewhere) and import parsing.

import { migrate, SCHEMA_VERSION } from './store.js';

function stamp(d) {
  function p(n) { return String(n).padStart(2, '0'); }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// Resolves to 'shared' | 'downloaded' | 'cancelled'.
// Must be called straight from a tap: the share sheet needs the user gesture.
export function exportBackup(store) {
  var now = new Date();
  var payload = { app: 'ready-check', schemaVersion: SCHEMA_VERSION, exportedAt: now.getTime(), data: store };
  var json = JSON.stringify(payload, null, 2);
  var name = 'ready-check-backup-' + stamp(now) + '.json';
  var file = new File([json], name, { type: 'application/json' });

  if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file], title: 'Ready Check backup' })
      .then(function () { return 'shared'; })
      .catch(function (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        return download(file, name);
      });
  }
  return Promise.resolve(download(file, name));
}

function download(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  return 'downloaded';
}

// Accepts a backup file ({ app, exportedAt, data }) or raw app data.
// Resolves to { data, exportedAt } or rejects with a readable message.
export function readBackup(file) {
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('That file is too big to be a Ready Check backup.'));
  return file.text().then(function (text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('That file isn’t a Ready Check backup (not valid JSON).'); }
    var isWrapped = obj && obj.app === 'ready-check' && obj.data;
    var data = migrate(isWrapped ? obj.data : obj);
    data.ui.lastListId = null;
    return { data: data, exportedAt: isWrapped && typeof obj.exportedAt === 'number' ? obj.exportedAt : null };
  });
}
