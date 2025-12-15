"use client";

import { authClient } from "@/lib/auth/auth-client";
import { redirect } from "next/navigation";

interface LoginState {
  error: string | null;
}

interface LoginFormData {
  email: string;
  password: string;
}

function getFormData(formData: FormData): LoginFormData {
  return {
    email: formData.get("email")?.toString(),
    password: formData.get("password") as string,
  };
}

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const { email, password } = getFormData(formData);

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      return { error: error.message || "Invalid credentials" };
    }

    if (!data) {
      return { error: "Authentication failed" };
    }

    // Successful login - redirect will happen after this returns
    redirect("/");
  } catch (err) {
    // If redirect throws (expected behavior), re-throw it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }

    console.error("Login error:", err);
    return { error: "An unexpected error occurred" };
  }
}
