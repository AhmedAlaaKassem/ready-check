// FLIP so ticked rows glide to their new spot (ported from the draft's render()).

export function capture(root) {
  var first = {};
  root.querySelectorAll('.row[data-id]').forEach(function (el) { first[el.dataset.id] = el.getBoundingClientRect().top; });
  return first;
}

export function play(root, first) {
  root.querySelectorAll('.row[data-id]').forEach(function (el) {
    var t = first[el.dataset.id];
    if (t == null) return;
    var dy = t - el.getBoundingClientRect().top;
    if (!dy) return;
    el.style.transition = 'none';
    el.style.transform = 'translateY(' + dy + 'px)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition = 'transform .34s cubic-bezier(.2,.8,.2,1)';
        el.style.transform = '';
      });
    });
  });
}
