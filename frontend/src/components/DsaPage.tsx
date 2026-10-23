import { useEffect, useMemo, useState } from 'react';
import { getDsaCategories, getDsaProblems, type DsaCategory, type DsaProblem } from '@/lib/portfolioApi';

export function DsaPage() {
  const [categories, setCategories] = useState<DsaCategory[]>([]);
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [categoryId, setCategoryId] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'DSA log · Project NEXUS';
    let active = true;
    Promise.all([getDsaCategories(), getDsaProblems()])
      .then(([categoryList, problemList]) => {
        if (!active) return;
        setCategories(categoryList);
        setProblems(problemList);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'The DSA log could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredProblems = useMemo(
    () => problems.filter((problem) => categoryId === 'all' || problem.category_id === categoryId),
    [categoryId, problems],
  );
  const activeProblem = filteredProblems[activeIndex];
  const categoryName = categories.find((category) => category.id === categoryId)?.name;

  function chooseCategory(nextId: string) {
    setCategoryId(nextId);
    setActiveIndex(0);
  }

  return (
    <main className="dsa-page">
      <header className="topline">
        <a className="wordmark" href="/" aria-label="Nexus, home">
          <span className="wordmark-mark">N.</span><span>PORTFOLIO / PROBLEM LOG</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/">Portfolio <span>01</span></a>
          <a href="/#work">Work <span>02</span></a>
          <a href="/#about">Approach <span>03</span></a>
        </nav>
        <a className="nav-contact" href="/#contact">Let&apos;s talk <span aria-hidden="true">↗</span></a>
      </header>

      <section className="dsa-intro section-wrap">
        <p className="eyebrow"><span className="status-dot" /> FIELD NOTES / ALGORITHMS</p>
        <h1>Think in patterns.<br /><em>Learn by solving.</em></h1>
        <p className="hero-description">
          A growing collection of problems, approaches, and ideas worth carrying
          into the next challenge.
        </p>
        <div className="dsa-stats" aria-label="Problem log statistics">
          <div><strong>{String(problems.length).padStart(2, '0')}</strong><span>PROBLEMS SOLVED</span></div>
          <div><strong>{String(categories.length).padStart(2, '0')}</strong><span>ALGORITHM TOPICS</span></div>
          <span className="dsa-stats-orbit" aria-hidden="true" />
        </div>
      </section>

      <section className="dsa-library section-wrap" aria-labelledby="log-title">
        <div className="dsa-library-heading">
          <div>
            <p className="eyebrow">A PERSONAL INDEX</p>
            <h2 id="log-title">The problem<br /><em>log.</em></h2>
          </div>
          <p className="section-intro">Explore one solution at a time, or narrow the log by algorithm category.</p>
        </div>

        <div className="category-filter" aria-label="Filter problems by algorithm category">
          <button
            aria-pressed={categoryId === 'all'}
            className={categoryId === 'all' ? 'is-active' : ''}
            onClick={() => chooseCategory('all')}
            type="button"
          >All topics <span>{problems.length}</span></button>
          {categories.map((category) => (
            <button
              aria-pressed={categoryId === category.id}
              className={categoryId === category.id ? 'is-active' : ''}
              key={category.id}
              onClick={() => chooseCategory(category.id)}
              type="button"
            >
              {category.name}
              <span>{problems.filter((problem) => problem.category_id === category.id).length}</span>
            </button>
          ))}
        </div>

        <div className="problem-browser dsa-problem-card" aria-live="polite">
          <div className="problem-topline">
            <span>ENTRY <strong>{filteredProblems.length ? String(activeIndex + 1).padStart(2, '0') : '—'}</strong> / {String(filteredProblems.length).padStart(2, '0')}</span>
            {activeProblem && (
              <span className={`difficulty difficulty-${activeProblem.difficulty.toLowerCase()}`}>
                {activeProblem.difficulty}
              </span>
            )}
          </div>
          {error ? (
            <div className="problem-empty"><span className="empty-symbol">!</span><h3>The log is unavailable.</h3><p>{error}</p></div>
          ) : loading ? (
            <div className="problem-empty" role="status"><p>Opening the problem log…</p></div>
          ) : activeProblem ? (
            <>
              <div className="problem-content">
                <div>
                  <p className="problem-platform">
                    {categoryName ?? categories.find((category) => category.id === activeProblem.category_id)?.name ?? 'Algorithm'}
                    {' · '}{activeProblem.platform}
                    {activeProblem.solved_at ? ` · ${activeProblem.solved_at}` : ''}
                  </p>
                  <h3>{activeProblem.title}</h3>
                  <p className="problem-summary">{activeProblem.summary}</p>
                  <a className="text-link" href={activeProblem.problem_url} target="_blank" rel="noreferrer">
                    View original problem <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div className="solution-block">
                  <span className="eyebrow">SOLUTION / EXPLANATION</span>
                  <pre>{activeProblem.solution}</pre>
                </div>
              </div>
              <div className="problem-bottom">
                <div className="problem-tags">
                  {activeProblem.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  <span>TIME {activeProblem.time_complexity}</span>
                  <span>SPACE {activeProblem.space_complexity}</span>
                </div>
                <div className="problem-controls">
                  <button
                    aria-label="Previous problem"
                    disabled={activeIndex === 0}
                    onClick={() => setActiveIndex((index) => index - 1)}
                  >←</button>
                  <button
                    aria-label="Next problem"
                    disabled={activeIndex >= filteredProblems.length - 1}
                    onClick={() => setActiveIndex((index) => index + 1)}
                  >→</button>
                </div>
              </div>
            </>
          ) : (
            <div className="problem-empty">
              <span className="empty-symbol">∅</span>
              <h3>{categoryId === 'all' ? 'The log starts here.' : `No ${categoryName} entries yet.`}</h3>
              <p>When solved problems are published, they&apos;ll appear here, one thoughtful solution at a time.</p>
            </div>
          )}
        </div>
      </section>
      <footer className="footer section-wrap">
        <div className="footer-bottom">
          <a className="wordmark" href="/"><span className="wordmark-mark">N.</span><span>MADE WITH INTENTION</span></a>
          <span>© {new Date().getFullYear()} · Keep learning.</span>
          <a href="/">Back to portfolio ↗</a>
        </div>
      </footer>
    </main>
  );
}
