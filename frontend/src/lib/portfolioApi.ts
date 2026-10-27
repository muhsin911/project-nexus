export interface DsaCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface DsaProblem {
  id: string;
  category_id: string;
  title: string;
  platform: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problem_url: string;
  tags: string[];
  summary: string;
  solution: string;
  time_complexity: string;
  space_complexity: string;
  solved_at: string | null;
  created_at: string;
}

export type DsaProblemInput = Omit<DsaProblem, 'id' | 'created_at'>;
export type DsaCategoryInput = Omit<DsaCategory, 'id'>;

export interface PortfolioImage {
  id: string;
  filename: string;
  content_type: string;
  alt_text: string;
  url: string;
}

export interface PortfolioContent {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  role: string;
  tech_stack: string[];
  repository_url: string | null;
  live_url: string | null;
  published: boolean;
  featured: boolean;
  sort_order: number;
  image_id: string | null;
  image: PortfolioImage | null;
  local_image_url?: string;
}

export type PortfolioContentInput = Omit<PortfolioContent, 'id' | 'image'>;

export interface PortfolioBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body_html: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type PortfolioBlogPostInput = Omit<PortfolioBlogPost, 'id' | 'created_at' | 'updated_at'>;

export interface ResumeStatus {
  available: boolean;
  filename?: string | null;
  updated_at?: string | null;
}

export interface AdminSession {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface PortfolioSocialLink {
  label: string;
  url: string;
  icon: string;
}

export interface PortfolioProfile {
  full_name: string;
  headline: string;
  job_roles: string[];
  about_title: string;
  about: string;
  location: string;
  phone: string;
  address: string;
  email: string;
  booking_url: string;
  expertise: string[];
  social_links: PortfolioSocialLink[];
}

export interface ExperienceEntry {
  id: string;
  company: string;
  designation: string;
  description: string;
  year: string;
  sort_order: number;
  published: boolean;
}
export type ExperienceInput = Omit<ExperienceEntry, 'id'>;

export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  period: string;
  sort_order: number;
  published: boolean;
}
export type EducationInput = Omit<EducationEntry, 'id'>;

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  sort_order: number;
  published: boolean;
}
export type CertificationInput = Omit<CertificationEntry, 'id'>;

export interface SkillEntry {
  id: string;
  name: string;
  icon: string;
  group: string;
  sort_order: number;
  published: boolean;
}
export type SkillInput = Omit<SkillEntry, 'id'>;

export interface TestimonialEntry {
  id: string;
  name: string;
  designation: string;
  content: string;
  image_id: string | null;
  image: PortfolioImage | null;
  sort_order: number;
  published: boolean;
}
export type TestimonialInput = Omit<TestimonialEntry, 'id' | 'image'>;

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  published: boolean;
}
export type FAQInput = Omit<FAQEntry, 'id'>;

export interface ShowcaseSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image_id: string | null;
  image: PortfolioImage | null;
  action_label: string;
  action_url: string;
  sort_order: number;
  published: boolean;
}
export type ShowcaseInput = Omit<ShowcaseSlide, 'id' | 'image'>;

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
export const apiBase = configuredApiBase.replace(/\/+$/, '').endsWith('/api/v1')
  ? configuredApiBase.replace(/\/+$/, '')
  : `${configuredApiBase.replace(/\/+$/, '')}/api/v1`;

