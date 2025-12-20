import { LinkedAccountsSettings } from "@/features/account/components/linked-accounts-settings";
import { Suspense } from "react";

export default function LinkedAccountsPage() {
  return (
    <Suspense fallback={<div>Loading linked accounts...</div>}>
      <LinkedAccountsSettings />
    </Suspense>
  );
}
