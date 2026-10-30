import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, configured, error: sessionError, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestError, setRequestError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) navigate('/medications', { replace: true });
  }, [session, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError('');
    setNotice('');
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        const signedIn = await signUp(email, password);
        if (!signedIn) setNotice('Account created. Check your email to confirm it, then sign in.');
      }
    } catch (error: unknown) {
      setRequestError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-blue-900">
          {mode === 'sign-in' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="mb-6 text-slate-600">Sign in to manage your own medication records.</p>

        {!configured && (
          <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Supabase is not configured. Create a <code>Frontend/.env</code> file with
            <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from your project settings,
            then restart Vite.
          </p>
        )}
        {sessionError && <p role="alert" className="mb-4 text-sm text-red-700">{sessionError}</p>}

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </label>
          {requestError && <p role="alert" className="text-sm text-red-700">{requestError}</p>}
          {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
          <button
            type="submit"
            disabled={!configured || loading || submitting}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setRequestError('');
            setNotice('');
          }}
          className="mt-4 text-sm font-medium text-blue-700 hover:underline"
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
        </button>
      </section>
    </main>
  );
}