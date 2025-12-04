"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });

      if (error) {
        setError(error.message || "Failed to send magic link");
      } else {
        setSuccess(true);
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
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Magic Link Login</h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in without a password
        </p>
      </div>

      {success ? (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Check your email</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>We sent a magic link to {email}. Click it to sign in.</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="text-sm font-medium text-green-800 hover:text-green-900"
                >
                  Try another email
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleMagicLink}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Magic Link
            </button>
          </form>
        </>
      )}

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

