import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContext } from './AuthContext';
import { supabase, supabaseConfigured } from '../utils/supabase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      setError('');
    });

    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch((sessionError: unknown) => {
        if (!active) return;
        setError(sessionError instanceof Error ? sessionError.message : 'Could not restore the sign-in session.');
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase is not configured. Set the frontend environment variables first.');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  }

  async function signUp(email: string, password: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured. Set the frontend environment variables first.');
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    return data.session !== null;
  }

  async function signOut() {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }

  return (
    <AuthContext.Provider value={{ session, loading, configured: supabaseConfigured, error, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
