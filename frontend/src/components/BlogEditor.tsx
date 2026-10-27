import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteBlogPost,
  getAdminBlogPosts,
  saveBlogPost,
  type PortfolioBlogPost,
  type PortfolioBlogPostInput,
} from '@/lib/portfolioApi';

const emptyPost: PortfolioBlogPostInput = {
  title: '',
  slug: '',
  excerpt: '',
  body_html: '',
  published: false,
};

export function BlogEditor({ token }: { token: string }) {
  const [posts, setPosts] = useState<PortfolioBlogPost[]>([]);
  const [form, setForm] = useState<PortfolioBlogPostInput>(emptyPost);
  const [editId, setEditId] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminBlogPosts(token)
      .then((result) => {
        if (active) setPosts(result);
      })
      .catch((error: unknown) => {
        if (active) setFeedback(error instanceof Error ? error.message : 'Blog posts could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      await saveBlogPost(form, token, editId);
      setPosts(await getAdminBlogPosts(token));
      setForm(emptyPost);
      setEditId(undefined);
      setFeedback(editId ? 'Blog post updated.' : 'Blog post saved.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The blog post could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(post: PortfolioBlogPost) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setFeedback('');
    try {
      await deleteBlogPost(post.id, token);
      setPosts(await getAdminBlogPosts(token));
      if (editId === post.id) {
        setForm(emptyPost);
        setEditId(undefined);
      }
      setFeedback('Blog post deleted.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The blog post could not be deleted.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="manage-card">
        <div className="manage-card-heading"><div><span>01</span><h2>{editId ? 'Edit article' : 'Write an article'}</h2></div><p>BLOG · HTML</p></div>
        <p className="manage-help">Write article content as HTML. Supported formatting includes headings, paragraphs, lists, links, quotes, code blocks, and images. Unsafe tags and attributes are removed when saved.</p>
        <form className="problem-form" onSubmit={submit}>
          <label>Title<input maxLength={200} onChange={(event) => setForm({ ...form, title: event.currentTarget.value })} required value={form.title} /></label>
          <label>URL slug<input maxLength={220} onChange={(event) => setForm({ ...form, slug: event.currentTarget.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} required value={form.slug} /></label>
          <label>Short introduction<textarea maxLength={500} onChange={(event) => setForm({ ...form, excerpt: event.currentTarget.value })} required rows={2} value={form.excerpt} /></label>
          <label>Article HTML<textarea maxLength={50000} onChange={(event) => setForm({ ...form, body_html: event.currentTarget.value })} placeholder="<h2>Start here</h2>&#10;<p>Your article...</p>" required rows={14} value={form.body_html} /></label>
          <label className="checkbox-field"><input checked={form.published} onChange={(event) => setForm({ ...form, published: event.currentTarget.checked })} type="checkbox" /> Publish this article</label>
          <div className="form-actions">
            {editId && <button className="manage-signout" onClick={() => { setEditId(undefined); setForm(emptyPost); }} type="button">Cancel edit</button>}
            <button className="button button-dark" disabled={busy} type="submit">{busy ? 'Saving…' : editId ? 'Save article' : 'Save article'} <span>↗</span></button>
          </div>
        </form>
        {feedback && <p className="manage-feedback" role="status">{feedback}</p>}
      </section>
      <section className="manage-card">
        <div className="manage-card-heading"><div><span>02</span><h2>Articles</h2></div><p>{posts.length} ENTRIES</p></div>
        <ul className="manage-problem-list">
          {posts.map((post) => (
            <li key={post.id}>
              <div><strong>{post.title}</strong><span>{post.published ? 'Published' : 'Draft'} · /blog/{post.slug}</span></div>
              <div className="manage-item-actions">
                <button onClick={() => { setEditId(post.id); setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, body_html: post.body_html, published: post.published }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} type="button">Edit</button>
                <button disabled={busy} onClick={() => void remove(post)} type="button">Delete</button>
              </div>
            </li>
          ))}
          {!posts.length && <li><span>No articles yet. Draft or publish your first post above.</span></li>}
        </ul>
      </section>
    </>
  );
}
