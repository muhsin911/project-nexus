import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { BlogPage } from '@/components/BlogPage';
import { DsaPage } from '@/components/DsaPage';
import { ManagePage } from '@/components/ManagePage';
import {
  getExperience,
  getPortfolioProfile,
  getPublishedContent,
  getResumeStatus,
  getSkills,
  publicApiUrl,
  sendContactMessage,
  type ExperienceEntry,
  type PortfolioContent,
  type PortfolioProfile,
  type ResumeStatus,
  type SkillEntry,
} from '@/lib/portfolioApi';

const Scene = lazy(() => import('@/components/3d/Scene').then(({ Scene: SceneComponent }) => ({ default: SceneComponent })));
const CpuSection = lazy(() => import('@/components/CpuSection').then(({ CpuSection: Section }) => ({ default: Section })));

const defaultProfile: PortfolioProfile = {
  full_name: 'Abdul Muhsin K',
  headline: 'Software Engineer | Python, Django & FastAPI',
  job_roles: ['Software Engineer', 'Python Developer', 'AI Engineer'],
  about_title: 'Building full-stack systems that make work simpler.',
  about: 'Software Engineer with 2+ years of experience building full-stack applications with Python, Django, FastAPI, and React. Developed 25+ REST API endpoints, improved API response times by 30%, and automated CI/CD workflows that cut deployment time by 50%. Experienced with Docker-based services and Generative AI (LLM/RAG) integration.',
  location: 'Dubai, UAE',
  phone: '+971 55 355 2442',
  address: '',
  email: 'amkmuhsinzsb@gmail.com',
  booking_url: '',
  expertise: ['Python & Django', 'FastAPI & REST APIs', 'React', 'PostgreSQL & MySQL', 'Docker & CI/CD', 'Generative AI & RAG'],
  social_links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/muhsin911', icon: 'linkedin' },
    { label: 'GitHub', url: 'https://github.com/muhsin911', icon: 'github' },
  ],
};

const cvProjects: PortfolioContent[] = [
  {
    id: 'cv-atb-accessibility-toolbar',
    title: 'ATB Accessibility Toolbar',
    slug: 'atb-accessibility-toolbar',
    excerpt: 'A full-stack accessibility product that helps websites provide tools for people with physical, visual, and cognitive disabilities.',
    body: 'Built voice and speech-based navigation, added AI-assisted intelligent navigation, and connected Django, Node.js, WordPress, and database services in a Docker-based deployment on AWS.',
    role: 'Full-stack project · Yatnam Technologies',
    tech_stack: ['Django', 'Node.js', 'WordPress', 'JavaScript', 'PostgreSQL', 'MySQL', 'AWS', 'Docker', 'CI/CD'],
    repository_url: null,
    live_url: 'https://accessibilitytoolbar.com',
    published: true,
    featured: true,
    sort_order: 0,
    image_id: null,
    image: null,
  },
  {
    id: 'cv-production-tracking-platform',
    title: 'Production & Manufacturing Tracking Platform',
    slug: 'production-manufacturing-tracking-platform',
    excerpt: 'A confidential platform replacing spreadsheet- and email-based inventory and international container shipment tracking.',
    body: 'Built FastAPI REST endpoints and a React interface, with GitHub Actions and CI/CD automation for delivery. Project details are limited because the work is confidential.',
    role: 'Yatnam Technologies · Confidential',
    tech_stack: ['FastAPI', 'React', 'GitHub Actions', 'CI/CD', 'Agentic AI development'],
    repository_url: null,
    live_url: null,
    published: true,
    featured: false,
    sort_order: 1,
    image_id: null,
    image: null,
  },
];

