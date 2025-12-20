"use client";

import { LinkedAccountsSettings } from "@/features/account/components/linked-settings";
import { authClient } from "@/lib/auth/auth-client";
import { use } from "react";

export default function LinkedAccountsPage() {
  const { data: linkedAccounts, error } = use(authClient.listAccounts());

  if (error) {
    return <div>Error loading linked accounts: {error.message}</div>;
  }

  return <LinkedAccountsSettings initialAccounts={linkedAccounts || []} />;
}
