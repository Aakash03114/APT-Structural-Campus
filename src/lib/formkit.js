'use strict';
/**
 * A small WTForms look-alike. It reproduces what the original Flask-WTF forms did:
 *   - the same validators, in the same order, with the same default error messages;
 *   - the same HTML for `form.field(...)`, `form.field.label(...)`, `form.hidden_tag()`
 *     (attribute order, `required` / `minlength` / `maxlength` / `min` / `max` flags, escaping).
 * so the existing Jinja templates render identically.
 */
const { escapeHtml } = require('./pyutil');
const csrf = require('./csrf');

// ---------------------------------------------------------------- validators
const DataRequired = (message) => ({ kind: 'required', message });
const Optional = () => ({ kind: 'optional' });
const Email = (message) => ({ kind: 'email', message });
const Length = (opts) => ({ kind: 'length', min: opts.min ?? -1, max: opts.max ?? -1, message: opts.message });
const NumberRange = (opts) => ({ kind: 'range', min: opts.min ?? null, max: opts.max ?? null, message: opts.message });

const { domainToASCII } = require('url');
const SPECIAL_USE_TLDS = new Set(['arpa', 'invalid', 'local', 'localhost', 'onion', 'test']);
const LOCAL_RE = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+)*$/u;
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Mirrors the `email_validator` rules WTForms' Email() applies (syntax only, no DNS lookups). */
function isValidEmail(address) {
  if (typeof address !== 'string' || /[\s\p{C}]/u.test(address)) return false;
  const at = address.lastIndexOf('@');
  if (at < 1 || at === address.length - 1) return false;
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  if (!LOCAL_RE.test(local)) return false;
  const ascii = domainToASCII(domain);
  if (!ascii || ascii.length > 253) return false;
  const labels = ascii.split('.');
  if (labels.length < 2 || !labels.every((l) => LABEL_RE.test(l))) return false;
  const tld = labels[labels.length - 1];
  if (/^[0-9]+$/.test(tld) || SPECIAL_USE_TLDS.has(tld)) return false;
  return address.length <= 254;
}

const cpLen = (s) => [...String(s)].length; // Python len() counts code points

class StopValidation extends Error {}

function runValidator(v, field) {
  const data = field.data;
  switch (v.kind) {
    case 'required': {
      if (data && (typeof data !== 'string' || data.trim())) return;
      field.errors.length = 0;
      throw Object.assign(new StopValidation(v.message || 'This field is required.'), { stop: true });
    }
    case 'optional': {
      const raw = field.rawData;
      if (!raw || raw.length === 0 || (typeof raw[0] === 'string' && !raw[0].trim())) {
        field.errors.length = 0;
        throw Object.assign(new StopValidation(''), { stop: true });
      }
      return;
    }
    case 'email': {
      if (data === null || data === undefined || !isValidEmail(data)) {
        throw new Error(v.message || 'Invalid email address.');
      }
      return;
    }
    case 'length': {
      const l = data ? cpLen(data) : 0;
      if (l < v.min || (v.max !== -1 && l > v.max)) {
        let message = v.message;
        if (!message) {
          if (v.max === -1) message = `Field must be at least ${v.min} character${v.min === 1 ? '' : 's'} long.`;
          else if (v.min === -1) message = `Field cannot be longer than ${v.max} character${v.max === 1 ? '' : 's'}.`;
          else if (v.min === v.max) message = `Field must be exactly ${v.min} character${v.min === 1 ? '' : 's'} long.`;
          else message = `Field must be between ${v.min} and ${v.max} characters long.`;
        }
        throw new Error(message);
      }
      return;
    }
    case 'range': {
      if (data === null || data === undefined || Number.isNaN(data) ||
          (v.min !== null && data < v.min) || (v.max !== null && data > v.max)) {
        let message = v.message;
        if (!message) {
          if (v.max === null) message = `Number must be at least ${v.min}.`;
          else if (v.min === null) message = `Number must be at most ${v.max}.`;
          else message = `Number must be between ${v.min} and ${v.max}.`;
        }
        throw new Error(message);
      }
      return;
    }
    default:
      return;
  }
}

