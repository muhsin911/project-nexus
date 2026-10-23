import { useEffect, useState } from 'react';
import { ChatAssistant } from '@/components/ui/ChatAssistant';
import { DsaPage } from '@/components/DsaPage';
import { ManagePage } from '@/components/ManagePage';
import { getPublishedContent, getResumeStatus, publicApiUrl, type PortfolioContent, type ResumeStatus } from '@/lib/portfolioApi';

const toolset = ['TypeScript', 'React', 'Python', 'FastAPI', 'PostgreSQL', 'Docker'];

function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/manage') return <ManagePage />;
  if (path === '/dsa') return <DsaPage />;
  return <Portfolio />;
}

function Portfolio() {
  const [content, setContent] = useState<PortfolioContent[]>([]);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [loadingContent, setLoadingContent] = useState(true);
  const [portfolioError, setPortfolioError] = useState('');

  useEffect(() => {
    document.title = 'Project NEXUS — Portfolio';
    let active = true;
    Promise.allSettled([getPublishedContent(), getResumeStatus()])
      .then(([contentResult, resumeResult]) => {
        if (!active) return;
        if (contentResult.status === 'fulfilled') {
          setContent(contentResult.value);
        } else {
          setPortfolioError(
            contentResult.reason instanceof Error
              ? contentResult.reason.message
              : 'Portfolio stories could not be loaded.',
          );
        }
        if (resumeResult.status === 'fulfilled') {
          setResume(resumeResult.value);
        } else {
          setPortfolioError((current) => current || (
            resumeResult.reason instanceof Error
              ? resumeResult.reason.message
              : 'Résumé status could not be loaded.'
          ));
        }
      })
      .finally(() => {
        if (active) setLoadingContent(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="portfolio-shell">
      <header className="topline">
        <a className="wordmark" href="#top" aria-label="Nexus, home">
          <span className="wordmark-mark">N.</span><span>PORTFOLIO / 2026</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#work">Work <span>01</span></a>
          <a href="#about">Approach <span>02</span></a>
          <a href="/dsa">DSA log <span>03</span></a>
        </nav>
        <a className="nav-contact" href="#contact">Let&apos;s talk <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero section-wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> SOFTWARE ENGINEER · OPEN TO WHAT&apos;S NEXT</p>
          <h1>Thoughtful code.<br /><em>Real-world</em> impact.</h1>
          <p className="hero-description">
            I turn complex ideas into calm, capable software — with care for the
            details people feel, not just the features they see.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">Explore the work <span aria-hidden="true">↘</span></a>
            {resume.available && (
              <a className="button button-quiet" href={publicApiUrl('/api/v1/portfolio/cv')}>
                Download résumé <span aria-hidden="true">↓</span>
              </a>
            )}
          </div>
          <p className="hero-footnote">A living portfolio — built with intention, always in progress.</p>
        </div>

        <div className="hero-art" aria-label="Abstract graphic made from geometric shapes" role="img">
          <div className="art-grid" />
          <div className="art-index">FIG. 01 <span>BUILD / ITERATE / REFINE</span></div>
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
          <div className="art-disc"><span>N</span></div>
          <div className="art-caption"><span>Curiosity</span><span>→</span><span>Craft</span></div>
          <div className="art-coordinate">18° 31&apos; N<br />73° 51&apos; E</div>
        </div>
        <a className="scroll-cue" href="#work"><span className="scroll-line" /> SCROLL TO EXPLORE</a>
      </section>

      <div className="section-divider"><span>SELECTED WORK</span><span>01 — 03</span></div>
      <section className="work-section section-wrap" id="work">
        <div className="section-heading">
          <p className="eyebrow">A FEW THINGS I&apos;VE BEEN BUILDING</p>
          <h2>Work with a<br /><em>point of view.</em></h2>
          <p className="section-intro">
            Good software is more than a working demo. It&apos;s the structure,
            choices, and small moments that make the whole thing feel right.
          </p>
        </div>
        {portfolioError && (
          <p className="content-load-warning" role="status">
            Live portfolio data is temporarily unavailable ({portfolioError}). Showing the featured work when no stories are available.
          </p>
        )}
        {loadingContent ? (
          <div className="problem-empty" role="status"><p>Gathering selected work…</p></div>
        ) : content.length ? (
          <div className="project-list">
            {content.map((item, index) => (
              <article className="project-card" key={item.id}>
                <div className="project-visual" aria-label={item.image?.alt_text ?? `${item.title} cover art`} role="img">
                  {item.image ? (
                    <img alt={item.image.alt_text} src={publicApiUrl(item.image.url)} />
                  ) : (
                    <>
                      <div className="project-visual-lines" />
                      <div className="project-orbit"><span>{String(index + 1).padStart(2, '0')}</span></div>
                      <span className="project-visual-note">A PERSONAL<br />DIGITAL SPACE</span>
                    </>
                  )}
                  <span className="project-visual-number">{String(index + 1).padStart(3, '0')}</span>
                </div>
                <div className="project-details">
                  <div className="project-meta"><span>SELECTED WORK</span><span>{item.slug.toUpperCase()}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <div className="project-body">{item.body}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="project-card">
            <div className="project-visual" aria-label="Project NEXUS geometric cover art" role="img">
              <div className="project-visual-lines" />
              <div className="project-orbit"><span>NX</span></div>
              <span className="project-visual-note">A PERSONAL<br />DIGITAL SPACE</span>
              <span className="project-visual-number">001</span>
            </div>
            <div className="project-details">
              <div className="project-meta"><span>FEATURED PROJECT</span><span>2026 — ONGOING</span></div>
              <h3>Project NEXUS</h3>
              <p>A portfolio that brings the work, the thinking, and the problem-solving into one considered experience. Built to grow with every new idea.</p>
              <div className="project-tags">{['React', 'TypeScript', 'FastAPI', 'PostgreSQL'].map((item) => <span key={item}>{item}</span>)}</div>
              <a href="/dsa" className="text-link">Explore the problem-solving log <span aria-hidden="true">↗</span></a>
            </div>
          </article>
        )}
        <div className="work-note">
          <span className="note-mark">↳</span>
          <p>More work is taking shape. <a href="#contact">Have something interesting in mind?</a></p>
        </div>
      </section>

      <section className="approach-section" id="about">
        <div className="section-wrap approach-grid">
          <div className="approach-title">
            <p className="eyebrow">02 / HOW I THINK</p>
            <h2>Make it useful.<br /><em>Make it feel</em><br />effortless.</h2>
          </div>
          <div className="approach-copy">
            <p className="approach-lead">The best interfaces make hard things feel simple. That takes clear thinking, solid engineering, and enough care to notice what everyone else skips.</p>
            <div className="principles">
              <article><span>01</span><div><h3>Clarity first</h3><p>Make the purpose obvious. Make the next step feel natural.</p></div></article>
              <article><span>02</span><div><h3>Built to last</h3><p>Choose the right foundation, then keep the moving parts intentional.</p></div></article>
              <article><span>03</span><div><h3>Details matter</h3><p>Performance, accessibility, and polish belong in the first draft.</p></div></article>
            </div>
          </div>
        </div>
        <div className="toolset section-wrap">
          <span className="eyebrow">TOOLS I REACH FOR</span>
          <div className="toolset-list">{toolset.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      </section>

      <footer className="footer section-wrap" id="contact">
        <div className="footer-top">
          <div>
            <p className="eyebrow">HAVE A GOOD ONE IN MIND?</p>
            <h2>Let&apos;s make<br /><em>something matter.</em></h2>
          </div>
          <div className="footer-links">
            <a className="footer-link" href="/dsa">Explore the DSA log <span>Browse solutions ↗</span></a>
            <a className="footer-link" href="#top">Get in touch <span>Start a conversation ↗</span></a>
          </div>
        </div>
        <div className="footer-bottom">
          <a className="wordmark" href="#top"><span className="wordmark-mark">N.</span><span>MADE WITH INTENTION</span></a>
          <span>© {new Date().getFullYear()} · A work in progress, by design.</span>
          {resume.available && <a href={publicApiUrl('/api/v1/portfolio/cv')}>Résumé ↓</a>}
        </div>
      </footer>
      <ChatAssistant />
    </main>
  );
}

export default App;
