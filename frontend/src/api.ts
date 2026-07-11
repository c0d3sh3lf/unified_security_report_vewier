export type Role = 'admin' | 'user';
export type User = { id?: string; _id?: string; name: string; email: string; role: Role; active: boolean; createdAt?: string };
export type Summary = { critical: number; high: number; medium: number; low: number; info?: number; unknown?: number; total?: number; totalFindings?: number; scans?: number };
export type Scan = { _id: string; pipeline: string; buildNumber: string; branch: string; commit: string; buildUrl: string; tool: 'trivy' | 'semgrep'; artifact: string; findings: Finding[]; summary: Summary; source: 'api' | 'manual'; scannedAt: string; ownerId: string };
export type Finding = { identifier: string; title: string; severity: string; category: string; target: string; location: string; description: string; reference: string };
export type ApiKey = { _id: string; label: string; prefix: string; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; createdAt: string };
const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const storage = typeof localStorage === 'undefined' ? null : localStorage;
let token = storage?.getItem('sentinel_token') ?? '';
export const setToken = (value: string) => { token = value; if (value) storage?.setItem('sentinel_token', value); else storage?.removeItem('sentinel_token'); };
export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message ?? 'Request failed');
  return body.data as T;
};
export const api = {
  login: (email: string, password: string) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/auth/me'), profile: (data: Record<string, string>) => request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  overview: () => request<Summary>('/dashboard/overview'), pipelines: () => request<Array<{ _id: string; scans: number; latestScan: string; critical: number; high: number; totalFindings: number }>>('/dashboard/pipelines'),
  scans: () => request<Scan[]>('/scans'), scan: (id: string) => request<Scan>(`/scans/${id}`), upload: (data: Record<string, unknown>) => request<Scan>('/scans', { method: 'POST', body: JSON.stringify(data) }),
  keys: () => request<ApiKey[]>('/api-keys'), createKey: (data: { label: string; expiresAt?: string | null }) => request<ApiKey & { key: string }>('/api-keys', { method: 'POST', body: JSON.stringify(data) }), revokeKey: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  users: () => request<User[]>('/users'), createUser: (data: Record<string, string>) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) })
};
