'use strict';
/** Minimal stand-in for Python's naive `datetime` (UTC) used by templates and e-mails. */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const p2 = (n) => String(n).padStart(2, '0');

class PyDateTime {
  /** @param {string} raw Postgres text: "YYYY-MM-DD HH:MM:SS[.ffffff]" */
  constructor(raw) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(String(raw));
    if (!m) throw new Error('Unparseable timestamp: ' + raw);
    this.year = +m[1]; this.month = +m[2]; this.day = +m[3];
    this.hour = +m[4]; this.minute = +m[5]; this.second = +m[6];
    this.microsecond = m[7] ? parseInt(m[7].padEnd(6, '0').slice(0, 6), 10) : 0;
  }
  /** Python `str(datetime)` */
  toString() {
    const base = `${String(this.year).padStart(4, '0')}-${p2(this.month)}-${p2(this.day)} ` +
      `${p2(this.hour)}:${p2(this.minute)}:${p2(this.second)}`;
    return this.microsecond ? `${base}.${String(this.microsecond).padStart(6, '0')}` : base;
  }
  strftime(fmt) {
    const weekday = (new Date(Date.UTC(this.year, this.month - 1, this.day)).getUTCDay() + 6) % 7;
    const h12 = this.hour % 12 === 0 ? 12 : this.hour % 12;
    return String(fmt).replace(/%([a-zA-Z%])/g, (_, c) => ({
      d: p2(this.day), m: p2(this.month), Y: String(this.year), y: p2(this.year % 100),
      b: MONTHS[this.month - 1], B: MONTHS_FULL[this.month - 1],
      a: DAYS[weekday], A: DAYS_FULL[weekday],
      H: p2(this.hour), I: p2(h12), M: p2(this.minute), S: p2(this.second),
      p: this.hour < 12 ? 'AM' : 'PM', f: String(this.microsecond).padStart(6, '0'), '%': '%',
    }[c] ?? `%${c}`));
  }
}

module.exports = { PyDateTime };
