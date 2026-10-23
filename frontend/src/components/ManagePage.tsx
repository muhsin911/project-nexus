import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteDsaProblem,
  getDsaProblems,
  getResumeStatus,
  saveDsaProblem,
  uploadResume,
  verifyAdminToken,
  type DsaProblem,
  type DsaProblemInput,
  type ResumeStatus,
} from '@/lib/portfolioApi';

const emptyProblem: DsaProblemInput = {
  title: '',
  platform: '',
  difficulty: 'Medium',
  problem_url: '',
  tags: [],
  summary: '',
  solution: '',
  time_complexity: '',
  space_complexity: '',
  solved_at: null,
};

export function ManagePage() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [form, setForm] = useState<DsaProblemInput>(emptyProblem);
  const [editingId, setEditingId] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Manage portfolio · Project NEXUS';
    return () => {
      document.title = 'Project NEXUS — Portfolio';
    };
  }, []);

  async function loadPortfolioContent() {
    const [dsaProblems, resumeStatus] = await Promise.all([
      getDsaProblems(),
      getResumeStatus(),
    ]);
    setProblems(dsaProblems);
    setResume(resumeStatus);
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      await verifyAdminToken(token);
      await loadPortfolioContent();
      setAuthenticated(true);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not open portfolio management.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      await saveDsaProblem(form, token, editingId);
      await loadPortfolioContent();
      setForm(emptyProblem);
      setEditingId(undefined);
      setFeedback(editingId ? 'Solved problem updated.' : 'Solved problem added.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The problem could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get('resume');
    if (!(file instanceof File) || file.size === 0) {
      setFeedback('Choose a PDF before uploading.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback('Choose a PDF that is 10 MB or smaller.');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      await uploadResume(file, token);
      setResume(await getResumeStatus());
      formElement.reset();
      setFeedback('Your résumé is uploaded and available on the public portfolio.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The résumé could not be uploaded.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProblem(problem: DsaProblem) {
    if (!window.confirm(`Remove “${problem.title}” from the public DSA log?`)) return;
    setBusy(true);
    setFeedback('');
    try {
      await deleteDsaProblem(problem.id, token);
      await loadPortfolioContent();
      if (editingId === problem.id) {
        setEditingId(undefined);
        setForm(emptyProblem);
      }
      setFeedback('Solved problem removed.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The problem could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  function beginEditing(problem: DsaProblem) {
    setEditingId(problem.id);
    setForm({
      title: problem.title,
      platform: problem.platform,
      difficulty: problem.difficulty,
      problem_url: problem.problem_url,
      tags: problem.tags,
      summary: problem.summary,
      solution: problem.solution,
      time_complexity: problem.time_complexity,
      space_complexity: problem.space_complexity,
      solved_at: problem.solved_at,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="manage-shell">
      <header className="manage-header">
        <a className="wordmark" href="/">
          <span className="wordmark-mark">N.</span><span>PORTFOLIO / MANAGEMENT</span>
        </a>
        <a className="manage-back" href="/">← Back to portfolio</a>
      </header>
      <section className="manage-content">
        {!authenticated ? (
          <div className="manage-gate">
            <p className="eyebrow">OWNER ACCESS · PRIVATE</p>
            <h1>Your work,<br /><em>your story.</em></h1>
            <p>Enter the portfolio admin token configured for this site to manage your résumé and solved-problem log.</p>
            <form className="manage-login" onSubmit={handleUnlock}>
              <label htmlFor="admin-token">Portfolio admin token</label>
              <input
                autoComplete="current-password"
                id="admin-token"
                onChange={(event) => setToken(event.currentTarget.value)}
                placeholder="Paste your private token"
                required
                type="password"
                value={token}
              />
              <button className="button button-primary" disabled={busy} type="submit">
                {busy ? 'Checking…' : 'Open management'} <span aria-hidden="true">↗</span>
              </button>
              {feedback && <p className="manage-feedback" role="alert">{feedback}</p>}
            </form>
            <p className="manage-security">Your token stays in this page&apos;s memory and is never saved in browser storage.</p>
          </div>
        ) : (
          <>
            <div className="manage-title">
              <div>
                <p className="eyebrow">OWNER ACCESS · CONTENT STUDIO</p>
                <h1>Make it <em>yours.</em></h1>
              </div>
              <button
                className="manage-signout"
                onClick={() => {
                  setAuthenticated(false);
                  setToken('');
                }}
                type="button"
              >Sign out</button>
            </div>

            {feedback && <p className="manage-feedback" role="status">{feedback}</p>}

            <section className="manage-card">
              <div className="manage-card-heading">
                <div><span>01</span><h2>Résumé</h2></div>
                <p>{resume.available ? `Published · ${resume.filename}` : 'No résumé published yet'}</p>
              </div>
              <p className="manage-help">Upload a PDF up to 10 MB. It is saved in the portfolio database and becomes publicly downloadable.</p>
              <form className="resume-upload" onSubmit={handleUploadResume}>
                <label className="file-picker">
                  <span>{resume.available ? 'Choose a replacement PDF' : 'Choose your résumé PDF'}</span>
                  <input accept="application/pdf,.pdf" name="resume" required type="file" />
                </label>
                <button className="button button-dark" disabled={busy} type="submit">
                  {busy ? 'Uploading…' : 'Upload résumé'} <span aria-hidden="true">↑</span>
                </button>
              </form>
            </section>

            <section className="manage-card">
              <div className="manage-card-heading">
                <div><span>02</span><h2>{editingId ? 'Edit solved problem' : 'Add a solved problem'}</h2></div>
                <p>{problems.length} {problems.length === 1 ? 'entry' : 'entries'}</p>
              </div>
              <p className="manage-help">Each entry appears individually in the public DSA log. Add your own solution notes and complexity.</p>
              <form className="problem-form" onSubmit={handleSaveProblem}>
                <label>Problem title<input maxLength={200} onChange={(event) => setForm({ ...form, title: event.currentTarget.value })} required value={form.title} /></label>
                <div className="form-row">
                  <label>Platform<input maxLength={80} onChange={(event) => setForm({ ...form, platform: event.currentTarget.value })} placeholder="e.g. LeetCode" required value={form.platform} /></label>
                  <label>Difficulty
                    <select onChange={(event) => setForm({ ...form, difficulty: event.currentTarget.value as DsaProblemInput['difficulty'] })} value={form.difficulty}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </label>
                </div>
                <label>Problem link<input onChange={(event) => setForm({ ...form, problem_url: event.currentTarget.value })} placeholder="https://…" required type="url" value={form.problem_url} /></label>
                <label>Topics, separated by commas<input onChange={(event) => setForm({ ...form, tags: event.currentTarget.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="arrays, dynamic programming" value={form.tags.join(', ')} /></label>
                <label>What was the key idea?<textarea maxLength={4000} onChange={(event) => setForm({ ...form, summary: event.currentTarget.value })} required rows={3} value={form.summary} /></label>
                <label>Your solution or notes<textarea maxLength={20000} onChange={(event) => setForm({ ...form, solution: event.currentTarget.value })} required rows={6} value={form.solution} /></label>
                <div className="form-row">
                  <label>Time complexity<input maxLength={120} onChange={(event) => setForm({ ...form, time_complexity: event.currentTarget.value })} placeholder="O(n)" required value={form.time_complexity} /></label>
                  <label>Space complexity<input maxLength={120} onChange={(event) => setForm({ ...form, space_complexity: event.currentTarget.value })} placeholder="O(n)" required value={form.space_complexity} /></label>
                </div>
                <label>Date solved<input onChange={(event) => setForm({ ...form, solved_at: event.currentTarget.value || null })} type="date" value={form.solved_at ?? ''} /></label>
                <div className="form-actions">
                  {editingId && <button className="manage-signout" onClick={() => { setEditingId(undefined); setForm(emptyProblem); }} type="button">Cancel edit</button>}
                  <button className="button button-dark" disabled={busy} type="submit">
                    {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add to DSA log'} <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </form>
            </section>

            <section className="manage-card">
              <div className="manage-card-heading">
                <div><span>03</span><h2>Published problems</h2></div>
              </div>
              {problems.length === 0 ? (
                <p className="manage-help">No solved problems yet. Your first entry will appear here once you add it above.</p>
              ) : (
                <ul className="manage-problem-list">
                  {problems.map((problem) => (
                    <li key={problem.id}>
                      <div><strong>{problem.title}</strong><span>{problem.platform} · {problem.difficulty}</span></div>
                      <div className="manage-item-actions">
                        <button onClick={() => beginEditing(problem)} type="button">Edit</button>
                        <button disabled={busy} onClick={() => void handleDeleteProblem(problem)} type="button">Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
