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
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchMyProfile, type MyProfile } from "@/lib/profile-repo";

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
  /** Nama tampilan, departemen, dan peran panel (null bila belum dimuat). */
  profile: MyProfile | null;
  /** Nama yang ditampilkan. Tidak pernah berupa alamat email lengkap. */
  displayName: string;
  /** Google profile photo, when the account signed in with Google. */
  avatarUrl: string;
  /** Muat ulang profil setelah nama/departemen diubah. */
  refreshProfile: () => Promise<void>;
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
  // "//evil.com" juga diawali "/", jadi ditolak supaya tidak jadi open redirect.
  const dest =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/akun";
  return `${base}?redirect=${encodeURIComponent(dest)}`;
}

/**
 * Nama terbaik untuk akun: nama tampilan di profil, lalu nama dari Google /
 * pendaftaran, lalu bagian depan email (tanpa domain, email tidak bocor).
 */
export function nameFromUser(
  user: User | null,
  profileName?: string | null
): string {
  if (!user) return "";
  if (profileName && profileName.trim()) return profileName.trim();
  const meta = user.user_metadata ?? {};
  const metaName = (
    (meta.full_name as string) ||
    (meta.name as string) ||
    ""
  ).trim();
  if (metaName) return metaName;
  const local = (user.email ?? "").split("@")[0];
  return local || "Akun";
}

/** Google returns the profile photo under avatar_url / picture. */
export function avatarFromUser(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return (meta.avatar_url as string) || (meta.picture as string) || "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Tanpa Supabase tidak ada sesi untuk dibaca: langsung selesai memuat.
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

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

  // Profil ikut akun. Pemicunya id (bukan objek user) supaya refresh token
  // berkala tidak memicu request ulang.
  const userId = user?.id ?? null;
  useEffect(() => {
    let active = true;
    const load = userId ? fetchMyProfile() : Promise.resolve(null);
    load.then((p) => {
      if (active) setProfile(p);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    setProfile(await fetchMyProfile());
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
      const name = fullName?.replace(/\s+/g, " ").trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: name ? { full_name: name } : undefined,
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
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      profile,
      displayName: nameFromUser(user, profile?.display_name),
      avatarUrl: avatarFromUser(user),
      refreshProfile,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [
      user,
      loading,
      profile,
      refreshProfile,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
