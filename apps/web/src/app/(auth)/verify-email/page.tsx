"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing verification token");
        return;
      }

      try {
        const { data, error } = await authClient.verifyEmail({
          query: { token },
        });

        if (error) {
          setStatus("error");
          setMessage(error.message || "Verification failed");
        } else {
          setStatus("success");
          setMessage("Email verified successfully!");
        }
      } catch (err) {
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-xl ring-1 ring-gray-900/5">
      <div className="text-center">
        {status === "verifying" && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Verifying...</h2>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900">Verified!</h2>
            <p className="text-sm text-gray-500">{message}</p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Continue to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Verification Failed</h2>
            <p className="text-sm text-gray-500">{message}</p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

