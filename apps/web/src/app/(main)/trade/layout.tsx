import { PropsWithChildren } from "react";
import { PageLayout, TabsNav } from "../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Route } from "next";

const TRADE_TABS: {
  label: string;
  href: Route;
}[] = [
  { label: "Execution", href: "/trade/execution" },
  { label: "Strategies", href: "/trade/strategies" },
  { label: "Options", href: "/trade/options" },
  { label: "Analytics", href: "/trade/analytics" },
];

export default function TradeLayout({ children }: PropsWithChildren) {
  return (
    <PageLayout
      title="Trading"
      subtitle="Execute trades and manage your strategies"
      actions={<Button>New Trade</Button>}
    >
      <TabsNav tabs={TRADE_TABS} />
      {children}
    </PageLayout>
  );
}
