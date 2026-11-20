/*!
 * KSS toast (Amin #9553 + #9571): the ONLY notice style in every KSS app.
 * Framework-free. Load it with <script src="toast.js"> (then use window.KssToast) or import it (CommonJS/ESM interop).
 * Pair it with toast.css. No dependency on app tokens: every colour has a fallback, apps may override the --kt-* variables.
 *
 *   KssToast.show(message, { kind: 'success'|'error'|'warning'|'info', title?, ms? })
 *   KssToast.success(msg, title?)  .error(msg, title?)  .warning(msg, title?)  .info(msg, title?)
 *   KssToast.clear()
 *
 * Page language comes from <html lang> (fa default titles, en otherwise); the stack sits in the top corner
 * (left in RTL, right in LTR; full width on a phone). Same notice twice shows once. Hover or focus pauses the timer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); module.exports.default = module.exports; }
  else root.KssToast = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var KINDS = {
    success: { ms: 3500, path: 'M5 12.5l4.2 4.2L19 7', title: { fa: 'انجام شد', en: 'Done' } },
    error: { ms: 7000, path: 'M6.5 6.5l11 11M17.5 6.5l-11 11', title: { fa: 'انجام نشد', en: 'Failed' } },
    warning: { ms: 6000, path: 'M12 7v6.5M12 17.2v.1', title: { fa: 'توجه', en: 'Attention' } },
    info: { ms: 4500, path: 'M12 11v6M12 7.3v.1', title: { fa: 'اطلاع', en: 'Note' } },
  };
  var MAX = 4;
  var closeLabel = { fa: 'بستن', en: 'Close' };

  function lang() { return (typeof document !== 'undefined' && /^fa|^ar/i.test(document.documentElement.lang || 'fa')) ? 'fa' : 'en'; }

  function host() {
    var box = document.getElementById('kss-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'kss-toasts'; box.className = 'kt-stack';
      document.body.appendChild(box);
    }
    return box;
  }

  function show(message, opts) {
    if (typeof document === 'undefined') return null;
    opts = opts || {};
    var kind = opts.kind === true ? 'error' : opts.kind === false ? 'success' : opts.kind;
    if (!KINDS[kind]) kind = 'info';
    var d = KINDS[kind], l = lang();
    var msg = String(message == null ? '' : message).replace(/\s*✓\s*$/, '').trim();
    var title = opts.title || d.title[l];
    if (!msg && !opts.title) return null;
    var ms = opts.ms || d.ms;
    var box = host();
    Array.prototype.forEach.call(box.querySelectorAll('.kt'), function (t) { if (t.dataset.k === kind && t.dataset.m === msg) t.remove(); });
    var el = document.createElement('div');
    el.className = 'kt kt-' + kind; el.dataset.k = kind; el.dataset.m = msg;
    el.setAttribute('role', kind === 'error' || kind === 'warning' ? 'alert' : 'status');
    el.style.setProperty('--kt-ms', ms + 'ms');
    el.innerHTML = '<span class="kt-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d.path + '"/></svg></span>' +
      '<div class="kt-tx"><b></b><p></p></div>' +
      '<button type="button" class="kt-x" aria-label="' + closeLabel[l] + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>' +
      '<i class="kt-bar" aria-hidden="true"></i>';
    el.querySelector('b').textContent = title;
    var p = el.querySelector('p'); if (msg) p.textContent = msg; else p.remove();
    var left = ms, since = Date.now(), tm = 0;
    function close() {
      clearTimeout(tm);
      if (!el.isConnected || el.classList.contains('kt-out')) return;
      el.classList.add('kt-out'); setTimeout(function () { el.remove(); }, 220);
    }
    function run() { since = Date.now(); tm = setTimeout(close, left); el.classList.remove('kt-hold'); }
    function hold() { clearTimeout(tm); left -= Date.now() - since; el.classList.add('kt-hold'); }
    el.addEventListener('mouseenter', hold); el.addEventListener('mouseleave', run);
    el.addEventListener('focusin', hold); el.addEventListener('focusout', run);
    el.querySelector('.kt-x').addEventListener('click', close);
    box.appendChild(el);
    var all = box.querySelectorAll('.kt:not(.kt-out)');
    for (var i = 0; i < all.length - MAX; i++) all[i].remove();
    run();
    return { close: close };
  }

  function clear() { var b = typeof document !== 'undefined' && document.getElementById('kss-toasts'); if (b) b.innerHTML = ''; }

  var api = { show: show, clear: clear };
  Object.keys(KINDS).forEach(function (k) { api[k] = function (msg, title, ms) { return show(msg, { kind: k, title: title, ms: ms }); }; });
  return api;
});
