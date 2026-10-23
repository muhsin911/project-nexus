export interface DsaProblem {
  id: string;
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

export interface ResumeStatus {
  available: boolean;
  filename?: string | null;
  updated_at?: string | null;
}

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
const apiBase = configuredApiBase.replace(/\/+$/, '').endsWith('/api/v1')
  ? configuredApiBase.replace(/\/+$/, '')
  : `${configuredApiBase.replace(/\/+$/, '')}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);
  if (!response.ok) {
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

export function getDsaProblems(): Promise<DsaProblem[]> {
  return request('/portfolio/dsa');
}

export function getResumeStatus(): Promise<ResumeStatus> {
  return request('/portfolio/cv/status');
}

export function verifyAdminToken(token: string): Promise<void> {
  return request('/portfolio/admin/verify', {
    method: 'POST',
    headers: adminHeaders(token),
  });
}

export function saveDsaProblem(
  problem: DsaProblemInput,
  token: string,
  id?: string,
): Promise<DsaProblem> {
  return request(`/portfolio/dsa${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(problem),
  });
}

export function deleteDsaProblem(id: string, token: string): Promise<void> {
  return request(`/portfolio/dsa/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
}

export function uploadResume(file: File, token: string): Promise<void> {
  const filename = new URLSearchParams({ filename: file.name });
  return request(`/portfolio/cv?${filename}`, {
    method: 'PUT',
    headers: { ...adminHeaders(token), 'Content-Type': 'application/pdf' },
    body: file,
  });
}
