import { Link, Navigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
const isModuleLocked = (e) => e?.status === 403 && e.body?.reason === 'module_locked';

/** review[i] aligns with quiz[i]; falls back to the bare letter if the option is not found. */
function optionLabel(item, k) {
  const text = item?.options?.find((o) => o.key === k)?.text;
  return text === undefined ? k : `${k.toUpperCase()}. ${text}`;
}

/** /modules/:id/quiz — the questions, on their own page so the material stays readable. */
export default function ModuleQuiz() {
  const { id } = useParams();
  return <QuizView key={id} id={id} />;
}

function QuizView({ id }) {
  const { data, loading } = useApi(() => api.module(id), [id]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (loading || !data) return <Loading />;

  const m = data.module;
  const isAdmin = Boolean(api.user?.is_admin);

  if (m.locked) return <Navigate to={`/modules/${id}`} replace />;
  // The quiz opens only once the material page has been read into progress.
  // The server enforces the same rule; this just avoids a dead end.
  if (!m.state && !isAdmin) return <Navigate to={`/modules/${id}`} replace />;
  if (!m.quiz?.length) return <Navigate to={`/modules/${id}`} replace />;

  const answered = m.quiz.every((_, i) => answers[i]);
  const passed = result?.passed === true;
  const failed = result !== null && !result.passed;
  const status = m.quiz_status;
  const pct = (n) => `${Math.round(n * 100)}%`;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.submitQuiz(m._id, m.quiz.map((_, i) => answers[i])));
    } catch (e) {
      if (isModuleLocked(e)) setError('Modul ini terkunci. Kembali ke materi.');
      else if (e?.status === 409) setError('Buka halaman materinya dulu sebelum mengerjakan soal.');
      else setError('Jawaban belum terkirim. Coba lagi.');
    } finally { setBusy(false); }
  };

  return (
    <div className="page quiz-page">
      <Link to={`/modules/${id}`} className="crumb">← Kembali ke materi</Link>

      <div className="eyebrow">Modul {pad2(m.order)} · Cek pemahaman</div>
      <h1 style={{ marginTop: 'var(--space-2)' }}>{m.title}</h1>
      <p className="quiz-page__intro">
        {m.quiz.length} pertanyaan. Lulus di 70%, dan kamu boleh mengulang sebanyak yang kamu perlu.
        Pembahasan muncul setelah lulus.
      </p>
      {status?.attempts > 0 && (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Percobaan sebelumnya: {status.attempts} · Skor terbaik: {status.best_score === null ? '—' : pct(status.best_score)}
        </p>
      )}

      {!passed && m.quiz.map((q, i) => (
        /* A plain group, not a fieldset: a <legend> renders inside the box's
           top border and leaves a gap beneath it that padding cannot fix. */
        <div key={i} className="question" role="group" aria-labelledby={`q${i}`}>
          <p className="question__text" id={`q${i}`}>{i + 1}. {q.question}</p>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {q.options.map((o) => (
              <button
                key={o.key} type="button" className={`option${answers[i] === o.key ? ' is-picked' : ''}`}
                disabled={busy || failed} aria-pressed={answers[i] === o.key}
                onClick={() => setAnswers((a) => ({ ...a, [i]: o.key }))}
              >
                <span className="option__key">{o.key.toUpperCase()}</span>{o.text}
              </button>
            ))}
          </div>
          {/* Only the admin (dev/demo) receives the key before passing. */}
          {q.correct_answer && (
            <div className="callout" style={{ marginTop: 'var(--space-3)' }}>
              <strong>Admin · kunci:</strong> {optionLabel(q, q.correct_answer)}
              <div style={{ marginTop: 4 }}>{q.explanation}</div>
            </div>
          )}
        </div>
      ))}

      {error && <div className="callout" style={{ marginTop: 'var(--space-5)' }}>{error}</div>}

      {result === null && (
        <div className="quiz-page__submit">
          <button className="btn btn--lg" disabled={!answered || busy} onClick={submit}>
            {busy ? 'Mengirim…' : 'Kirim jawaban'}
          </button>
          {!answered && <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Jawab semua pertanyaan dulu.</span>}
        </div>
      )}

      {failed && (
        <div className="quiz-result">
          <div className="callout">
            Skor {result.correct_count}/{result.total} ({pct(result.score)}) — butuh 70%.
          </div>
          <div className="row" style={{ marginTop: 'var(--space-4)' }}>
            <button className="btn" onClick={() => { setAnswers({}); setResult(null); }}>Coba lagi</button>
            <Link to={`/modules/${id}`}>Baca ulang materinya</Link>
          </div>
        </div>
      )}

      {passed && (
        <div className="quiz-result">
          <div className="callout callout--green">
            Skor {result.correct_count}/{result.total} ({pct(result.score)}) — lulus. Modul ini ditandai selesai.
          </div>
          <h2 className="section-title" style={{ marginTop: 'var(--space-6)' }}>Pembahasan</h2>
          <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
            {(result.review || []).map((r, i) => (
              <div key={i} className="review">
                <p className="review__q">{i + 1}. {r.question}</p>
                <p className="muted">Jawaban kamu: {optionLabel(m.quiz[i], r.your_answer)}</p>
                <p className="muted">Jawaban benar: {optionLabel(m.quiz[i], r.correct_answer)}</p>
                <p>{r.explanation}</p>
              </div>
            ))}
          </div>
          <div className="quiz-page__submit">
            {result.next_module_id
              ? <Link className="btn btn--lg" to={`/modules/${result.next_module_id}`}>Lanjut ke modul berikutnya</Link>
              : <Link className="btn btn--lg" to={data.path ? `/paths/${data.path.level}` : '/modules'}>Kembali ke ikhtisar jalur</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