// ---------------------------------------------------------------- HTML helpers
function htmlParams(attrs) {
  return Object.keys(attrs).sort().map((k) => {
    const v = attrs[k];
    if (v === true) return escapeHtml(k);
    if (v === false || v === null || v === undefined) return null;
    return `${escapeHtml(k)}="${escapeHtml(v)}"`;
  }).filter(Boolean).join(' ');
}

const safe = (html) => require('nunjucks').runtime.markSafe(html);

// kwargs arrive from Nunjucks as a trailing object flagged with __keywords
function kwargsOf(args) {
  const last = args[args.length - 1];
  if (last && typeof last === 'object' && last.__keywords) {
    const { __keywords, ...rest } = last;
    return rest;
  }
  return {};
}

const INT_RE = /^[+-]?\p{Nd}+(?:_\p{Nd}+)*$/u;

/** Python int() accepts any Unicode decimal digit (e.g. Arabic-Indic) and "1_000" style underscores. */
function pyInt(text) {
  let digits = '';
  for (const ch of text.replace(/_/g, '')) {
    if (ch === '+' || ch === '-') { digits += ch; continue; }
    let cp = ch.codePointAt(0);
    if (cp >= 48 && cp <= 57) { digits += ch; continue; }
    let start = cp;
    while (/^\p{Nd}$/u.test(String.fromCodePoint(start - 1))) start -= 1;
    digits += String((cp - start) % 10);
  }
  return parseInt(digits, 10);
}

// ---------------------------------------------------------------- fields
function flagsFor(validators) {
  const flags = {};
  for (const v of validators) {
    if (v.kind === 'required') flags.required = true;
    if (v.kind === 'length') {
      if (v.min !== -1) flags.minlength = v.min;
      if (v.max !== -1) flags.maxlength = v.max;
    }
    if (v.kind === 'range') {
      if (v.min !== null) flags.min = v.min;
      if (v.max !== null) flags.max = v.max;
    }
  }
  return flags;
}

const ATTRS_BY_TYPE = {
  text: ['required', 'disabled', 'readonly', 'maxlength', 'minlength', 'pattern'],
  password: ['required', 'disabled', 'readonly', 'maxlength', 'minlength', 'pattern'],
  integer: ['required', 'disabled', 'readonly', 'max', 'min', 'step'],
  textarea: ['required', 'disabled', 'readonly', 'maxlength', 'minlength'],
  select: ['required', 'disabled', 'readonly'],
  submit: ['required', 'disabled', 'readonly', 'maxlength', 'minlength', 'pattern'],
};

