"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

/**
 * Customer + staff authentication, shared across the storefront.
 *
 * Both roles use the same Supabase Auth session; a "customer" is simply a
 * signed-in user with no `staff` row. The admin area manages its own session
 * reads, but mounting this at the root means the navbar, checkout and account
 * page all see one consistent auth state.
 */
interface AuthValue {
  user: User | null;
  /** True until the initial session read finishes, so the UI can hold still. */
  loading: boolean;
  /** Best display name we have for the account. */
  displayName: string;
  /** Google profile photo, when the account signed in with Google. */
  avatarUrl: string;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error?: string }>;
  signInWithEmail: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ error?: string }>;
  /**
   * Create a local account. `needsConfirmation` is true when Supabase is
   * configured to require email verification before the session is usable.
   */
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string,
    captchaToken?: string
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Where Google should return to. Falls back to the account page. */
function callbackUrl(redirectTo?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  const dest = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/akun";
  return `${base}?redirect=${encodeURIComponent(dest)}`;
}

export function nameFromUser(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email ||
    "Akun"
  );
}

/** Google returns the profile photo under avatar_url / picture. */
export function avatarFromUser(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return (meta.avatar_url as string) || (meta.picture as string) || "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase belum dikonfigurasi." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(redirectTo) },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase belum dikonfigurasi." };
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        // Anti-bot: when captcha protection is on, Supabase verifies this
        // token server-side and rejects the request without it.
        ...(captchaToken ? { options: { captchaToken } } : {}),
      });
      // Vague on purpose — telling apart "wrong password" from "no such
      // account" leaks which emails are registered.
      return error ? { error: "Email atau kata sandi salah." } : {};
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
      captchaToken?: string
    ) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase belum dikonfigurasi." };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: fullName ? { full_name: fullName.trim() } : undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) return { error: error.message };
      // When email confirmation is on, signUp returns a user but no session.
      const needsConfirmation = Boolean(data.user) && !data.session;
      return { needsConfirmation };
    },
    []
  );

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      displayName: nameFromUser(user),
      avatarUrl: avatarFromUser(user),
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
