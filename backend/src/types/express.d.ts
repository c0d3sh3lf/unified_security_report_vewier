declare global {
  namespace Express { interface Request { user?: { _id: unknown; name: string; email: string; role: 'admin' | 'user'; active: boolean }; } }
}
export {};
