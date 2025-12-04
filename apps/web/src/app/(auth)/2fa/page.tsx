"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TwoFAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.twoFactor.verifyOtp({
        code,
      });

      if (error) {
        setError(error.message || "Invalid code");
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
          <ShieldCheck className="h-6 w-6 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">Two-Factor Authentication</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleVerify}>
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <div className="mt-2">
            <input
              id="code"
              name="code"
              type="text"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-center text-2xl tracking-[1em] text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="000000"
              maxLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
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