function buildField(def, formdata) {
  const { name, label, type, choices = [], validators = [] } = def;
  const flags = flagsFor(validators);

  const field = function render(...args) {
    const kw = kwargsOf(args);
    const attrs = { ...kw };
    if (attrs.id === undefined) attrs.id = name;
    for (const k of ATTRS_BY_TYPE[type]) {
      if (flags[k] !== undefined && attrs[k] === undefined) attrs[k] = flags[k];
    }
    if (type === 'textarea') {
      return safe(`<textarea ${htmlParams({ name, ...attrs })}>\r\n${escapeHtml(field._value())}</textarea>`);
    }
    if (type === 'select') {
      const opts = choices.map(([value, text]) => {
        const o = { value };
        if (String(value) === field.data) o.selected = true;
        return `<option ${htmlParams(o)}>${escapeHtml(text)}</option>`;
      }).join('');
      return safe(`<select ${htmlParams({ name, ...attrs })}>${opts}</select>`);
    }
    const inputType = { text: 'text', password: 'password', integer: 'number', submit: 'submit' }[type];
    if (attrs.type === undefined) attrs.type = inputType;
    if (type === 'password') attrs.value = '';
    else if (attrs.value === undefined) attrs.value = type === 'submit' ? label : field._value();
    return safe(`<input ${htmlParams({ name, ...attrs })}>`);
  };

  Object.defineProperty(field, 'name', { value: name, configurable: true });
  field.__field = true;
  field.id = name;
  field.rawData = formdata ? (formdata[name] === undefined ? [] : [].concat(formdata[name])) : null;
  field.data = null;
  field.processErrors = [];
  // `undefined` (not []) while empty: templates test `form.x.errors` for truthiness and an empty
  // list is truthy in Nunjucks but falsy in Jinja.
  field.errors = undefined;

  field._value = () => {
    if (type === 'integer') {
      if (field.rawData && field.rawData.length) return field.rawData[0];
      return field.data !== null && field.data !== undefined ? String(field.data) : '';
    }
    return field.data !== null && field.data !== undefined ? String(field.data) : '';
  };

  field.label = (..._args) => {
    const kw = kwargsOf(_args);
    return safe(`<label ${htmlParams({ ...kw, for: name })}>${escapeHtml(label)}</label>`);
  };

  // process incoming form data
  if (formdata && field.rawData.length) {
    const raw = field.rawData[0];
    if (type === 'integer') {
      const t = String(raw).trim();
      if (INT_RE.test(t)) field.data = pyInt(t);
      else { field.data = null; field.processErrors.push('Not a valid integer value.'); }
    } else {
      field.data = String(raw);
    }
  }

  field.validate = () => {
    field.errors = [...field.processErrors];
    let stop = false;
    if (type === 'select' && !choices.some(([value]) => String(value) === field.data)) {
      field.errors.push('Not a valid choice.');
    }
    for (const v of validators) {
      try {
        runValidator(v, field);
      } catch (e) {
        if (e.stop) {
          if (e.message) field.errors.push(e.message);
          stop = true;
        } else {
          field.errors.push(e.message);
        }
      }
      if (stop) break;
    }
    return field.errors.length === 0;
  };

  return field;
}

/**
 * @param {object} spec     { fields: [def...] }
 * @param {object} req      Express request (needs req.body for POST and req.session for CSRF)
 */
function createForm(spec, req) {
  const submitted = req.method === 'POST';
  const formdata = submitted ? req.body || {} : null;
  const form = {};
  const fields = [];
  for (const def of spec.fields) {
    const f = buildField(def, formdata);
    form[def.name] = f;
    fields.push(f);
  }
  form.hidden_tag = () => safe(
    `<input id="csrf_token" name="csrf_token" type="hidden" value="${escapeHtml(csrf.generateToken(req))}">`
  );
  form.is_submitted = () => submitted;
  form.validate = () => {
    let ok = true;
    for (const f of fields) {
      if (!f.validate()) ok = false;
    }
    // Templates test `form.x.errors` for truthiness: an empty list is truthy in Nunjucks
    // (unlike Jinja), so expose "no errors" as `undefined`.
    for (const f of fields) if (f.errors.length === 0) f.errors = undefined;
    return ok;
  };
  form.validate_on_submit = () => submitted && form.validate();
  return form;
}