export function publicApiUrl(path: string): string {
  return `${apiBase.replace(/\/api\/v1$/, '')}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);
  if (!response.ok) {
    const authorization = new Headers(init?.headers).get('Authorization');
    if (response.status === 401 && authorization?.startsWith('Bearer ')) {
      sessionStorage.removeItem('nexus-admin-token');
      window.dispatchEvent(new Event('nexus-admin-session-expired'));
    }
    let detail = `Request failed (${response.status}).`;
    try {
      const body: { detail?: string } = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function adminHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function adminJsonHeaders(token: string): HeadersInit {
  return { ...adminHeaders(token), 'Content-Type': 'application/json' };
}

export function getDsaProblems(): Promise<DsaProblem[]> {
  return request('/portfolio/dsa');
}

export function getDsaCategories(): Promise<DsaCategory[]> {
  return request('/portfolio/dsa/categories');
}

export function getPublishedContent(): Promise<PortfolioContent[]> {
  return request('/portfolio/content');
}

export function getPublishedBlogPosts(): Promise<PortfolioBlogPost[]> {
  return request('/portfolio/blog');
}

export function getPublishedBlogPost(slug: string): Promise<PortfolioBlogPost> {
  return request(`/portfolio/blog/${encodeURIComponent(slug)}`);
}

export function getAdminBlogPosts(token: string): Promise<PortfolioBlogPost[]> {
  return request('/portfolio/admin/blog', { headers: adminHeaders(token) });
}

export function saveBlogPost(
  post: PortfolioBlogPostInput,
  token: string,
  id?: string,
): Promise<PortfolioBlogPost> {
  return request(`/portfolio/blog${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(post),
  });
}

