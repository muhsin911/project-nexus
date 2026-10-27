import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAws,
  faCss3Alt,
  faDocker,
  faGithub,
  faHtml5,
  faJs,
  faLinkedin,
  faLinux,
  faNodeJs,
  faOpenai,
  faPostgresql,
  faPython,
  faReact,
  faWhatsapp,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';
import {
  faArrowsRotate,
  faBrain,
  faBolt,
  faCode,
  faCommentDots,
  faDatabase,
  faDiagramProject,
  faCalendarDays,
  faEnvelope,
  faFileCode,
  faLayerGroup,
  faLink,
  faMagnifyingGlass,
  faPhone,
  faPlug,
  faRobot,
  faServer,
  faTable,
  faTerminal,
  faCubesStacked,
  faWind,
} from '@fortawesome/free-solid-svg-icons';
import { useForm, ValidationError } from '@formspree/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { BlogPage } from '@/components/BlogPage';
import { CustomPointer } from '@/components/CustomPointer';
import { DsaPage } from '@/components/DsaPage';
import { ManagePage } from '@/components/ManagePage';
import {
  getCertifications,
  getEducation,
  getExperience,
  getPortfolioProfile,
  getPublishedContent,
  getResumeStatus,
  getSkills,
  publicApiUrl,
  sendContactMessage,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type PortfolioContent,
  type PortfolioProfile,
  type ResumeStatus,
  type SkillEntry,
} from '@/lib/portfolioApi';

const Scene = lazy(() => import('@/components/3d/Scene').then(({ Scene: SceneComponent }) => ({ default: SceneComponent })));

const defaultProfile: PortfolioProfile = {
  full_name: 'Abdul Muhsin K',
  headline: 'Software Engineer | Python, Django & FastAPI',
  job_roles: ['Software Engineer', 'Python Developer', 'AI Engineer'],
  about_title: 'Software that makes work simpler.',
  about: 'I build full-stack applications that turn complex workflows into clear, reliable products. At Yatnam Technologies, I developed 25+ REST API endpoints and helped improve response times by 30%. I also streamlined development with Docker and CI/CD, reducing setup time by 40% and deployments by 50%. My work spans Python, Django, FastAPI, React, and applied generative AI.',
  location: '',
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

const staticDeployment = import.meta.env.VITE_STATIC_DEPLOYMENT === 'true';

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
    local_image_url: '/images/accessibility-toolbar.png',
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

const cvEducation: EducationEntry[] = [
  { id: 'cv-education-kalasalingam', institution: 'Kalasalingam University', degree: 'M.Sc. Data Science', period: '2025 — Present', sort_order: 0, published: true },
  { id: 'cv-education-calicut', institution: 'University of Calicut', degree: 'B.Sc. Physics', period: '2016 — 2019', sort_order: 1, published: true },
];

const cvCertifications: CertificationEntry[] = [
  { id: 'cv-certification-1', name: 'Software Engineering Specialization', issuer: 'The Hong Kong University of Science and Technology', sort_order: 0, published: true },
  { id: 'cv-certification-2', name: 'Generative AI for Software Developers', issuer: 'DeepLearning.AI, Coursera', sort_order: 1, published: true },
  { id: 'cv-certification-3', name: 'Python Master', issuer: 'Inmakes LearningHub', sort_order: 2, published: true },
  { id: 'cv-certification-4', name: 'JavaScript Algorithms and Data Structures', issuer: 'freeCodeCamp', sort_order: 3, published: true },
  { id: 'cv-certification-5', name: 'Front End Development Libraries', issuer: 'freeCodeCamp', sort_order: 4, published: true },
  { id: 'cv-certification-6', name: 'Databases for Developers: Foundations', issuer: 'Oracle Dev Gym', sort_order: 5, published: true },
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

const toolIcons: Record<string, IconDefinition> = {
  Python: faPython,
  JavaScript: faJs,
  SQL: faDatabase,
  Bash: faTerminal,
  Django: faServer,
  FastAPI: faBolt,
  'Node.js': faNodeJs,
  'REST APIs': faPlug,
  React: faReact,
  Redux: faLayerGroup,
  HTML: faHtml5,
  CSS: faCss3Alt,
  Tailwind: faWind,
  PostgreSQL: faPostgresql,
  MySQL: faTable,
  SQLite: faFileCode,
  Oracle: faCubesStacked,
  Docker: faDocker,
  'GitHub Actions': faGithub,
  'CI/CD': faArrowsRotate,
  AWS: faAws,
  Linux: faLinux,
  LLMs: faBrain,
  RAG: faMagnifyingGlass,
  'Prompt Engineering': faCommentDots,
  'OpenAI API': faOpenai,
  LangChain: faLink,
  LangGraph: faDiagramProject,
  'Tool Calling': faRobot,
  Workflows: faDiagramProject,
};

function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!staticDeployment && path === '/manage') return <ManagePage />;
  if (!staticDeployment && path === '/dsa') return <DsaPage />;
  if (!staticDeployment && (path === '/blog' || path.startsWith('/blog/'))) {
    return <BlogPage slug={path.startsWith('/blog/') ? path.slice('/blog/'.length) : undefined} />;
  }
  return <Portfolio />;
}

