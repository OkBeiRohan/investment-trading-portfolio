"use client";

import { handleAuthSuccess } from "@/lib/actions/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { useEffect } from "react";

export default function OneTapAuth() {
  const handleOneTapLogin = async () => {
    try {
      await authClient.oneTap({
        
        fetchOptions: {
          onSuccess: () => {
            handleAuthSuccess();
          },
        },
      });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    handleOneTapLogin();
  }, []);

  return null;
}
