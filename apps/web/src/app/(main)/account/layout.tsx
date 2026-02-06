import { PropsWithChildren } from "react";
import { PageLayout, TabsNav } from "../_components/page-layout";
import { Route } from "next";

const ACCOUNT_TABS: {
  label: string;
  href: Route;
}[] = [
  { label: "Profile", href: "/account" },
  { label: "Security", href: "/account/security" },
  { label: "Preferences", href: "/account/preferences" },
  { label: "Linked Accounts", href: "/account/linked" },
];

export default function AccountLayout({ children }: PropsWithChildren) {
  return (
    <PageLayout
      title="Account Settings"
      subtitle="Manage your profile and account preferences"
    >
      <TabsNav tabs={ACCOUNT_TABS} />
      {children}
    </PageLayout>
  );
}
