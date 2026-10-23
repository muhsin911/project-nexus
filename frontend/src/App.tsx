import { useEffect, useState } from 'react';
import { ChatAssistant } from '@/components/ui/ChatAssistant';
import { ManagePage } from '@/components/ManagePage';
import {
  getDsaProblems,
  getResumeStatus,
  type DsaProblem,
  type ResumeStatus,
} from '@/lib/portfolioApi';

const toolset = ['TypeScript', 'React', 'Python', 'FastAPI', 'PostgreSQL', 'Docker'];

function App() {
  if (window.location.pathname.replace(/\/+$/, '') === '/manage') {
    return <ManagePage />;
  }

  return <Portfolio />;
}

function Portfolio() {
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [activeProblem, setActiveProblem] = useState(0);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [portfolioError, setPortfolioError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([getDsaProblems(), getResumeStatus()])
      .then(([dsaProblems, resumeStatus]) => {
        if (!active) return;
        setProblems(dsaProblems);
        setResume(resumeStatus);
      })
      .catch((error: unknown) => {
        if (active) {
          setPortfolioError(
            error instanceof Error
              ? error.message
              : 'Portfolio details could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingProblems(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentProblem = problems[activeProblem];

  return (
    <main className="portfolio-shell">
      <div className="topline">
        <a className="wordmark" href="#top" aria-label="Nexus, home">
          <span className="wordmark-mark">N.</span>
          <span>PORTFOLIO / 2026</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#work">Work <span>01</span></a>
          <a href="#about">Approach <span>02</span></a>
          <a href="#problems">DSA log <span>03</span></a>
        </nav>
        <a className="nav-contact" href="#contact">
          Let&apos;s talk <span aria-hidden="true">↗</span>
        </a>
      </div>

      <section className="hero section-wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> SOFTWARE ENGINEER · OPEN TO WHAT&apos;S NEXT</p>
          <h1>Thoughtful code.<br /><em>Real-world</em> impact.</h1>
          <p className="hero-description">
            I turn complex ideas into calm, capable software — with care for
            the details people feel, not just the features they see.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">
              Explore the work <span aria-hidden="true">↘</span>
            </a>
            {resume.available && (
              <a className="button button-quiet" href="/api/v1/portfolio/cv">
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

        <a className="scroll-cue" href="#work">
          <span className="scroll-line" /> SCROLL TO EXPLORE
        </a>
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
            <p>
              A portfolio that brings the work, the thinking, and the problem-solving
              into one considered experience. Built to grow with every new idea.
            </p>
            <div className="project-tags">
              {['React', 'TypeScript', 'FastAPI', 'PostgreSQL'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <a href="#problems" className="text-link">Explore the problem-solving log <span aria-hidden="true">↗</span></a>
          </div>
        </article>

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
            <p className="approach-lead">
              The best interfaces make hard things feel simple. That takes
              clear thinking, solid engineering, and enough care to notice
              what everyone else skips.
            </p>
            <div className="principles">
              <article><span>01</span><div><h3>Clarity first</h3><p>Make the purpose obvious. Make the next step feel natural.</p></div></article>
              <article><span>02</span><div><h3>Built to last</h3><p>Choose the right foundation, then keep the moving parts intentional.</p></div></article>
              <article><span>03</span><div><h3>Details matter</h3><p>Performance, accessibility, and polish belong in the first draft.</p></div></article>
            </div>
          </div>
        </div>
        <div className="toolset section-wrap">
          <span className="eyebrow">TOOLS I REACH FOR</span>
          <div className="toolset-list">
            {toolset.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className="dsa-section section-wrap" id="problems">
        <div className="dsa-heading">
          <div>
            <p className="eyebrow">03 / THE DSA LOG</p>
            <h2>One problem.<br /><em>One better idea.</em></h2>
          </div>
          <p className="section-intro">
            A running record of problems solved, patterns learned, and
            approaches worth remembering.
          </p>
        </div>
        <div className="problem-browser" aria-live="polite">
          <div className="problem-topline">
            <span>PROBLEM <strong>{problems.length ? String(activeProblem + 1).padStart(2, '0') : '—'}</strong> / {String(problems.length).padStart(2, '0')}</span>
            {currentProblem && <span className={`difficulty difficulty-${currentProblem.difficulty.toLowerCase()}`}>{currentProblem.difficulty}</span>}
          </div>
          {portfolioError ? (
            <div className="problem-empty">
              <span className="empty-symbol">!</span>
              <h3>Couldn&apos;t reach the portfolio API.</h3>
              <p>{portfolioError}</p>
            </div>
          ) : loadingProblems ? (
            <div className="problem-empty" role="status"><p>Loading the problem log…</p></div>
          ) : currentProblem ? (
            <>
              <div className="problem-content">
                <div>
                  <p className="problem-platform">{currentProblem.platform}{currentProblem.solved_at ? ` · Solved ${currentProblem.solved_at}` : ''}</p>
                  <h3>{currentProblem.title}</h3>
                  <p className="problem-summary">{currentProblem.summary}</p>
                  <a className="text-link" href={currentProblem.problem_url} target="_blank" rel="noreferrer">
                    View original problem <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div className="solution-block">
                  <span className="eyebrow">APPROACH</span>
                  <pre>{currentProblem.solution}</pre>
                </div>
              </div>
              <div className="problem-bottom">
                <div className="problem-tags">
                  {currentProblem.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  <span>TIME {currentProblem.time_complexity}</span>
                  <span>SPACE {currentProblem.space_complexity}</span>
                </div>
                <div className="problem-controls">
                  <button
                    aria-label="Previous problem"
                    disabled={activeProblem === 0}
                    onClick={() => setActiveProblem((index) => index - 1)}
                  >←</button>
                  <button
                    aria-label="Next problem"
                    disabled={activeProblem >= problems.length - 1}
                    onClick={() => setActiveProblem((index) => index + 1)}
                  >→</button>
                </div>
              </div>
            </>
          ) : (
            <div className="problem-empty">
              <span className="empty-symbol">∅</span>
              <h3>The log starts here.</h3>
              <p>When problems are added, you can explore them here one at a time.</p>
              <a className="text-link" href="/manage">Add your first solved problem <span aria-hidden="true">↗</span></a>
            </div>
          )}
        </div>
      </section>

      <footer className="footer section-wrap" id="contact">
        <div className="footer-top">
          <div>
            <p className="eyebrow">HAVE A GOOD ONE IN MIND?</p>
            <h2>Let&apos;s make<br /><em>something matter.</em></h2>
          </div>
          <a className="footer-link" href="/manage">Portfolio owner? <span>Manage this site ↗</span></a>
        </div>
        <div className="footer-bottom">
          <a className="wordmark" href="#top"><span className="wordmark-mark">N.</span><span>MADE WITH INTENTION</span></a>
          <span>© {new Date().getFullYear()} · A work in progress, by design.</span>
          {resume.available && <a href="/api/v1/portfolio/cv">Résumé ↓</a>}
        </div>
      </footer>

      <ChatAssistant />
    </main>
  );
}

export default App;