const cvExperience: ExperienceEntry[] = [
  {
    id: 'cv-yatnam-software-engineer',
    company: 'Yatnam Technologies',
    designation: 'Software Engineer',
    description: 'Built 3+ full-stack business applications and 25+ REST API endpoints. Improved API response time by 30%, reduced local setup time by 40% with a four-service Docker environment, and cut deployment time by 50% with GitHub Actions CI/CD.',
    year: 'July 2024 — May 2026',
    sort_order: 0,
    published: true,
  },
  {
    id: 'cv-inmakes-developer-intern',
    company: 'Inmakes Infotech Pvt. Ltd.',
    designation: 'Python-Django Developer Intern',
    description: 'Developed 2+ production-ready web applications and 15+ REST API endpoints. Implemented CRUD operations, business logic, JWT authentication, and role-based access control across 10+ database entities.',
    year: 'April 2023 — September 2023',
    sort_order: 1,
    published: true,
  },
  {
    id: 'cv-ayisha-it-support',
    company: 'Ayisha Luqman & Co LLP',
    designation: 'Office Operations & IT Support',
    description: 'Resolved Level 1 and Level 2 hardware, software, and network support requests for a 10-person accounting team, and managed user access and software installations with minimal downtime.',
    year: 'October 2020 — January 2023',
    sort_order: 2,
    published: true,
  },
];

const cvEducation = [
  { institution: 'Kalasalingam University', degree: 'M.Sc. Data Science', period: '2025 — Present' },
  { institution: 'University of Calicut', degree: 'B.Sc. Physics', period: '2016 — 2019' },
];

const cvCertifications = [
  'Software Engineering Specialization — The Hong Kong University of Science and Technology',
  'Generative AI for Software Developers — DeepLearning.AI, Coursera',
  'Python Master — Inmakes LearningHub',
  'JavaScript Algorithms and Data Structures — freeCodeCamp',
  'Front End Development Libraries — freeCodeCamp',
  'Databases for Developers: Foundations — Oracle Dev Gym',
];

const cvSkills: SkillEntry[] = [
  { id: 'cv-programming', name: 'Programming', group: 'Python · JavaScript · SQL · Bash', icon: '</>', sort_order: 0, published: true },
  { id: 'cv-backend', name: 'Backend', group: 'Django · FastAPI · Node.js · REST APIs', icon: '{}', sort_order: 1, published: true },
  { id: 'cv-frontend', name: 'Frontend', group: 'React · Redux · HTML · CSS · Tailwind', icon: 'UI', sort_order: 2, published: true },
  { id: 'cv-databases', name: 'Databases', group: 'PostgreSQL · MySQL · SQLite · Oracle', icon: 'DB', sort_order: 3, published: true },
  { id: 'cv-devops', name: 'DevOps & Cloud', group: 'Docker · GitHub Actions · CI/CD · AWS · Linux', icon: '↗', sort_order: 4, published: true },
  { id: 'cv-generative-ai', name: 'Generative AI', group: 'LLMs · RAG · Prompt Engineering · OpenAI API', icon: 'AI', sort_order: 5, published: true },
  { id: 'cv-agentic-ai', name: 'Agentic AI', group: 'LangChain · LangGraph · Tool Calling · Workflows', icon: '✳', sort_order: 6, published: true },
];

const toolIconLabels: Record<string, string> = {
  Python: 'Py', JavaScript: 'JS', SQL: 'SQL', Bash: 'Ba', Django: 'Dj',
  FastAPI: 'Fa', 'Node.js': 'Nd', 'REST APIs': 'API', React: 'Re', Redux: 'Rx',
  HTML: '5', CSS: '3', Tailwind: 'Tw', PostgreSQL: 'Pg', MySQL: 'My',
  SQLite: 'Sq', Oracle: 'Or', Docker: 'Dk', 'GitHub Actions': 'Gh',
  'CI/CD': 'CI', AWS: 'AWS', Linux: 'Lx', LLMs: 'AI', RAG: 'RAG',
  'Prompt Engineering': 'PE', 'OpenAI API': 'AI', LangChain: 'LC',
  LangGraph: 'LG', 'Tool Calling': 'TC', Workflows: 'WF',
};

function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/manage') return <ManagePage />;
  if (path === '/dsa') return <DsaPage />;
  if (path === '/blog' || path.startsWith('/blog/')) {
    return <BlogPage slug={path.startsWith('/blog/') ? path.slice('/blog/'.length) : undefined} />;
  }
  return <Portfolio />;
}

