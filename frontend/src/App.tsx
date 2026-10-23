import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChatAssistant } from '@/components/ui/ChatAssistant';
import { DsaPage } from '@/components/DsaPage';
import { ManagePage } from '@/components/ManagePage';
import {
  getExperience,
  getPortfolioProfile,
  getPublishedContent,
  getResumeStatus,
  getSkills,
  getTestimonials,
  publicApiUrl,
  sendContactMessage,
  type ExperienceEntry,
  type PortfolioContent,
  type PortfolioProfile,
  type ResumeStatus,
  type SkillEntry,
  type TestimonialEntry,
} from '@/lib/portfolioApi';

const defaultProfile: PortfolioProfile = {
  full_name: 'Your Name',
  headline: 'Software Engineer',
  job_roles: ['Software Engineer', 'Full-stack Developer'],
  about_title: 'Make it useful. Make it feel effortless.',
  about: 'I turn complex ideas into calm, capable software — with care for the details people feel, not just the features they see.',
  location: '',
  email: '',
  expertise: [],
  social_links: [],
};

function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/manage') return <ManagePage />;
  if (path === '/dsa') return <DsaPage />;
  return <Portfolio />;
}

function Portfolio() {
  const [profile, setProfile] = useState(defaultProfile);
  const [content, setContent] = useState<PortfolioContent[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>([]);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [loadingContent, setLoadingContent] = useState(true);
  const [portfolioError, setPortfolioError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexus-theme') ?? 'light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactFeedback, setContactFeedback] = useState('');
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nexus-theme', theme);
  }, [theme]);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 480);
      if (artRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        artRef.current.style.setProperty('--parallax-y', `${Math.min(window.scrollY * 0.1, 70)}px`);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.title = `${profile.full_name} · ${profile.headline}`;
  }, [profile.full_name, profile.headline]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getPortfolioProfile(),
      getPublishedContent(),
      getExperience(),
      getSkills(),
      getTestimonials(),
      getResumeStatus(),
    ])
      .then(([profileResult, contentResult, experienceResult, skillsResult, testimonialResult, resumeResult]) => {
        if (!active) return;
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
        else setPortfolioError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Profile data could not be loaded.');
        if (contentResult.status === 'fulfilled') {
          setContent(contentResult.value);
        } else {
          setPortfolioError(
            contentResult.reason instanceof Error
              ? contentResult.reason.message
              : 'Portfolio stories could not be loaded.',
          );
        }
        if (experienceResult.status === 'fulfilled') setExperience(experienceResult.value);
        if (skillsResult.status === 'fulfilled') setSkills(skillsResult.value);
        if (testimonialResult.status === 'fulfilled') setTestimonials(testimonialResult.value);
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

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setContactBusy(true);
    setContactFeedback('');
    try {
      const result = await sendContactMessage({
        name: String(values.get('name') ?? ''),
        email: String(values.get('email') ?? ''),
        subject: String(values.get('subject') ?? ''),
        message: String(values.get('message') ?? ''),
        website: String(values.get('website') ?? ''),
      });
      setContactFeedback(result.message);
      form.reset();
    } catch (error) {
      setContactFeedback(error instanceof Error ? error.message : 'Your message could not be sent.');
    } finally {
      setContactBusy(false);
    }
  }

  return (
    <main className="portfolio-shell">
      <header className="topline">
        <a className="wordmark" href="#top" aria-label="Nexus, home">
          <span className="wordmark-mark">{profile.full_name.slice(0, 1) || 'N'}.</span><span>{profile.full_name.toUpperCase()}</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#work">Work <span>01</span></a>
          <a href="#about">About <span>02</span></a>
          <a href="#experience">Journey <span>03</span></a>
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span> {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <a className="nav-contact" href="#contact">Let&apos;s talk <span aria-hidden="true">↗</span></a>
          <div className="dsa-menu">
            <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="dsa-menu-list" onClick={() => setMenuOpen(!menuOpen)}>
              <span className={menuOpen ? 'menu-icon is-open' : 'menu-icon'} aria-hidden="true"><i /><i /></span> Menu
            </button>
            {menuOpen && <div className="menu-popover" id="dsa-menu-list"><a href="/dsa" onClick={() => setMenuOpen(false)}>DSA log <span>Explore solved problems ↗</span></a></div>}
          </div>
        </div>
      </header>

      <section className="hero section-wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> {profile.location ? `${profile.location.toUpperCase()} · ` : ''}OPEN TO WHAT&apos;S NEXT</p>
          <p className="hero-name">{profile.full_name}</p>
          <p className="hero-headline">{profile.headline}</p>
          <h1>Thoughtful code.<br /><em>Real-world</em> impact.</h1>
          <div className="role-list">{profile.job_roles.map((role, index) => <span key={`${role}-${index}`}>{role}</span>)}</div>
          <p className="hero-description">
            {profile.about || defaultProfile.about}
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

        <div className="hero-art" ref={artRef} aria-label="Abstract graphic made from geometric shapes" role="img">
          <div className="art-grid" />
          <div className="art-index">FIG. 01 <span>BUILD / ITERATE / REFINE</span></div>
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
          <div className="art-disc"><span>{profile.full_name.slice(0, 1) || 'N'}</span></div>
          <div className="art-caption"><span>Curiosity</span><span>→</span><span>Craft</span></div>
          <div className="art-coordinate">18° 31&apos; N<br />73° 51&apos; E</div>
        </div>
        <a className="scroll-cue" href="#work"><span className="scroll-line" /> SCROLL TO EXPLORE</a>
      </section>

      <div className="section-divider"><span>SELECTED WORK</span><span>PORTFOLIO / 2026</span></div>
      <section className="work-section section-wrap" id="work">
        <div className="section-heading">
          <p className="eyebrow">A FEW THINGS {profile.full_name ? `${profile.full_name.toUpperCase()} HAS` : 'I'} BEEN BUILDING</p>
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
                  <div className="project-meta"><span>{item.role || 'SELECTED WORK'}</span><span>{item.slug.toUpperCase()}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <div className="project-body">{item.body}</div>
                  {item.tech_stack.length > 0 && <div className="project-tags">{item.tech_stack.map((tech) => <span key={tech}>{tech}</span>)}</div>}
                  <div className="project-links">
                    {item.repository_url && <a href={item.repository_url} target="_blank" rel="noreferrer">GitHub repository ↗</a>}
                    {item.live_url && <a href={item.live_url} target="_blank" rel="noreferrer">View live project ↗</a>}
                  </div>
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
            <p className="eyebrow">02 / ABOUT ME</p>
            <h2>{profile.about_title || 'Make it useful. Make it feel effortless.'}</h2>
          </div>
          <div className="approach-copy">
            <p className="approach-lead">{profile.about || defaultProfile.about}</p>
            <div className="principles">
              <article><span>01</span><div><h3>Clarity first</h3><p>Make the purpose obvious. Make the next step feel natural.</p></div></article>
              <article><span>02</span><div><h3>Built to last</h3><p>Choose the right foundation, then keep the moving parts intentional.</p></div></article>
              <article><span>03</span><div><h3>Details matter</h3><p>Performance, accessibility, and polish belong in the first draft.</p></div></article>
            </div>
          </div>
        </div>
        {profile.expertise.length > 0 && <div className="toolset section-wrap expertise-list">
          <span className="eyebrow">AREAS OF EXPERTISE</span>
          <div className="toolset-list">{profile.expertise.map((item) => <span key={item}>{item}</span>)}</div>
        </div>}
      </section>

      {skills.length > 0 && <section className="skills-section section-wrap" id="skills">
        <div className="section-heading">
          <p className="eyebrow">03 / TOOLKIT</p>
          <h2>Skills that turn<br /><em>ideas into systems.</em></h2>
          <p className="section-intro">The technologies and disciplines I use to bring useful products to life.</p>
        </div>
        <div className="skills-grid">
          {skills.map((skill) => <article className="skill-card" key={skill.id}><span className="skill-icon" aria-hidden="true">{skill.icon || skill.name.slice(0, 1)}</span><div><h3>{skill.name}</h3><p>{skill.group}</p></div></article>)}
        </div>
      </section>}

      {experience.length > 0 && <section className="experience-section section-wrap" id="experience">
        <div className="section-heading">
          <p className="eyebrow">04 / EXPERIENCE</p>
          <h2>A path shaped<br /><em>by making.</em></h2>
          <p className="section-intro">The teams, roles, and chapters that have shaped my work.</p>
        </div>
        <div className="experience-list">
          {experience.map((entry, index) => <article className="experience-item" key={entry.id}>
            <span className="experience-index">{String(index + 1).padStart(2, '0')}</span>
            <div><p className="experience-period">{entry.year}</p><h3>{entry.designation}</h3><p className="experience-company">{entry.company}</p><p className="experience-description">{entry.description}</p></div>
          </article>)}
        </div>
      </section>}

      {testimonials.length > 0 && <section className="testimonial-section">
        <div className="section-wrap">
          <div className="section-heading">
            <p className="eyebrow">05 / KIND WORDS</p>
            <h2>Good work is<br /><em>better together.</em></h2>
            <p className="section-intro">A few words from people I have had the pleasure of working with.</p>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((item) => <figure className="testimonial-card" key={item.id}>
              <blockquote>“{item.content}”</blockquote>
              <figcaption>
                {item.image && <img src={publicApiUrl(item.image.url)} alt={item.image.alt_text || item.name} />}
                <span><strong>{item.name}</strong><small>{item.designation}</small></span>
              </figcaption>
            </figure>)}
          </div>
        </div>
      </section>}

      <footer className="footer section-wrap" id="contact">
        <div className="footer-top">
          <div>
            <p className="eyebrow">HAVE A GOOD ONE IN MIND?</p>
            <h2>Let&apos;s make<br /><em>something matter.</em></h2>
          </div>
          <div className="footer-links">
            {profile.social_links.map((link) => <a className="footer-link" href={link.url} key={link.label} target={link.url.startsWith('http') ? '_blank' : undefined} rel={link.url.startsWith('http') ? 'noreferrer' : undefined}><span className="social-icon" aria-hidden="true">{link.icon || link.label.slice(0, 1)}</span>{link.label} <span>Connect ↗</span></a>)}
            {profile.email && <a className="footer-link" href={`mailto:${profile.email}`}>Email <span>{profile.email} ↗</span></a>}
          </div>
        </div>
        <form className="contact-form" onSubmit={submitContact}>
          <div className="form-row">
            <label>Your name<input autoComplete="name" maxLength={120} name="name" required /></label>
            <label>Your email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
          </div>
          <label>Subject<input maxLength={180} name="subject" required /></label>
          <label>Message<textarea maxLength={5000} minLength={10} name="message" required rows={5} /></label>
          <label className="contact-honeypot" aria-hidden="true">Website<input autoComplete="off" name="website" tabIndex={-1} /></label>
          <button className="button button-primary" disabled={contactBusy} type="submit">{contactBusy ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span></button>
          {contactFeedback && <p className="contact-feedback" role="status">{contactFeedback}</p>}
        </form>
        <div className="footer-bottom">
          <a className="wordmark" href="#top"><span className="wordmark-mark">{profile.full_name.slice(0, 1) || 'N'}.</span><span>MADE WITH INTENTION</span></a>
          <span>© {new Date().getFullYear()} · A work in progress, by design.</span>
          {resume.available && <a href={publicApiUrl('/api/v1/portfolio/cv')}>Résumé ↓</a>}
        </div>
      </footer>
      <button className={`scroll-top${showTop ? ' is-visible' : ''}`} type="button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>↑</button>
      <ChatAssistant />
    </main>
  );
}

export default App;
