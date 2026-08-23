import { type FormEvent, useState } from 'react';
import { Atmosphere } from '@/app/layout/Atmosphere';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Logo } from '@/shared/ui/Logo';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { apiErrorMessage } from '@/shared/lib/apiError';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending, error } = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate({ email, password });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Atmosphere />
      <Card className="relative w-full max-w-[400px] px-9 py-10">
        <div className="mb-7 flex items-center gap-2.5">
          <Logo size={34} />
          <span className="text-[17px] font-extrabold tracking-tight">Office App</span>
        </div>

        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          Admin Console
        </p>
        <h1 className="mb-6 text-[22px] font-extrabold text-balance">Sign in to your workspace</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-[12.5px] font-bold text-text-dim">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-3 text-[14.5px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-[12.5px] font-bold text-text-dim">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-3 text-[14.5px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(error)}
            </p>
          )}

          <Button type="submit" isLoading={isPending} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-[13px]">
          <a href="#" className="text-text-dim transition-colors hover:text-accent-light">
            Forgot password?
          </a>
        </div>
      </Card>
    </div>
  );
}