function CpuSectionSlot() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef}>
      {visible ? (
        <Suspense fallback={<section className="cpu-section cpu-loading" aria-label="Loading interactive processor"><p>Loading processor…</p></section>}>
          <CpuSection />
        </Suspense>
      ) : (
        <section className="cpu-section cpu-loading" aria-label="Interactive processor section">
          <div className="cpu-copy"><p className="eyebrow">A SMALL INTERACTIVE DETAIL</p><h2>Built to<br /><em>think.</em></h2></div>
          <div className="cpu-canvas" aria-hidden="true" />
        </section>
      )}
    </div>
  );
}

function Portfolio() {
  const [profile, setProfile] = useState(defaultProfile);
  const [content, setContent] = useState<PortfolioContent[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [loadingContent, setLoadingContent] = useState(true);
  const [portfolioError, setPortfolioError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexus-theme') ?? 'dark');
  const [showTop, setShowTop] = useState(false);
  const [visibleProjectCount, setVisibleProjectCount] = useState(3);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactFeedback, setContactFeedback] = useState('');
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const skillsTrackRef = useRef<HTMLDivElement>(null);
  const skillDragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  const roleList = profile.job_roles.length ? profile.job_roles : defaultProfile.job_roles;
  const activeRole = roleList[activeRoleIndex % roleList.length] ?? defaultProfile.job_roles[0];
  const visibleExperience = experience.length ? experience : cvExperience;
  const visibleSkills = skills.length ? skills : cvSkills;
  const visibleProjects = useMemo(() => {
    const managedSlugs = new Set(content.map((project) => project.slug));
    return [...content, ...cvProjects.filter((project) => !managedSlugs.has(project.slug))]
      .sort((first, second) => Number(second.featured) - Number(first.featured));
  }, [content]);
  const visibleSkillCategories = useMemo(() => {
    const categories = new Map<string, string[]>();
    visibleSkills.forEach((skill) => {
      const category = skill.id.startsWith('cv-') ? skill.name : skill.group || 'Other';
      const tools = skill.id.startsWith('cv-')
        ? skill.group.split('·').map((tool) => tool.trim()).filter(Boolean)
        : [skill.name];
      categories.set(category, [...(categories.get(category) ?? []), ...tools]);
    });
    return [...categories.entries()].map(([name, tools]) => [name, [...new Set(tools)]] as const);
  }, [visibleSkills]);

  function startSkillDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !skillsTrackRef.current) return;
    skillDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: skillsTrackRef.current.scrollLeft,
    };
    skillsTrackRef.current.classList.add('is-dragging');
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveSkillDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!skillDragRef.current || !skillsTrackRef.current) return;
    skillsTrackRef.current.scrollLeft =
      skillDragRef.current.scrollLeft - (event.clientX - skillDragRef.current.startX);
  }

  function endSkillDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!skillDragRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    skillDragRef.current = null;
    skillsTrackRef.current?.classList.remove('is-dragging');
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nexus-theme', theme);
  }, [theme]);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 480);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.title = `${profile.full_name} · ${profile.headline}`;
  }, [profile.full_name, profile.headline]);

  useEffect(() => {
    if (roleList.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveRoleIndex((index) => (index + 1) % roleList.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [roleList]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getPortfolioProfile(),
      getPublishedContent(),
      getExperience(),
      getSkills(),
      getResumeStatus(),
    ])
      .then(([profileResult, contentResult, experienceResult, skillsResult, resumeResult]) => {
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
    const purpose = values.get('purpose');
    setContactBusy(true);
    setContactFeedback('');
    try {
      const result = await sendContactMessage({
        name: String(values.get('name') ?? ''),
        email: String(values.get('email') ?? ''),
        subject: String(values.get('subject') ?? ''),
        purpose: purpose === 'Freelance'
          || purpose === 'Interview'
          || purpose === 'Consultation'
          ? purpose
          : 'Other',
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
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#skills">Skills</a>
          <a href="#experience">Experience</a>
          <a href="/blog">Blog</a>
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span> {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <a className="nav-contact" href="#contact">Contact <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section className="hero section-wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> {profile.location ? `${profile.location.toUpperCase()} · ` : ''}OPEN TO WHAT&apos;S NEXT</p>
          <h1>Thoughtful code.<br /><em>Real-world</em> impact.</h1>
          <div className="hero-designation" aria-atomic="true" aria-live="polite">
            <span>Working as</span>
            <span className="hero-designation-value" key={activeRole}>{activeRole}</span>
          </div>
          <p className="hero-description">
            {profile.about || defaultProfile.about}
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">Explore the work <span aria-hidden="true">↘</span></a>
            <a
              className="button button-quiet"
              href={resume.available ? publicApiUrl('/api/v1/portfolio/cv') : '/cv/Software_Engineer_CV_Abdul_Muhsin_K.pdf'}
              download
            >
              Download résumé <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="hero-footnote">A living portfolio — built with intention, always in progress.</p>
        </div>

        <div className="hero-art" aria-label="Decorative three-dimensional desktop computer model">
          <Suspense fallback={<div className="scene-fallback" role="status">Loading desktop illustration…</div>}>
            <Scene />
          </Suspense>
        </div>
      </section>

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
        ) : visibleProjects.length ? (
          <div className="project-list">
            {visibleProjects.slice(0, visibleProjectCount).map((item, index) => (
              <article className={`project-card${item.featured ? ' is-featured' : ''}`} key={item.id}>
                <div className="project-visual" aria-label={item.image?.alt_text ?? `${item.title} cover art`} role="img">
                  {item.image ? (
                    <img alt={item.image.alt_text} src={publicApiUrl(item.image.url)} />
                  ) : (
                    <>
                      <div className="project-visual-lines" />
                      <div className="project-orbit"><span>{String(index + 1).padStart(2, '0')}</span></div>
                    </>
                  )}
                </div>
                <div className="project-details">
                  <div className="project-meta"><span>{item.featured ? 'FEATURED PROJECT' : item.role || 'SELECTED WORK'}</span></div>
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
        ) : null}
        {visibleProjects.length > visibleProjectCount && (
          <button className="button button-quiet load-more" onClick={() => setVisibleProjectCount((count) => count + 3)} type="button">
            Load more projects <span aria-hidden="true">↓</span>
          </button>
        )}
        <div className="work-note">
          <span className="note-mark">↳</span>
          <p>More work is taking shape. <a href="#contact">Have something interesting in mind?</a></p>
        </div>
      </section>

      <section className="approach-section" id="about">
        <div className="section-wrap approach-grid about-grid">
          <div className="about-portrait-panel">
            <img
              className="about-portrait"
              src="/images/profile.webp"
              alt={`${profile.full_name} portrait`}
              loading="lazy"
            />
            <span className="about-portrait-caption">{profile.full_name} · {profile.location}</span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">02 / ABOUT ME</p>
            <h2>{profile.about_title || 'Make it useful. Make it feel effortless.'}</h2>
            <p className="approach-lead">{profile.about || defaultProfile.about}</p>
          </div>
        </div>
      </section>

      <CpuSectionSlot />

      {visibleSkills.length > 0 && <section className="skills-section section-wrap" id="skills">
        <div className="section-heading">
          <p className="eyebrow">03 / TOOLKIT</p>
          <h2>Tools for the<br /><em>work I do.</em></h2>
        </div>
        <div
          className="skills-carousel"
          onPointerCancel={endSkillDrag}
          onPointerDown={startSkillDrag}
          onPointerMove={moveSkillDrag}
          onPointerUp={endSkillDrag}
          role="region"
          aria-label="Skill categories"
          tabIndex={0}
        >
          <div className="skills-track" ref={skillsTrackRef}>
            {visibleSkillCategories.map(([category, tools]) => (
              <article className="skill-category-card" key={category}>
                <h3>{category}</h3>
                <div className="skill-tool-list">
                  {tools.map((tool) => (
                    <span className="skill-tool" key={`${category}-${tool}`}>
                      <span className="skill-tool-icon" aria-hidden="true">{toolIconLabels[tool] || tool.slice(0, 2).toUpperCase()}</span>
                      <span>{tool}</span>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>}

      {visibleExperience.length > 0 && <section className="experience-section section-wrap" id="experience">
        <div className="section-heading">
          <p className="eyebrow">04 / EXPERIENCE</p>
          <h2>A path shaped<br /><em>by making.</em></h2>
          <p className="section-intro">The teams, roles, and chapters that have shaped my work.</p>
        </div>
        <div className="experience-list">
          {visibleExperience.map((entry, index) => <article className="experience-item" key={entry.id}>
            <span className="experience-index">{String(index + 1).padStart(2, '0')}</span>
            <div><p className="experience-period">{entry.year}</p><h3>{entry.designation}</h3><p className="experience-company">{entry.company}</p><p className="experience-description">{entry.description}</p></div>
          </article>)}
        </div>
      </section>}

      <section className="credentials-section section-wrap" aria-labelledby="education-heading">
        <div className="section-heading">
          <p className="eyebrow">05 / EDUCATION &amp; CERTIFICATIONS</p>
          <h2 id="education-heading">A foundation for<br /><em>what&apos;s next.</em></h2>
        </div>
        <div className="credentials-grid">
          <div className="education-list">
            {cvEducation.map((entry) => (
              <article className="education-item" key={entry.institution}>
                <p>{entry.period}</p>
                <h3>{entry.degree}</h3>
                <span>{entry.institution}</span>
              </article>
            ))}
          </div>
          <ul className="certification-list">
            {cvCertifications.map((certification) => <li key={certification}>{certification}</li>)}
          </ul>
        </div>
      </section>

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
        <div className="contact-details">
          {profile.email && <a href={`mailto:${profile.email}`}><span>EMAIL</span>{profile.email} ↗</a>}
          {profile.phone && <a href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}><span>PHONE</span>{profile.phone} ↗</a>}
          {profile.address && <p><span>LOCATION</span>{profile.address}</p>}
          {profile.booking_url && <a className="booking-link" href={profile.booking_url} target="_blank" rel="noreferrer"><span>BOOK A CALL</span>Choose a time that works ↗</a>}
        </div>
        <form className="contact-form" onSubmit={submitContact}>
          <div className="form-row">
            <label>Your name<input autoComplete="name" maxLength={120} name="name" required /></label>
            <label>Your email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
          </div>
          <label>What would you like to discuss?<select name="purpose" defaultValue="Freelance"><option>Freelance</option><option>Interview</option><option>Consultation</option><option>Other</option></select></label>
          <label>Subject<input maxLength={180} name="subject" required /></label>
          <label>Message<textarea maxLength={5000} minLength={10} name="message" required rows={5} /></label>
          <label className="contact-honeypot" aria-hidden="true">Website<input autoComplete="off" name="website" tabIndex={-1} /></label>
          <button className="button button-primary" disabled={contactBusy} type="submit">{contactBusy ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span></button>
          {contactFeedback && <p className="contact-feedback" role="status">{contactFeedback}</p>}
        </form>
        <div className="footer-bottom">
          <a className="wordmark" href="#top"><span className="wordmark-mark">{profile.full_name.slice(0, 1) || 'N'}.</span><span>MADE WITH INTENTION</span></a>
          <span>© {new Date().getFullYear()} · A work in progress, by design.</span>
          <a href="/blog">Blog</a>
          <a href="/dsa">Problem log</a>
          {resume.available && <a href={publicApiUrl('/api/v1/portfolio/cv')}>Résumé ↓</a>}
        </div>
      </footer>
      <button className={`scroll-top${showTop ? ' is-visible' : ''}`} type="button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>↑</button>
    </main>
  );
}

export default App;
