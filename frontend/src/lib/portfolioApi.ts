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
  published: boolean;
  sort_order: number;
  image_id: string | null;
  image: PortfolioImage | null;
}

export type PortfolioContentInput = Omit<PortfolioContent, 'id' | 'image'>;

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
