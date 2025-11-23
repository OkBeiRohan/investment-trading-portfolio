import { useState, useEffect, useCallback } from "react";
import type { AuthClient, InferSession, InferUser } from "../auth-client.types";

export interface UseAuthOptions {
  authClient: AuthClient;
  redirectOnUnauthenticated?: string;
}

export interface UseAuthReturn {
  session: InferSession["data"] | null;
  user: InferUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = (options: UseAuthOptions): UseAuthReturn => {
  const { authClient, redirectOnUnauthenticated } = options;
  const [session, setSession] = useState<InferSession["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.getSession();

      if (response.data) {
        setSession(response.data);
      } else {
        setSession(null);
        if (redirectOnUnauthenticated && typeof window !== "undefined") {
          window.location.href = redirectOnUnauthenticated;
        }
      }
    } catch (err) {
      setError(err as Error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [authClient, redirectOnUnauthenticated]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
      setSession(null);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/sign-in";
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [authClient]);

  return {
    session,
    user: session?.user || null,
    isLoading,
    isAuthenticated: !!session,
    error,
    refetch: fetchSession,
    signOut,
  };
};
