import { PropsWithChildren } from "react";
import { PageLayout, TabsNav } from "../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Route } from "next";

const WEALTH_TABS: {
  label: string;
  href: Route;
}[] = [
  { label: "Overview", href: "/wealth" },
  { label: "Assets", href: "/wealth/assets" },
  { label: "Analytics", href: "/wealth/analytics" },
  { label: "Legacy Planning", href: "/wealth/legacy" },
];

export default function WealthLayout({ children }: PropsWithChildren) {
  return (
    <PageLayout
      title="Wealth Management"
      subtitle="Track and grow your wealth portfolio"
      actions={<Button>Add Asset</Button>}
    >
      <TabsNav tabs={WEALTH_TABS} />
      {children}
    </PageLayout>
  );
}