// ---------------------------------------------------------------- form specs (port of forms.py)
const T = 'text';
const specs = {
  AdminLoginForm: {
    fields: [
      { name: 'username', label: 'Username', type: T, validators: [DataRequired('Username is required.')] },
      { name: 'password', label: 'Password', type: 'password', validators: [DataRequired('Password is required.')] },
      { name: 'submit', label: 'Login', type: 'submit' },
    ],
  },
  RegistrationForm: {
    fields: [
      { name: 'full_name', label: 'Full Name', type: T, validators: [DataRequired(), Length({ min: 2, max: 120 })] },
      { name: 'email', label: 'Email Address', type: T, validators: [DataRequired(), Email(), Length({ max: 120 })] },
      { name: 'phone', label: 'Phone Number', type: T, validators: [DataRequired(), Length({ min: 10, max: 20 })] },
      {
        name: 'course', label: 'Select Course', type: 'select',
        choices: [
          ['', 'Select a Course'],
          ['2D Rebar Detailing', '2D Rebar Detailing'],
          ['Rebar Estimation', 'Rebar Estimation'],
          ['Concrete Estimation', 'Concrete Estimation'],
          ['3D Rebar Detailing', '3D Rebar Detailing — Coming Soon'],
        ],
        validators: [DataRequired()],
      },
      { name: 'qualification', label: 'Qualification', type: T, validators: [Length({ max: 100 })] },
      { name: 'message', label: 'Message', type: 'textarea', validators: [Length({ max: 1000 })] },
      { name: 'submit', label: 'Submit Registration', type: 'submit' },
    ],
  },
  EmployerRequestForm: {
    fields: [
      { name: 'company_name', label: 'Company Name', type: T, validators: [
        DataRequired('Company name is required.'),
        Length({ min: 2, max: 200, message: 'Company name must be between 2 and 200 characters.' })] },
      { name: 'contact_person', label: 'Contact Person', type: T, validators: [
        DataRequired('Contact person name is required.'),
        Length({ min: 2, max: 200, message: 'Contact person name must be between 2 and 200 characters.' })] },
      { name: 'email', label: 'Business Email', type: T, validators: [
        DataRequired('Business email is required.'),
        Email('Please enter a valid email address.'),
        Length({ max: 200 })] },
      { name: 'phone', label: 'Phone Number', type: T, validators: [
        DataRequired('Phone number is required.'),
        Length({ min: 10, max: 50, message: 'Phone number must be at least 10 characters.' })] },
      { name: 'location', label: 'Location / City', type: T, validators: [
        DataRequired('Company location is required.'),
        Length({ min: 2, max: 200, message: 'Location must be between 2 and 200 characters.' })] },
      { name: 'position', label: 'Position / Job Role', type: T, validators: [
        DataRequired('Position / Job role is required.'),
        Length({ min: 2, max: 200, message: 'Position must be between 2 and 200 characters.' })] },
      { name: 'employees_required', label: 'Number of Employees Required', type: 'integer', validators: [
        DataRequired('Please specify the number of positions needed.'),
        NumberRange({ min: 1, max: 1000, message: 'Number of employees must be at least 1.' })] },
      { name: 'experience', label: 'Required Experience', type: T, validators: [Optional(), Length({ max: 200 })] },
      {
        name: 'employment_type', label: 'Employment Type', type: 'select',
        choices: [
          ['', 'Select Employment Type'], ['Full Time', 'Full Time'], ['Part Time', 'Part Time'],
          ['Contract', 'Contract'], ['Internship', 'Internship'],
        ],
        validators: [DataRequired('Please select an employment type.')],
      },
      { name: 'skills', label: 'Required Skills & Tools', type: 'textarea', validators: [Optional(), Length({ max: 2000 })] },
      { name: 'job_description', label: 'Job Description / Role Requirements', type: 'textarea', validators: [Optional(), Length({ max: 5000 })] },
      { name: 'additional_message', label: 'Additional Message / Notes', type: 'textarea', validators: [Optional(), Length({ max: 2000 })] },
      { name: 'submit', label: 'Submit Hiring Request', type: 'submit' },
    ],
  },
  ContactForm: {
    fields: [
      { name: 'name', label: 'Full Name', type: T, validators: [
        DataRequired('Full name is required.'),
        Length({ min: 2, max: 120, message: 'Name must be between 2 and 120 characters.' })] },
      { name: 'email', label: 'Email Address', type: T, validators: [
        DataRequired('Email address is required.'),
        Email('Please enter a valid email address.'),
        Length({ max: 120 })] },
      { name: 'phone', label: 'Phone Number', type: T, validators: [Optional(), Length({ max: 50 })] },
      {
        name: 'subject', label: 'Enquiry Type', type: 'select',
        choices: [
          ['', 'Select an option'], ['course', 'Course Enquiry'], ['hiring', 'Hiring Solutions'],
          ['career', 'Career Opportunity'], ['general', 'General Enquiry'],
        ],
        validators: [DataRequired('Please select an enquiry type.')],
      },
      { name: 'message', label: 'Message', type: 'textarea', validators: [
        DataRequired('Message is required.'),
        Length({ min: 10, max: 3000, message: 'Message must be at least 10 characters.' })] },
      { name: 'submit', label: 'Send Enquiry', type: 'submit' },
    ],
  },
};

module.exports = { createForm, specs, htmlParams };
