import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  deleteDsaCategory,
  deleteDsaProblem,
  deletePortfolioContent,
  deletePortfolioImage,
  getAdminContent,
  getAdminDsaProblems,
  getAdminImages,
  getDsaCategories,
  getResumeStatus,
  loginAdmin,
  publicApiUrl,
  saveDsaCategory,
  saveDsaProblem,
  savePortfolioContent,
  uploadPortfolioImage,
  uploadResume,
  verifyAdminSession,
  type DsaCategory,
  type DsaCategoryInput,
  type DsaProblem,
  type DsaProblemInput,
  type PortfolioContent,
  type PortfolioContentInput,
  type PortfolioImage,
  type ResumeStatus,
} from '@/lib/portfolioApi';

type Panel = 'content' | 'dsa' | 'images' | 'resume';

const emptyContent: PortfolioContentInput = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  published: true,
  sort_order: 0,
  image_id: null,
};

const emptyCategory: DsaCategoryInput = { name: '', slug: '', description: '' };

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
  category_id: '',
};

export function ManagePage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nexus-admin-token') ?? '');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(Boolean(token));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [panel, setPanel] = useState<Panel>('content');
  const [content, setContent] = useState<PortfolioContent[]>([]);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [categories, setCategories] = useState<DsaCategory[]>([]);
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [contentForm, setContentForm] = useState<PortfolioContentInput>(emptyContent);
  const [categoryForm, setCategoryForm] = useState<DsaCategoryInput>(emptyCategory);
  const [problemForm, setProblemForm] = useState<DsaProblemInput>(emptyProblem);
  const [contentEditId, setContentEditId] = useState<string>();
  const [categoryEditId, setCategoryEditId] = useState<string>();
  const [problemEditId, setProblemEditId] = useState<string>();
  const [imageAlt, setImageAlt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshAll = useCallback(async (accessToken: string) => {
    const [allContent, allImages, allCategories, allProblems, resumeStatus] = await Promise.all([
      getAdminContent(accessToken),
      getAdminImages(accessToken),
      getDsaCategories(),
      getAdminDsaProblems(accessToken),
      getResumeStatus(),
    ]);
    setContent(allContent);
    setImages(allImages);
    setCategories(allCategories);
    setProblems(allProblems);
    setResume(resumeStatus);
    setProblemForm((previous) => ({
      ...previous,
      category_id: previous.category_id || allCategories[0]?.id || '',
    }));
  }, []);

  useEffect(() => {
    document.title = 'Owner sign in · Project NEXUS';
    if (!token) return;
    let active = true;
    verifyAdminSession(token)
      .then(async () => {
        if (!active) return;
        await refreshAll(token);
        if (!active) return;
        setAuthenticated(true);
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem('nexus-admin-token');
          setCheckingSession(false);
          setToken('');
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [refreshAll, token]);

  useEffect(() => {
    if (authenticated) document.title = 'Content studio · Project NEXUS';
  }, [authenticated]);

  useEffect(() => {
    function handleExpiredSession() {
      setAuthenticated(false);
      setToken('');
      setFeedback('Your session expired. Sign in again to continue.');
    }
    window.addEventListener('nexus-admin-session-expired', handleExpiredSession);
    return () => window.removeEventListener('nexus-admin-session-expired', handleExpiredSession);
  }, []);

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    setFeedback('');
    try {
      await action();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The requested change could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusy(async () => {
      const session = await loginAdmin(username, password);
      sessionStorage.setItem('nexus-admin-token', session.access_token);
      setToken(session.access_token);
      setPassword('');
      await refreshAll(session.access_token);
      setAuthenticated(true);
      setFeedback('Signed in. Your content studio is ready.');
    });
  }

  function signOut() {
    sessionStorage.removeItem('nexus-admin-token');
    setToken('');
    setPassword('');
    setAuthenticated(false);
    setContent([]);
    setImages([]);
    setProblems([]);
    setCategories([]);
    setFeedback('');
  }

  async function handleSaveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusy(async () => {
      await savePortfolioContent(contentForm, token, contentEditId);
      setContent(await getAdminContent(token));
      setContentForm(emptyContent);
      setContentEditId(undefined);
      setFeedback(contentEditId ? 'Content updated.' : 'Content created.');
    });
  }

  async function handleSaveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusy(async () => {
      await saveDsaCategory(categoryForm, token, categoryEditId);
      const nextCategories = await getDsaCategories();
      setCategories(nextCategories);
      setCategoryForm(emptyCategory);
      setCategoryEditId(undefined);
      setFeedback(categoryEditId ? 'Algorithm category updated.' : 'Algorithm category added.');
    });
  }

  async function handleSaveProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusy(async () => {
      await saveDsaProblem(problemForm, token, problemEditId);
      setProblems(await getAdminDsaProblems(token));
      setProblemForm({ ...emptyProblem, category_id: categories[0]?.id ?? '' });
      setProblemEditId(undefined);
      setFeedback(problemEditId ? 'Solved problem updated.' : 'Solved problem added.');
    });
  }

  async function handleUploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get('image');
    if (!(file instanceof File) || file.size === 0) {
      setFeedback('Choose an image before uploading.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback('Images must be 5 MB or smaller.');
      return;
    }
    await withBusy(async () => {
      await uploadPortfolioImage(file, imageAlt, token);
      setImages(await getAdminImages(token));
      setImageAlt('');
      formElement.reset();
      setFeedback('Image uploaded. You can now attach it to a content entry.');
    });
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
    await withBusy(async () => {
      await uploadResume(file, token);
      setResume(await getResumeStatus());
      formElement.reset();
      setFeedback('Résumé published to your portfolio.');
    });
  }

  async function handleDeleteContent(item: PortfolioContent) {
    if (!window.confirm(`Delete “${item.title}” from the portfolio?`)) return;
    await withBusy(async () => {
      await deletePortfolioContent(item.id, token);
      setContent(await getAdminContent(token));
      setFeedback('Content deleted.');
    });
  }

  async function handleDeleteCategory(category: DsaCategory) {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    await withBusy(async () => {
      await deleteDsaCategory(category.id, token);
      setCategories(await getDsaCategories());
      setFeedback('Category deleted.');
    });
  }

  async function handleDeleteProblem(problem: DsaProblem) {
    if (!window.confirm(`Remove “${problem.title}” from the DSA log?`)) return;
    await withBusy(async () => {
      await deleteDsaProblem(problem.id, token);
      setProblems(await getAdminDsaProblems(token));
      setFeedback('Solved problem deleted.');
    });
  }

  async function handleDeleteImage(image: PortfolioImage) {
    if (!window.confirm(`Delete image “${image.filename}”? Attached content will remain without an image.`)) return;
    await withBusy(async () => {
      await deletePortfolioImage(image.id, token);
      const [nextImages, nextContent] = await Promise.all([
        getAdminImages(token),
        getAdminContent(token),
      ]);
      setImages(nextImages);
      setContent(nextContent);
      setContentForm((previous) => previous.image_id === image.id ? { ...previous, image_id: null } : previous);
      setFeedback('Image deleted.');
    });
  }

  function editContent(item: PortfolioContent) {
    setPanel('content');
    setContentEditId(item.id);
    setContentForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      body: item.body,
      published: item.published,
      sort_order: item.sort_order,
      image_id: item.image_id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editCategory(category: DsaCategory) {
    setCategoryEditId(category.id);
    setCategoryForm({ name: category.name, slug: category.slug, description: category.description });
  }

  function editProblem(problem: DsaProblem) {
    setProblemEditId(problem.id);
    setProblemForm({
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
      category_id: problem.category_id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="manage-shell">
      <header className="manage-header">
        <a className="wordmark" href="/"><span className="wordmark-mark">N.</span><span>PRIVATE CONTENT STUDIO</span></a>
        <a className="manage-back" href="/">← Back to portfolio</a>
      </header>
      <section className="manage-content">
        {checkingSession ? (
          <div className="problem-empty" role="status"><p>Checking your owner session…</p></div>
        ) : !authenticated ? (
          <div className="manage-gate">
            <p className="eyebrow">OWNER ACCESS · PRIVATE</p>
            <h1>Welcome<br /><em>back.</em></h1>
            <p>Sign in to manage portfolio stories, images, your résumé, and the DSA library.</p>
            <form className="manage-login" onSubmit={handleLogin}>
              <label htmlFor="admin-username">Username
                <input autoComplete="username" id="admin-username" onChange={(event) => setUsername(event.currentTarget.value)} required value={username} />
              </label>
              <label htmlFor="admin-password">Password
                <input autoComplete="current-password" id="admin-password" onChange={(event) => setPassword(event.currentTarget.value)} required type="password" value={password} />
              </label>
              <button className="button button-primary" disabled={busy} type="submit">
                {busy ? 'Signing in…' : 'Enter content studio'} <span aria-hidden="true">↗</span>
              </button>
              {feedback && <p className="manage-feedback" role="alert">{feedback}</p>}
            </form>
            <p className="manage-security">Private owner route · access tokens expire automatically and stay in this browser tab.</p>
          </div>
        ) : (
          <>
            <div className="manage-title">
              <div><p className="eyebrow">OWNER ACCESS · CONTENT STUDIO</p><h1>Make it <em>yours.</em></h1></div>
              <button className="manage-signout" onClick={signOut} type="button">Sign out</button>
            </div>
            <nav className="cms-tabs" aria-label="Content studio sections">
              {([
                ['content', 'Stories', content.length],
                ['dsa', 'DSA library', problems.length],
                ['images', 'Images', images.length],
                ['resume', 'Résumé', resume.available ? 'LIVE' : '—'],
              ] as const).map(([id, label, count]) => (
                <button aria-pressed={panel === id} className={panel === id ? 'is-active' : ''} key={id} onClick={() => setPanel(id)} type="button">
                  {label}<span>{count}</span>
                </button>
              ))}
            </nav>
            {feedback && <p className="manage-feedback" role="status">{feedback}</p>}

            {panel === 'content' && (
              <>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>01</span><h2>{contentEditId ? 'Edit story' : 'Create a story'}</h2></div><p>PROJECTS · WRITING · ABOUT</p></div>
                  <p className="manage-help">Create portfolio stories and choose whether each item is publicly visible.</p>
                  <form className="problem-form" onSubmit={handleSaveContent}>
                    <label>Title<input maxLength={200} onChange={(event) => setContentForm({ ...contentForm, title: event.currentTarget.value })} required value={contentForm.title} /></label>
                    <label>URL slug<input maxLength={220} onChange={(event) => setContentForm({ ...contentForm, slug: event.currentTarget.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} required value={contentForm.slug} /></label>
                    <label>Short introduction<textarea maxLength={500} onChange={(event) => setContentForm({ ...contentForm, excerpt: event.currentTarget.value })} required rows={2} value={contentForm.excerpt} /></label>
                    <label>Content<textarea maxLength={30000} onChange={(event) => setContentForm({ ...contentForm, body: event.currentTarget.value })} required rows={8} value={contentForm.body} /></label>
                    <div className="form-row">
                      <label>Cover image
                        <select onChange={(event) => setContentForm({ ...contentForm, image_id: event.currentTarget.value || null })} value={contentForm.image_id ?? ''}>
                          <option value="">No image</option>{images.map((image) => <option key={image.id} value={image.id}>{image.filename} · {image.alt_text}</option>)}
                        </select>
                      </label>
                      <label>Display order<input max={10000} min={0} onChange={(event) => setContentForm({ ...contentForm, sort_order: Number(event.currentTarget.value) })} type="number" value={contentForm.sort_order} /></label>
                    </div>
                    <label className="checkbox-field"><input checked={contentForm.published} onChange={(event) => setContentForm({ ...contentForm, published: event.currentTarget.checked })} type="checkbox" /> Publish this story</label>
                    <div className="form-actions">
                      {contentEditId && <button className="manage-signout" onClick={() => { setContentEditId(undefined); setContentForm(emptyContent); }} type="button">Cancel edit</button>}
                      <button className="button button-dark" disabled={busy} type="submit">{busy ? 'Saving…' : contentEditId ? 'Save story' : 'Create story'} <span>↗</span></button>
                    </div>
                  </form>
                </section>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>02</span><h2>All stories</h2></div><p>{content.length} ENTRIES</p></div>
                  <ul className="manage-problem-list">
                    {content.map((item) => (
                      <li key={item.id}>
                        <div><strong>{item.title}</strong><span>{item.published ? 'Published' : 'Draft'} · /{item.slug}</span></div>
                        <div className="manage-item-actions"><button onClick={() => editContent(item)} type="button">Edit</button><button disabled={busy} onClick={() => void handleDeleteContent(item)} type="button">Delete</button></div>
                      </li>
                    ))}
                    {!content.length && <li><span>No stories yet. Create one above.</span></li>}
                  </ul>
                </section>
              </>
            )}

            {panel === 'dsa' && (
              <>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>01</span><h2>Algorithm categories</h2></div><p>{categories.length} TOPICS</p></div>
                  <form className="problem-form" onSubmit={handleSaveCategory}>
                    <label>Category name<input maxLength={80} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.currentTarget.value })} required value={categoryForm.name} /></label>
                    <label>URL slug<input maxLength={96} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.currentTarget.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} required value={categoryForm.slug} /></label>
                    <label>Description<input maxLength={1000} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.currentTarget.value })} value={categoryForm.description} /></label>
                    <div className="form-actions">
                      {categoryEditId && <button className="manage-signout" onClick={() => { setCategoryEditId(undefined); setCategoryForm(emptyCategory); }} type="button">Cancel edit</button>}
                      <button className="button button-dark" disabled={busy} type="submit">{categoryEditId ? 'Update category' : 'Add category'}</button>
                    </div>
                  </form>
                  <ul className="manage-problem-list category-list">
                    {categories.map((category) => {
                      const count = problems.filter((problem) => problem.category_id === category.id).length;
                      return <li key={category.id}><div><strong>{category.name}</strong><span>{category.description || category.slug} · {count} problems</span></div><div className="manage-item-actions"><button onClick={() => editCategory(category)} type="button">Edit</button><button disabled={busy || count > 0} onClick={() => void handleDeleteCategory(category)} type="button">Delete</button></div></li>;
                    })}
                  </ul>
                </section>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>02</span><h2>{problemEditId ? 'Edit solved problem' : 'Add a solved problem'}</h2></div><p>{problems.length} ENTRIES</p></div>
                  <form className="problem-form" onSubmit={handleSaveProblem}>
                    <label>Problem title<input maxLength={200} onChange={(event) => setProblemForm({ ...problemForm, title: event.currentTarget.value })} required value={problemForm.title} /></label>
                    <div className="form-row">
                      <label>Algorithm category<select onChange={(event) => setProblemForm({ ...problemForm, category_id: event.currentTarget.value })} required value={problemForm.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                      <label>Platform<input maxLength={80} onChange={(event) => setProblemForm({ ...problemForm, platform: event.currentTarget.value })} placeholder="e.g. LeetCode" required value={problemForm.platform} /></label>
                    </div>
                    <div className="form-row">
                      <label>Difficulty<select onChange={(event) => setProblemForm({ ...problemForm, difficulty: event.currentTarget.value as DsaProblemInput['difficulty'] })} value={problemForm.difficulty}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
                      <label>Date solved<input onChange={(event) => setProblemForm({ ...problemForm, solved_at: event.currentTarget.value || null })} type="date" value={problemForm.solved_at ?? ''} /></label>
                    </div>
                    <label>Problem link<input onChange={(event) => setProblemForm({ ...problemForm, problem_url: event.currentTarget.value })} required type="url" value={problemForm.problem_url} /></label>
                    <label>Topics, separated by commas<input onChange={(event) => setProblemForm({ ...problemForm, tags: event.currentTarget.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} value={problemForm.tags.join(', ')} /></label>
                    <label>Question summary<textarea maxLength={4000} onChange={(event) => setProblemForm({ ...problemForm, summary: event.currentTarget.value })} required rows={3} value={problemForm.summary} /></label>
                    <label>Answer and explanation<textarea maxLength={20000} onChange={(event) => setProblemForm({ ...problemForm, solution: event.currentTarget.value })} required rows={7} value={problemForm.solution} /></label>
                    <div className="form-row">
                      <label>Time complexity<input maxLength={120} onChange={(event) => setProblemForm({ ...problemForm, time_complexity: event.currentTarget.value })} placeholder="O(n)" required value={problemForm.time_complexity} /></label>
                      <label>Space complexity<input maxLength={120} onChange={(event) => setProblemForm({ ...problemForm, space_complexity: event.currentTarget.value })} placeholder="O(n)" required value={problemForm.space_complexity} /></label>
                    </div>
                    <div className="form-actions">
                      {problemEditId && <button className="manage-signout" onClick={() => { setProblemEditId(undefined); setProblemForm({ ...emptyProblem, category_id: categories[0]?.id ?? '' }); }} type="button">Cancel edit</button>}
                      <button className="button button-dark" disabled={busy || categories.length === 0} type="submit">{problemEditId ? 'Save changes' : 'Add to DSA log'} <span>↗</span></button>
                    </div>
                  </form>
                </section>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>03</span><h2>Published problems</h2></div></div>
                  <ul className="manage-problem-list">
                    {problems.map((problem) => <li key={problem.id}><div><strong>{problem.title}</strong><span>{categories.find((category) => category.id === problem.category_id)?.name ?? 'Uncategorized'} · {problem.platform} · {problem.difficulty}</span></div><div className="manage-item-actions"><button onClick={() => editProblem(problem)} type="button">Edit</button><button disabled={busy} onClick={() => void handleDeleteProblem(problem)} type="button">Delete</button></div></li>)}
                    {!problems.length && <li><span>No solved problems yet.</span></li>}
                  </ul>
                </section>
              </>
            )}

            {panel === 'images' && (
              <>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>01</span><h2>Image library</h2></div><p>JPEG · PNG · WEBP · MAX 5 MB</p></div>
                  <form className="problem-form" onSubmit={handleUploadImage}>
                    <label>Accessible image description<input maxLength={300} onChange={(event) => setImageAlt(event.currentTarget.value)} required value={imageAlt} /></label>
                    <label>Choose image<input accept="image/jpeg,image/png,image/webp" name="image" required type="file" /></label>
                    <button className="button button-dark" disabled={busy} type="submit">{busy ? 'Uploading…' : 'Upload image'} <span>↑</span></button>
                  </form>
                </section>
                <section className="manage-card">
                  <div className="manage-card-heading"><div><span>02</span><h2>Uploaded images</h2></div><p>{images.length} FILES</p></div>
                  <div className="image-library">
                    {images.map((image) => <article className="image-library-item" key={image.id}><img alt={image.alt_text} src={publicApiUrl(image.url)} /><div><strong>{image.filename}</strong><span>{image.alt_text}</span><button disabled={busy} onClick={() => void handleDeleteImage(image)} type="button">Remove image</button></div></article>)}
                    {!images.length && <p className="manage-help">Your uploaded images will appear here.</p>}
                  </div>
                </section>
              </>
            )}

            {panel === 'resume' && (
              <section className="manage-card">
                <div className="manage-card-heading"><div><span>01</span><h2>Résumé</h2></div><p>{resume.available ? `PUBLISHED · ${resume.filename}` : 'NOT PUBLISHED'}</p></div>
                <p className="manage-help">Upload a PDF up to 10 MB. It becomes publicly downloadable from the portfolio.</p>
                <form className="resume-upload" onSubmit={handleUploadResume}>
                  <label className="file-picker"><span>{resume.available ? 'Choose replacement PDF' : 'Choose résumé PDF'}</span><input accept="application/pdf,.pdf" name="resume" required type="file" /></label>
                  <button className="button button-dark" disabled={busy} type="submit">{busy ? 'Uploading…' : 'Publish résumé'} <span>↑</span></button>
                </form>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
