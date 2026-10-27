import { useEffect, useState } from 'react';
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
      <header className="topline">
        <a className="wordmark" href="/" aria-label="Return to portfolio">
          <span className="wordmark-mark">N.</span><span>PORTFOLIO</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/">Portfolio</a>
          <a href="/blog" aria-current={!slug ? 'page' : undefined}>Blog</a>
          <a href="/#contact">Contact</a>
        </nav>
      </header>
      <section className="blog-content section-wrap">
        <a className="text-link blog-back" href="/">{slug ? '← Back to portfolio' : '← Portfolio'}</a>
        {loading ? (
          <p className="blog-status" role="status">Loading writing…</p>
        ) : error ? (
          <div className="blog-status" role="alert"><h1>{slug ? 'Post unavailable' : 'Writing is unavailable'}</h1><p>{error}</p><a className="text-link" href="/blog">View all posts</a></div>
        ) : post ? (
          <article className="blog-article">
            <p className="eyebrow">WRITING · {formatDate(post.created_at)}</p>
            <h1>{post.title}</h1>
            <p className="blog-excerpt">{post.excerpt}</p>
            <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: post.body_html }} />
          </article>
        ) : (
          <>
            <p className="eyebrow">NOTES, IDEAS &amp; LESSONS</p>
            <h1 className="blog-title">Writing</h1>
            {posts.length ? (
              <div className="blog-list">
                {posts.map((item) => (
                  <article className="blog-list-item" key={item.id}>
                    <p>{formatDate(item.created_at)}</p>
                    <h2><a href={`/blog/${encodeURIComponent(item.slug)}`}>{item.title}</a></h2>
                    <p>{item.excerpt}</p>
                    <a className="text-link" href={`/blog/${encodeURIComponent(item.slug)}`}>Read article ↗</a>
                  </article>
                ))}
              </div>
            ) : (
              <p className="blog-status">No articles have been published yet.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
