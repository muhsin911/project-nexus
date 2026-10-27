import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { CustomPointer } from '@/components/CustomPointer';
import {
  getPublishedBlogPost,
  getPublishedBlogPosts,
  type PortfolioBlogPost,
} from '@/lib/portfolioApi';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(value));
}

export function BlogPage({ slug }: { slug?: string }) {
  const [data, setData] = useState<{
    slug?: string;
    posts: PortfolioBlogPost[];
    post: PortfolioBlogPost | null;
    error: string;
    loading: boolean;
  }>({ posts: [], post: null, error: '', loading: true });

  useEffect(() => {
    let active = true;
    const load = slug ? getPublishedBlogPost(slug) : getPublishedBlogPosts();
    load
      .then((result) => {
        if (!active) return;
        if (Array.isArray(result)) {
          setData({ slug, posts: result, post: null, error: '', loading: false });
          document.title = 'Writing · Project NEXUS';
        } else {
          setData({ slug, posts: [], post: result, error: '', loading: false });
          document.title = `${result.title} · Project NEXUS`;
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setData({
          slug,
          posts: [],
          post: null,
          error: reason instanceof Error ? reason.message : 'The blog could not be loaded.',
          loading: false,
        });
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const isCurrentSlug = data.slug === slug;
  const loading = !isCurrentSlug || data.loading;
  const post = isCurrentSlug ? data.post : null;
  const posts = isCurrentSlug ? data.posts : [];
  const error = isCurrentSlug ? data.error : '';

  return (
    <main className="portfolio-shell blog-page">
      <CustomPointer />
      <header className="topline subpage-header">
        <a className="subpage-home" href="/" aria-label="Portfolio home" title="Portfolio home">
          <FontAwesomeIcon icon={faHouse} aria-hidden="true" />
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/">Portfolio</a>
          <a href="/blog" aria-current={!slug ? 'page' : undefined}>Blog</a>
          <a href="/dsa">DSA</a>
        </nav>
        <span className="subpage-header-spacer" aria-hidden="true" />
      </header>
      <section className="blog-content section-wrap">
        {loading ? (
          <div className="blog-loading" role="status"><span className="eyebrow">JOURNAL / NOTES</span><p>Loading writing…</p></div>
        ) : error ? (
          <div className="blog-status blog-state-card" role="alert"><a className="text-link blog-back" href="/">{'← Back to portfolio'}</a><h1>{slug ? 'Post unavailable' : 'Writing is unavailable'}</h1><p>{error}</p><a className="text-link" href="/blog">View all posts</a></div>
        ) : post ? (
          <article className="blog-article">
            <a className="text-link blog-back" href="/blog">← All writing</a>
            <p className="eyebrow">WRITING · {formatDate(post.created_at)}</p>
            <h1>{post.title}</h1>
            <p className="blog-excerpt">{post.excerpt}</p>
            <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: post.body_html }} />
            <a className="blog-article-return" href="/blog">← Back to all writing</a>
          </article>
        ) : (
          <>
            <div className="blog-intro">
              <p className="eyebrow"><span className="status-dot" /> NOTES, IDEAS &amp; LESSONS</p>
              <h1 className="blog-title">Writing<br /><em>in progress.</em></h1>
              <p className="blog-intro-copy">Thoughts on software, problem-solving, and the ideas that make good work better.</p>
            </div>
            {posts.length ? (
              <div className="blog-list">
                {posts.map((item) => (
                  <article className="blog-list-item" key={item.id}>
                    <div className="blog-item-meta"><span>{formatDate(item.created_at)}</span><span>FIELD NOTE</span></div>
                    <h2><a href={`/blog/${encodeURIComponent(item.slug)}`}>{item.title}</a></h2>
                    <p className="blog-item-excerpt">{item.excerpt}</p>
                    <a className="blog-read-link" href={`/blog/${encodeURIComponent(item.slug)}`} aria-label={`Read ${item.title}`}>Read article <span aria-hidden="true">↗</span></a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="blog-status blog-empty-card">
                <span className="blog-empty-mark" aria-hidden="true">✳</span>
                <div><span className="eyebrow">MORE SOON</span><h2>The next note is taking shape.</h2><p>No articles have been published yet. Check back soon for ideas, lessons, and things worth sharing.</p></div>
              </div>
            )}
          </>
        )}
      </section>
      <footer className="footer section-wrap blog-footer">
        <div className="footer-bottom">
          <a className="subpage-home footer-home" href="/" aria-label="Portfolio home" title="Portfolio home">
            <FontAwesomeIcon icon={faHouse} aria-hidden="true" />
          </a>
          <span>© {new Date().getFullYear()} · Notes from the workbench.</span>
          <a href="/dsa">Explore the problem log ↗</a>
        </div>
      </footer>
    </main>
  );
}
