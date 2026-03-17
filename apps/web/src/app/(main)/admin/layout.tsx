import { PropsWithChildren } from "react";
import { PageLayout, TabsNav } from "../_components/page-layout";
import { Route } from "next";

const ADMIN_TABS: {
  label: string;
  href: Route;
}[] = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Instruments", href: "/admin/instruments" },
  { label: "Experiments", href: "/admin/experiments" },
];

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <PageLayout
      title="Admin Dashboard"
      subtitle="System management and monitoring"
    >
      <TabsNav tabs={ADMIN_TABS} />
      {children}
    </PageLayout>
  );
}
