import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import GuestHeader from '../components/GuestHeader.jsx';

const EMPTY = { username: '', email: '', password: '', confirm: '' };

/**
 * Mirrors the server rules in routes/auth.js so most mistakes are caught before a request.
 * The server checks again: these messages are a convenience, not the enforcement.
 */
function validate(f) {
  const errors = {};
  const username = f.username.trim();
  if (username.length < 3 || username.length > 30) errors.username = 'Username 3–30 karakter.';
  else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) errors.username = 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = 'Format email tidak valid.';
  if (f.password.length < 8) errors.password = 'Password minimal 8 karakter.';
  // bcrypt reads only 72 bytes, so the server refuses anything longer.
  else if (new TextEncoder().encode(f.password).length > 72) errors.password = 'Password maksimal 72 byte.';
  if (f.confirm !== f.password) errors.confirm = 'Konfirmasi password tidak sama.';
  return errors;
}

const CONFLICT = {
  email_taken: { email: 'Email ini sudah terdaftar. Masuk dengan email tersebut, atau pakai email lain.' },
  username_taken: { username: 'Username ini sudah dipakai. Pilih yang lain.' },
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    const payload = { username: form.username.trim(), email: form.email.trim(), password: form.password };
    try {
      await api.register(payload);
    } catch (err) {
      setSubmitting(false);
      if (err.status === 409) return setErrors(CONFLICT[err.body?.reason] ?? {});
      if (err.status === 400 && err.body?.details) {
        return setErrors(Object.fromEntries(err.body.details.map((d) => [d.path, d.message])));
      }
      return setFormError('Server tidak merespons. Pastikan API berjalan di port 4000, lalu coba lagi.');
    }
    // Registering returns only user_id (as in the sequence diagram); signing in is a separate step.
    try {
      await api.login(payload.email, payload.password);
      navigate('/overview', { replace: true });
    } catch {
      navigate('/login', { replace: true, state: { email: payload.email } });
    }
  }

  // The error sits outside <label> so it is announced as a description, not read as part of the field name.
  const field = (key, label, props) => (
    <div className="field">
      <label className="label" htmlFor={`register-${key}`}>{label}</label>
      <input id={`register-${key}`} className="input" value={form[key]} onChange={update(key)}
             aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} {...props} />
      {errors[key] && <span id={`${key}-error`} className="field__error">{errors[key]}</span>}
    </div>
  );

  return (
    <>
      <GuestHeader />
      <main>
        <div className="page">
          <section className="section auth-page">
            <div className="label label--ink">DAFTAR</div>
            <h2 style={{ marginTop: 8 }}>Buat akun untuk menyimpan level dan progresmu</h2>
            <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
              Setelah mendaftar, kamu langsung masuk dan bisa memulai tes diagnostik.
            </p>

            <form className="stack" onSubmit={onSubmit} noValidate>
              {field('username', 'USERNAME', { autoComplete: 'username', placeholder: '3–30 karakter' })}
              {field('email', 'EMAIL', { type: 'email', autoComplete: 'email', placeholder: 'nama@binus.ac.id' })}
              {field('password', 'PASSWORD', { type: 'password', autoComplete: 'new-password', placeholder: 'Minimal 8 karakter' })}
              {field('confirm', 'KONFIRMASI PASSWORD', { type: 'password', autoComplete: 'new-password' })}

              {formError && <div className="callout" role="alert">{formError}</div>}

              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Membuat akun…' : 'Daftar'}
              </button>
            </form>

            <p style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
              Sudah punya akun? <Link to="/login">Masuk</Link>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
