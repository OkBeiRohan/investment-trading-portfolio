import { Suspense } from "react";
import { LinkedAccountsSettings } from "@/features/account/components/linked-accounts-settings";
import LinkedAccountsLoading from "./loading";

export default function LinkedAccountsPage() {
  return (
    <Suspense fallback={<LinkedAccountsLoading />}>
      <LinkedAccountsSettings />
    </Suspense>
  );
}
