'use strict';
/** Small helpers reproducing Python/Jinja behaviours the original app relied on. */

/** Python `str.title()` */
function pyTitle(s) {
  let out = '';
  let prevCased = false;
  for (const ch of String(s)) {
    const cased = ch.toLowerCase() !== ch.toUpperCase();
    out += cased ? (prevCased ? ch.toLowerCase() : ch.toUpperCase()) : ch;
    prevCased = cased;
  }
  return out;
}

/** Jinja `truncate` filter (length, killwords=False, end='...', leeway=5) */
function jinjaTruncate(value, length = 255, killwords = false, end = '...', leeway = 5) {
  const s = value === undefined || value === null ? '' : String(value);
  if (s.length <= length + leeway) return s;
  if (killwords) return s.slice(0, length - end.length) + end;
  const cut = s.slice(0, length - end.length);
  const idx = cut.lastIndexOf(' ');
  return (idx === -1 ? cut : cut.slice(0, idx)) + end;
}

/** Python `"%02d" % n` style subset used by the templates (%d, %0Nd, %s, %%). */
function pyFormat(fmt, ...args) {
  let i = 0;
  return String(fmt).replace(/%(0?)(\d*)([ds%])/g, (_, zero, width, type) => {
    if (type === '%') return '%';
    let v = args[i++];
    if (type === 'd') v = String(Math.trunc(Number(v)));
    else v = String(v);
    return width ? v.padStart(parseInt(width, 10), zero ? '0' : ' ') : v;
  });
}

/** Flask `jsonify` (default provider): sorted keys, compact separators. */
function flaskJson(obj) {
  const sort = (v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v).sort().reduce((a, k) => ((a[k] = sort(v[k])), a), {})
    : v);
  return JSON.stringify(sort(obj)).replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** Markup-safe escaping identical to markupsafe.escape (used for WTForms-style HTML). */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;').replace(/'/g, '&#39;');
}

module.exports = { pyTitle, jinjaTruncate, pyFormat, flaskJson, escapeHtml };
