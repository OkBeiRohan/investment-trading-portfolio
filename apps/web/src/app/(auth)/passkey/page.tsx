"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Fingerprint, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PasskeyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.passkey();

      if (error) {
        setError(error.message || "Passkey authentication failed");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-xl ring-1 ring-gray-900/5">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
          <Fingerprint className="h-6 w-6 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">Passkey Login</h2>
        <p className="mt-2 text-sm text-gray-600">
          Use your device's biometrics or security key
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handlePasskeyLogin}>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Authenticate with Passkey
        </button>
      </form>

      <div className="flex justify-center">
        <Link
          href="/login"
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