export function deleteBlogPost(id: string, token: string): Promise<void> {
  return request(`/portfolio/blog/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getPortfolioProfile(): Promise<PortfolioProfile> {
  return request('/portfolio/profile');
}

export function getExperience(): Promise<ExperienceEntry[]> {
  return request('/portfolio/experience');
}

export function getEducation(): Promise<EducationEntry[]> {
  return request('/portfolio/education');
}

export function getCertifications(): Promise<CertificationEntry[]> {
  return request('/portfolio/certifications');
}

export function getSkills(): Promise<SkillEntry[]> {
  return request('/portfolio/skills');
}

export function getTestimonials(): Promise<TestimonialEntry[]> {
  return request('/portfolio/testimonials');
}

export function getFaqs(): Promise<FAQEntry[]> {
  return request('/portfolio/faq');
}

export function getShowcase(): Promise<ShowcaseSlide[]> {
  return request('/portfolio/showcase');
}

export function sendContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  purpose: 'Freelance' | 'Interview' | 'Consultation' | 'Other';
  message: string;
  website: string;
}): Promise<{ message: string }> {
  return request('/portfolio/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function getAdminFaqs(token: string): Promise<FAQEntry[]> {
  return request('/portfolio/admin/faq', { headers: adminHeaders(token) });
}

export function saveFaq(entry: FAQInput, token: string, id?: string): Promise<FAQEntry> {
  return request(`/portfolio/faq${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteFaq(id: string, token: string): Promise<void> {
  return request(`/portfolio/faq/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getAdminShowcase(token: string): Promise<ShowcaseSlide[]> {
  return request('/portfolio/admin/showcase', { headers: adminHeaders(token) });
}

export function saveShowcase(
  entry: ShowcaseInput,
  token: string,
  id?: string,
): Promise<ShowcaseSlide> {
  return request(`/portfolio/showcase${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteShowcase(id: string, token: string): Promise<void> {
  return request(`/portfolio/showcase/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getResumeStatus(): Promise<ResumeStatus> {
  return request('/portfolio/cv/status');
}

export function loginAdmin(username: string, password: string): Promise<AdminSession> {
  return request('/portfolio/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export function verifyAdminSession(token: string): Promise<void> {
  return request('/portfolio/admin/session', {
    method: 'GET',
    headers: adminHeaders(token),
  });
}

export function getAdminContent(token: string): Promise<PortfolioContent[]> {
  return request('/portfolio/admin/content', { headers: adminHeaders(token) });
}

export function savePortfolioProfile(profile: PortfolioProfile, token: string): Promise<PortfolioProfile> {
  return request('/portfolio/profile', {
    method: 'PUT',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(profile),
  });
}

export function getAdminExperience(token: string): Promise<ExperienceEntry[]> {
  return request('/portfolio/admin/experience', { headers: adminHeaders(token) });
}

export function saveExperience(entry: ExperienceInput, token: string, id?: string): Promise<ExperienceEntry> {
  return request(`/portfolio/experience${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteExperience(id: string, token: string): Promise<void> {
  return request(`/portfolio/experience/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getAdminEducation(token: string): Promise<EducationEntry[]> {
  return request('/portfolio/admin/education', { headers: adminHeaders(token) });
}

export function saveEducation(entry: EducationInput, token: string, id?: string): Promise<EducationEntry> {
  return request(`/portfolio/education${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteEducation(id: string, token: string): Promise<void> {
  return request(`/portfolio/education/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getAdminCertifications(token: string): Promise<CertificationEntry[]> {
  return request('/portfolio/admin/certifications', { headers: adminHeaders(token) });
}

export function saveCertification(
  entry: CertificationInput,
  token: string,
  id?: string,
): Promise<CertificationEntry> {
  return request(`/portfolio/certifications${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteCertification(id: string, token: string): Promise<void> {
  return request(`/portfolio/certifications/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getAdminSkills(token: string): Promise<SkillEntry[]> {
  return request('/portfolio/admin/skills', { headers: adminHeaders(token) });
}

export function saveSkill(entry: SkillInput, token: string, id?: string): Promise<SkillEntry> {
  return request(`/portfolio/skills${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteSkill(id: string, token: string): Promise<void> {
  return request(`/portfolio/skills/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getAdminTestimonials(token: string): Promise<TestimonialEntry[]> {
  return request('/portfolio/admin/testimonials', { headers: adminHeaders(token) });
}

export function saveTestimonial(entry: TestimonialInput, token: string, id?: string): Promise<TestimonialEntry> {
  return request(`/portfolio/testimonials${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(entry),
  });
}

export function deleteTestimonial(id: string, token: string): Promise<void> {
  return request(`/portfolio/testimonials/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function savePortfolioContent(
  content: PortfolioContentInput,
  token: string,
  id?: string,
): Promise<PortfolioContent> {
  return request(`/portfolio/content${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(content),
  });
}

export function deletePortfolioContent(id: string, token: string): Promise<void> {
  return request(`/portfolio/content/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function getAdminImages(token: string): Promise<PortfolioImage[]> {
  return request('/portfolio/admin/images', { headers: adminHeaders(token) });
}

export function uploadPortfolioImage(file: File, altText: string, token: string): Promise<PortfolioImage> {
  const query = new URLSearchParams({ filename: file.name, alt_text: altText });
  return request(`/portfolio/images?${query}`, {
    method: 'POST',
    headers: { ...adminHeaders(token), 'Content-Type': file.type },
    body: file,
  });
}

export function deletePortfolioImage(id: string, token: string): Promise<void> {
  return request(`/portfolio/images/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function saveDsaCategory(
  category: DsaCategoryInput,
  token: string,
  id?: string,
): Promise<DsaCategory> {
  return request(`/portfolio/dsa/categories${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(category),
  });
}

export function deleteDsaCategory(id: string, token: string): Promise<void> {
  return request(`/portfolio/dsa/categories/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
}

export function getAdminDsaProblems(token: string): Promise<DsaProblem[]> {
  return request('/portfolio/dsa', { headers: adminHeaders(token) });
}

export function saveDsaProblem(
  problem: DsaProblemInput,
  token: string,
  id?: string,
): Promise<DsaProblem> {
  return request(`/portfolio/dsa${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: adminJsonHeaders(token),
    body: JSON.stringify(problem),
  });
}

export function deleteDsaProblem(id: string, token: string): Promise<void> {
  return request(`/portfolio/dsa/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
}

export function uploadResume(file: File, token: string): Promise<void> {
  const query = new URLSearchParams({ filename: file.name });
  return request(`/portfolio/cv?${query}`, {
    method: 'PUT',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/pdf' },
    body: file,
  });
}
