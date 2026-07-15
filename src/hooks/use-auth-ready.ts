import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Waits for supabase-js to finish restoring the session from storage before
 * enabling authenticated queries. Prevents the INITIAL_SESSION race where
 * `auth.uid()` is momentarily null — which makes RLS drop rows and, when the
 * refresh token is stale, causes an unexpected sign-out on tab mount.
 */
export function useAuthReady() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setIsReady(true);
    }).catch(() => {
      if (!mounted) return;
      setUser(null);
      setIsReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, isReady };
}
