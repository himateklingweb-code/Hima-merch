"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { revalidatePublicPaths } from "./revalidate";

export interface CollectionState<T> {
  items: T[];
  loading: boolean;
  /** True when rows came from Postgres rather than the bundled seed. */
  live: boolean;
  /** Last write error, shown to the editor rather than swallowed. */
  error: string | null;
  saving: boolean;
  save: (row: T) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

/**
 * Read/write access to a content table for the dashboard.
 *
 * Writes go straight to Postgres under the signed-in staff session, so RLS
 * decides whether they are allowed — an editor without a `staff` row gets a
 * clear error instead of a change that silently disappears on refresh,
 * which is what the old useState-only screens did.
 *
 * Local state is only updated after the database confirms, so what is on
 * screen always matches what was actually stored.
 */
export function useCollection<T extends { id: string }>(
  table: string,
  seed: T[],
  options: {
    orderBy?: string;
    ascending?: boolean;
    /** Public pages to refresh after a write/delete lands, e.g. `["/", "/berita"]`
     *  or, for row-specific detail pages, a function of the saved row. */
    revalidate?: (row?: T) => string[];
  } = {}
): CollectionState<T> {
  const { orderBy = "created_at", ascending = false, revalidate } = options;

  // Starts empty rather than pre-filled with `seed` — painting the demo
  // rows first and swapping them out after the real fetch lands is what
  // made deleted/old items visibly flash on screen for a moment. `reload`
  // below decides whether `seed` or live rows belong here at all.
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setItems(seed);
      setLive(false);
      setLoading(false);
      return;
    }

    const { data, error: readError } = await supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending });

    if (readError) {
      setItems(seed);
      setLive(false);
    } else {
      setItems((data ?? []) as T[]);
      setLive(true);
    }
    setLoading(false);
    // `seed` is a module-level constant array; including it would re-run
    // this on every render without ever changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orderBy, ascending]);

  // Fetching after mount is the point: the row set lives in Postgres, not
  // in React, and reading it during render is impossible. The loading
  // flag is what keeps this from flickering, not a second render pass.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void reload();
  }, [reload]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = useCallback(async (row: T) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi — perubahan tidak tersimpan.");
      return false;
    }

    setSaving(true);
    setError(null);
    const { error: writeError } = await supabase
      .from(table)
      .upsert(row as Record<string, unknown>);
    setSaving(false);

    if (writeError) {
      setError(writeError.message);
      return false;
    }
    await reload();
    if (revalidate) void revalidatePublicPaths(revalidate(row));
    return true;
  }, [table, reload, revalidate]);

  const remove = useCallback(async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi — perubahan tidak tersimpan.");
      return false;
    }

    setSaving(true);
    setError(null);
    const { error: delError } = await supabase.from(table).delete().eq("id", id);
    setSaving(false);

    if (delError) {
      setError(delError.message);
      return false;
    }
    await reload();
    if (revalidate) void revalidatePublicPaths(revalidate());
    return true;
  }, [table, reload, revalidate]);

  return { items, loading, live, error, saving, save, remove, reload };
}