function Portfolio() {
  const [formspreeState, handleFormspreeSubmit] = useForm('mqppqlwb');
  const [profile, setProfile] = useState(defaultProfile);
  const [content, setContent] = useState<PortfolioContent[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState(cvEducation);
  const [certifications, setCertifications] = useState(cvCertifications);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [resume, setResume] = useState<ResumeStatus>({ available: false });
  const [loadingContent, setLoadingContent] = useState(!staticDeployment);
  const [portfolioError, setPortfolioError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexus-theme') ?? 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSkillIndex, setActiveSkillIndex] = useState(0);
  const [skillsPaused, setSkillsPaused] = useState(false);
  const [activeSection, setActiveSection] = useState('top');
  const [footerVisible, setFooterVisible] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [visibleProjectCount, setVisibleProjectCount] = useState(3);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactFeedback, setContactFeedback] = useState('');
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const skillScrollTimerRef = useRef<number | null>(null);
  const roleList = profile.job_roles.length ? profile.job_roles : defaultProfile.job_roles;
  const activeRole = roleList[activeRoleIndex % roleList.length] ?? defaultProfile.job_roles[0];
  const socialLinks = [...profile.social_links];
  const twitterLink = socialLinks.find((link) => (
    link.icon.toLowerCase() === 'twitter' || link.icon.toLowerCase() === 'x'
  ));
  if (twitterLink) {
    twitterLink.url = 'https://x.com/muhsin__911p';
  } else {
    socialLinks.push({ label: 'Twitter', url: 'https://x.com/muhsin__911p', icon: 'twitter' });
  }
  const phoneDigits = profile.phone.replace(/\D/g, '');
  if (phoneDigits && !socialLinks.some((link) => link.icon.toLowerCase() === 'whatsapp')) {
    const twitterIndex = socialLinks.findIndex((link) => (
      link.icon.toLowerCase() === 'twitter' || link.icon.toLowerCase() === 'x'
    ));
    socialLinks.splice(twitterIndex + 1, 0, {
      label: 'WhatsApp',
      url: `https://wa.me/${phoneDigits}`,
      icon: 'whatsapp',
    });
  }
  const visibleExperience = experience.length ? experience : cvExperience;
  const visibleSkills = skills.length ? skills : cvSkills;
  const visibleProjects = useMemo(() => {
    const managedSlugs = new Set(content.map((project) => project.slug));
    return [...content, ...cvProjects.filter((project) => !managedSlugs.has(project.slug))]
      .sort((first, second) => Number(second.featured) - Number(first.featured));
  }, [content]);
  const skillsCarouselRef = useRef<HTMLDivElement>(null);
  const skillDragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
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
  const activeSkillIndex = Math.min(
    selectedSkillIndex,
    Math.max(visibleSkillCategories.length - 1, 0),
  );

  function startSkillDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !skillsCarouselRef.current || visibleSkillCategories.length < 2) return;
    skillDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: skillsCarouselRef.current.scrollLeft,
    };
    event.currentTarget.classList.add('is-dragging');
    event.currentTarget.setPointerCapture(event.pointerId);
    setSkillsPaused(true);
  }

  function moveSkillDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = skillDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !skillsCarouselRef.current) return;
    skillsCarouselRef.current.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  }

  function endSkillDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = skillDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    skillDragRef.current = null;
    event.currentTarget.classList.remove('is-dragging');
    const carousel = skillsCarouselRef.current;
    const cards = carousel?.querySelectorAll<HTMLElement>('.skill-category-card');
    const carouselLeft = carousel?.getBoundingClientRect().left ?? 0;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    cards?.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - carouselLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveSkillIndex(nearestIndex);
    setSkillsPaused(false);
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
    const sections = ['top', 'about', 'work', 'skills', 'experience', 'contact']
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-22% 0px -65% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const footer = document.getElementById('contact');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => {
      setFooterVisible(entry.isIntersecting);
    });
    observer.observe(footer);
    return () => observer.disconnect();
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
    if (visibleSkillCategories.length < 2 || skillsPaused) return;
    const timer = window.setInterval(() => {
      setActiveSkillIndex((index) => (index + 1) % visibleSkillCategories.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [skillsPaused, visibleSkillCategories.length]);

  useEffect(() => {
    const carousel = skillsCarouselRef.current;
    const activeCard = carousel?.querySelectorAll<HTMLElement>('.skill-category-card')[activeSkillIndex];
    if (!carousel || !activeCard || skillDragRef.current) return;
    carousel.scrollTo({
      left: carousel.scrollLeft + activeCard.getBoundingClientRect().left - carousel.getBoundingClientRect().left,
      behavior: 'smooth',
    });
  }, [activeSkillIndex]);

  function updateActiveSkillFromScroll() {
    if (skillScrollTimerRef.current !== null) {
      window.clearTimeout(skillScrollTimerRef.current);
    }
    skillScrollTimerRef.current = window.setTimeout(() => {
      const carousel = skillsCarouselRef.current;
      const cards = carousel?.querySelectorAll<HTMLElement>('.skill-category-card');
      if (!carousel || !cards?.length) return;
      const carouselLeft = carousel.getBoundingClientRect().left;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().left - carouselLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      setActiveSkillIndex(nearestIndex);
    }, 100);
  }

  useEffect(() => {
    if (staticDeployment) return;
    let active = true;
    Promise.allSettled([
      getPortfolioProfile(),
      getPublishedContent(),
      getExperience(),
      getEducation(),
      getCertifications(),
      getSkills(),
      getResumeStatus(),
    ])
      .then(([profileResult, contentResult, experienceResult, educationResult, certificationsResult, skillsResult, resumeResult]) => {
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
        if (educationResult.status === 'fulfilled') {
          setEducation(educationResult.value);
        } else {
          setPortfolioError((current) => current || (
            educationResult.reason instanceof Error
              ? educationResult.reason.message
              : 'Education entries could not be loaded.'
          ));
        }
        if (certificationsResult.status === 'fulfilled') {
          setCertifications(certificationsResult.value);
        } else {
          setPortfolioError((current) => current || (
            certificationsResult.reason instanceof Error
              ? certificationsResult.reason.message
              : 'Certifications could not be loaded.'
          ));
        }
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
    const message = {
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
    } as const;
    setContactBusy(true);
    setContactFeedback('');
    try {
      const result = await sendContactMessage(message);
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
      <CustomPointer />

      <nav className={`portfolio-dock${footerVisible ? ' is-contact-active' : ''}`} aria-label="Portfolio sections">
        <a href="#top" aria-label="Home" data-tooltip="Home" aria-current={activeSection === 'top' ? 'location' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5H14v-7h-4v7H3.5z" /></svg>
        </a>
        <a href="#about" aria-label="About" data-tooltip="About" aria-current={activeSection === 'about' ? 'location' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
        </a>
        <a href="#work" aria-label="Portfolio" data-tooltip="Portfolio" aria-current={activeSection === 'work' ? 'location' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="13" rx="1.5" /><path d="M8.5 6V4h7v2M3.5 11h17M10 11v2h4v-2" /></svg>
        </a>
        <a href="#experience" aria-label="Experience" data-tooltip="Experience" aria-current={activeSection === 'experience' ? 'location' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M8 9h8M8 13h8M8 16h4" /></svg>
        </a>
        <a href="#contact" aria-label="Contact" data-tooltip="Contact" aria-current={activeSection === 'contact' ? 'location' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v12H9l-5 3z" /><path d="M8 10h8M8 14h5" /></svg>
        </a>
      </nav>

      <section className="hero section-wrap" id="top">
        <header className="topline">
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                {theme === 'dark'
                  ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>
                  : <path d="M20.2 15.1A8.4 8.4 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />}
              </svg>
            </button>
            {!staticDeployment && <div className="dsa-menu">
              <button
                aria-controls="portfolio-menu"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="menu-toggle"
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                <span className={`menu-icon${menuOpen ? ' is-open' : ''}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </button>
              {menuOpen && (
                <nav className="menu-popover" id="portfolio-menu" aria-label="Main navigation">
                  {!staticDeployment && <a href="/blog">Blog <span>↗</span></a>}
                  {!staticDeployment && <a href="/dsa">DSA <span>↗</span></a>}
                </nav>
              )}
            </div>}
          </div>
        </header>
        <div className="hero-copy">
          <h1>Thoughtful code.<br /><em>Real-world impact.</em></h1>
          <div className="hero-designation" aria-atomic="true" aria-live="polite">
            <span className="hero-designation-value" key={activeRole}>{activeRole}</span>
          </div>
          <div className="hero-actions">
            <a className="button button-primary" href="#about">View profile <span aria-hidden="true">↘</span></a>
            <a
              className="button button-quiet"
              href={resume.available ? publicApiUrl('/api/v1/portfolio/cv') : '/cv/Software_Engineer_CV_Abdul_Muhsin_K.pdf'}
              download
            >
              Download résumé <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <div className="hero-art" aria-label="Interactive three-dimensional desktop computer model">
          <Suspense fallback={<div className="scene-fallback" role="status">Loading desktop illustration…</div>}>
            <Scene />
          </Suspense>
        </div>
      </section>
      <div className="hero-name-marquee" role="img" aria-label={profile.full_name}>
        <div className="hero-name-track" aria-hidden="true">
          <span>{profile.full_name}</span>
        </div>
      </div>

      <section className="approach-section" id="about">
        <div className="section-wrap approach-grid about-grid">
          <div className="about-portrait-panel">
            <img
              className="about-portrait"
              src="/images/profile.webp"
              alt={`${profile.full_name} portrait`}
              loading="lazy"
            />
            <span className="about-portrait-caption">{profile.full_name}</span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">02 / ABOUT ME</p>
            <h2>{profile.about_title || 'Software that makes work simpler.'}</h2>
            <p className="approach-lead">{profile.about || defaultProfile.about}</p>
          </div>
        </div>
      </section>

      <section className="work-section section-wrap" id="work">
        <div className="section-heading">
          <p className="eyebrow">03 / SELECTED PROJECTS</p>
          <h2>Work with a<br /><em>point of view.</em></h2>
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
              {item.image || item.local_image_url ? (
                <>
                  <img
                    alt={item.image?.alt_text ?? `${item.title} preview`}
                    className={item.local_image_url ? 'project-static-image' : undefined}
                    src={item.local_image_url ?? (item.image ? publicApiUrl(item.image.url) : '')}
                  />
                  {item.local_image_url && <span className="project-image-overlay" aria-hidden="true" />}
                </>
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

      {visibleSkills.length > 0 && <section className="skills-section section-wrap" id="skills">
        <div className="section-heading">
          <p className="eyebrow">04 / TOOLKIT</p>
          <h2>Tools for the<br /><em>work I do.</em></h2>
        </div>
        <div
          className="skills-carousel"
          onScroll={updateActiveSkillFromScroll}
          onPointerCancel={endSkillDrag}
          onPointerDown={startSkillDrag}
          onPointerMove={moveSkillDrag}
          onPointerUp={endSkillDrag}
          onPointerEnter={() => setSkillsPaused(true)}
          onPointerLeave={() => {
            if (!skillDragRef.current) setSkillsPaused(false);
          }}
          role="region"
          aria-label="Skill categories"
          ref={skillsCarouselRef}
        >
          <div className="skills-track">
            {visibleSkillCategories.map(([category, tools], index) => (
              <article className="skill-category-card" key={category}>
                <p className="eyebrow">{String(index + 1).padStart(2, '0')} / TOOLSET</p>
                <h3>{category}</h3>
                <div className="skill-tool-list">
                  {tools.map((tool) => (
                    <span className="skill-tool" key={`${category}-${tool}`}>
                      <span className="skill-tool-icon" aria-hidden="true">
                        <FontAwesomeIcon icon={toolIcons[tool] ?? faCode} />
                      </span>
                      <span>{tool}</span>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
        {visibleSkillCategories.length > 1 && (
          <div className="skills-pagination" role="group" aria-label="Choose a skill category">
            {visibleSkillCategories.map(([category], index) => (
              <button
                aria-label={`Show ${category} skills`}
                aria-pressed={activeSkillIndex === index}
                className={activeSkillIndex === index ? 'is-active' : ''}
                key={category}
                onClick={() => setActiveSkillIndex(index)}
                type="button"
              />
            ))}
          </div>
        )}
      </section>}

      {visibleExperience.length > 0 && <section className="experience-section section-wrap" id="experience">
        <div className="section-heading">
          <p className="eyebrow">05 / EXPERIENCE</p>
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
          <p className="eyebrow">06 / EDUCATION &amp; CERTIFICATIONS</p>
          <h2 id="education-heading">A foundation for<br /><em>what&apos;s next.</em></h2>
        </div>
        <div className="credentials-grid">
          <div className="education-list">
            {education.map((entry) => (
              <article className="education-item" key={entry.id}>
                <p>{entry.period}</p>
                <h3>{entry.degree}</h3>
                <span>{entry.institution}</span>
              </article>
            ))}
          </div>
          <ul className="certification-list">
            {certifications.map((certification) => (
              <li key={certification.id}>
                {certification.name}{certification.issuer ? ` — ${certification.issuer}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="footer section-wrap" id="contact">
        <div className="footer-top">
          <div>
            <p className="eyebrow">HAVE A GOOD ONE IN MIND?</p>
            <h2>Let&apos;s make<br /><em>something matter.</em></h2>
          </div>
          <div className="footer-links" aria-label="Social profiles">
            {socialLinks.map((link) => (
              <a
                aria-label={link.label}
                className="footer-link"
                href={link.url}
                key={link.label}
                rel="noreferrer"
                target="_blank"
                title={link.label}
              >
                <SocialIcon name={link.icon} />
              </a>
            ))}
            {profile.email && (
              <a aria-label="Email" className="footer-link" href={`mailto:${profile.email}`} title="Email">
                <SocialIcon name="email" />
              </a>
            )}
          </div>
        </div>
        <div className="contact-grid">
          <div className="contact-details">
            {profile.email && <a href={`mailto:${profile.email}`}><SocialIcon name="email" /><span>EMAIL</span><strong>{profile.email}</strong></a>}
            {profile.phone && <a href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}><SocialIcon name="phone" /><span>PHONE</span><strong>{profile.phone}</strong></a>}
            {profile.booking_url && <a className="booking-link" href={profile.booking_url} target="_blank" rel="noreferrer"><SocialIcon name="calendar" /><span>BOOK A CALL</span><strong>Choose a time that works</strong></a>}
          </div>
          <form
            className="contact-form"
            onSubmit={staticDeployment ? handleFormspreeSubmit : submitContact}
          >
            {staticDeployment && <input name="_subject" type="hidden" value="Portfolio contact message" />}
            <div className="form-row">
              <label>
                Your name
                <input autoComplete="name" maxLength={120} name="name" required />
                {staticDeployment && <ValidationError errors={formspreeState.errors} field="name" />}
              </label>
              <label>
                Your email
                <input autoComplete="email" maxLength={254} name="email" required type="email" />
                {staticDeployment && <ValidationError errors={formspreeState.errors} field="email" />}
              </label>
            </div>
            <label>What would you like to discuss?<select name="purpose" defaultValue="Freelance"><option>Freelance</option><option>Interview</option><option>Consultation</option><option>Other</option></select></label>
            <label>
              Subject
              <input maxLength={180} name="subject" required />
              {staticDeployment && <ValidationError errors={formspreeState.errors} field="subject" />}
            </label>
            <label>
              Message
              <textarea maxLength={5000} minLength={10} name="message" required rows={5} />
              {staticDeployment && <ValidationError errors={formspreeState.errors} field="message" />}
            </label>
            <label className="contact-honeypot" aria-hidden="true">
              Website
              <input autoComplete="off" name={staticDeployment ? '_gotcha' : 'website'} tabIndex={-1} />
            </label>
            <button
              className="button button-primary"
              disabled={staticDeployment ? formspreeState.submitting : contactBusy}
              type="submit"
            >
              {(staticDeployment ? formspreeState.submitting : contactBusy) ? 'Sending…' : 'Send message'}
              <span aria-hidden="true">↗</span>
            </button>
            {staticDeployment && (
              <>
                {formspreeState.succeeded && <p className="contact-feedback" role="status">Thanks! Your message has been sent.</p>}
                <ValidationError className="contact-feedback" errors={formspreeState.errors} />
              </>
            )}
            {!staticDeployment && contactFeedback && <p className="contact-feedback" role="status">{contactFeedback}</p>}
          </form>
        </div>
        <div className="footer-bottom">
          <a className="wordmark" href="#top"><span className="wordmark-mark">{profile.full_name.slice(0, 1) || 'N'}.</span><span>MADE WITH INTENTION</span></a>
          <span>© {new Date().getFullYear()} · A work in progress, by design.</span>
          {!staticDeployment && <a href="/blog">Blog</a>}
          {!staticDeployment && <a href="/dsa">Problem log</a>}
          <a href={resume.available ? publicApiUrl('/api/v1/portfolio/cv') : '/cv/Software_Engineer_CV_Abdul_Muhsin_K.pdf'}>Résumé ↓</a>
        </div>
      </footer>
      <button className={`scroll-top${showTop ? ' is-visible' : ''}`} type="button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>↑</button>
    </main>
  );
}

function SocialIcon({ name }: { name: string }) {
  const icon = name.toLowerCase();
  const icons: Record<string, IconDefinition> = {
    linkedin: faLinkedin,
    github: faGithub,
    twitter: faXTwitter,
    x: faXTwitter,
    whatsapp: faWhatsapp,
    email: faEnvelope,
    mail: faEnvelope,
    phone: faPhone,
    calendar: faCalendarDays,
  };
  return <FontAwesomeIcon className="social-icon" icon={icons[icon] ?? faLink} aria-hidden="true" />;
}

export default App;
