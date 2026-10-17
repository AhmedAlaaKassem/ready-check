// Drag-to-reorder for edit mode. Touch-friendly via pointer events on the
// grip handle (touch-action: none in CSS), with arrow keys as a fallback.
// Calls onMove(itemId, toIndex) once the drop position is known.

var EDGE = 72;       // px from viewport edge where auto-scroll starts
var EDGE_SPEED = 10; // px per pointermove

export function enableReorder(root, onMove) {
  var drag = null;

  root.addEventListener('pointerdown', function (e) {
    var h = e.target.closest('[data-handle]');
    if (!h || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var row = h.closest('.edit-row');
    var list = row.parentElement;
    var rows = Array.prototype.slice.call(list.querySelectorAll('.edit-row'));
    var rects = rows.map(function (r) { return r.getBoundingClientRect(); });
    var from = rows.indexOf(row);
    var gap = rows.length > 1 ? rects[1].top - rects[0].bottom : 8;
    drag = {
      pointer: e.pointerId, handle: h, row: row, list: list, rows: rows, rects: rects,
      from: from, to: from, step: rects[from].height + gap,
      startY: e.clientY, scroll0: window.scrollY, lastY: e.clientY
    };
    try { h.setPointerCapture(e.pointerId); } catch (_) {}
    row.classList.add('dragging');
    list.classList.add('sorting');
    e.preventDefault();
  });

  function move(clientY) {
    var d = drag;
    var dy = clientY - d.startY + (window.scrollY - d.scroll0);
    d.row.style.transform = 'translateY(' + dy + 'px)';
    var r = d.rects[d.from];
    var center = r.top + r.height / 2 + dy;
    var to = d.from;
    for (var i = 0; i < d.rects.length; i++) {
      if (i === d.from) continue;
      var mid = d.rects[i].top + d.rects[i].height / 2;
      if (i > d.from && center > mid) to = i;
      if (i < d.from && center < mid && to >= d.from) to = i;
    }
    d.to = to;
    d.rows.forEach(function (el, idx) {
      if (idx === d.from) return;
      var shift = 0;
      if (d.from < to && idx > d.from && idx <= to) shift = -d.step;
      if (d.from > to && idx < d.from && idx >= to) shift = d.step;
      el.style.transform = shift ? 'translateY(' + shift + 'px)' : '';
    });
  }

  root.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    drag.lastY = e.clientY;
    // Top edge allows for the status bar + sticky nav.
    if (e.clientY < EDGE * 2) window.scrollBy(0, -EDGE_SPEED);
    else if (e.clientY > window.innerHeight - EDGE) window.scrollBy(0, EDGE_SPEED);
    move(e.clientY);
    e.preventDefault();
  });

  function end(e, commit) {
    if (!drag || e.pointerId !== drag.pointer) return;
    var d = drag;
    drag = null;
    if (commit && d.to !== d.from) {
      // Leave transforms in place: the re-render FLIPs from where rows are now.
      onMove(d.row.dataset.id, d.to);
      return;
    }
    d.list.classList.remove('sorting');
    d.row.style.transition = 'transform .18s cubic-bezier(.2,.8,.2,1)';
    d.rows.forEach(function (el) { el.style.transform = ''; });
    setTimeout(function () { d.row.classList.remove('dragging'); d.row.style.transition = ''; }, 180);
  }
  root.addEventListener('pointerup', function (e) { end(e, true); });
  root.addEventListener('pointercancel', function (e) { end(e, false); });

  root.addEventListener('keydown', function (e) {
    var h = e.target.closest && e.target.closest('[data-handle]');
    if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    var rows = Array.prototype.slice.call(h.closest('.items').querySelectorAll('.edit-row'));
    var idx = rows.indexOf(h.closest('.edit-row'));
    var to = idx + (e.key === 'ArrowUp' ? -1 : 1);
    e.preventDefault();
    if (to < 0 || to >= rows.length) return;
    onMove(h.dataset.handle, to, true);
  });
}
