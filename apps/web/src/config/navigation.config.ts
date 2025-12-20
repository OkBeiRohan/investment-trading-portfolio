import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Building2,
  Settings,
  User,
  Shield,
  Bell,
  CreditCard,
  Users,
  Lock,
  Database,
  Activity,
  BarChart3,
  Coins,
  LineChart,
  Target,
  Zap,
} from "lucide-react";
import type { Route } from "next";
import type { NavigationSection } from "@/contexts/navigation-context";

/**
 * Main navigation configuration for the application
 * Each section represents a major module with its own sub-navigation
 */
export const navigationConfig: NavigationSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        route: "/" as Route,
      },
    ],
  },
  {
    id: "wealth",
    label: "Wealth Management",
    collapsible: true,
    defaultExpanded: true,
    items: [
      {
        id: "wealth-overview",
        label: "Overview",
        icon: Wallet,
        route: "/" as Route,
      },
      {
        id: "wealth-assets",
        label: "Assets",
        icon: Coins,
        route: "/" as Route,
        subItems: [
          {
            id: "wealth-stocks",
            label: "Stocks & Equity",
            route: "/" as Route,
          },
          {
            id: "wealth-mutual-funds",
            label: "Mutual Funds",
            route: "/" as Route,
          },
          { id: "wealth-crypto", label: "Cryptocurrency", route: "/" as Route },
          {
            id: "wealth-real-estate",
            label: "Real Estate",
            route: "/" as Route,
          },
          {
            id: "wealth-fixed-income",
            label: "Fixed Income",
            route: "/" as Route,
          },
        ],
      },
      {
        id: "wealth-analytics",
        label: "Analytics",
        icon: BarChart3,
        route: "/" as Route,
        subItems: [
          {
            id: "wealth-allocation",
            label: "Asset Allocation",
            route: "/" as Route,
          },
          {
            id: "wealth-performance",
            label: "Performance",
            route: "/" as Route,
          },
          {
            id: "wealth-timemachine",
            label: "Time Machine",
            route: "/" as Route,
          },
        ],
      },
      {
        id: "wealth-legacy",
        label: "Legacy Planning",
        icon: Shield,
        route: "/" as Route,
      },
    ],
  },
  {
    id: "trading",
    label: "Algorithmic Trading",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "trade-overview",
        label: "Cockpit",
        icon: TrendingUp,
        route: "/" as Route,
      },
      {
        id: "trade-options",
        label: "Options Analytics",
        icon: LineChart,
        route: "/" as Route,
        subItems: [
          { id: "trade-greeks", label: "Greeks Center", route: "/" as Route },
          {
            id: "trade-volatility",
            label: "Volatility Surface",
            route: "/" as Route,
          },
          { id: "trade-gex", label: "Gamma Exposure", route: "/" as Route },
          {
            id: "trade-maxpain",
            label: "Max Pain Analysis",
            route: "/" as Route,
          },
        ],
      },
      {
        id: "trade-strategies",
        label: "Strategies",
        icon: Target,
        route: "/" as Route,
        badge: "3",
        subItems: [
          {
            id: "trade-active",
            label: "Active Strategies",
            route: "/" as Route,
          },
          { id: "trade-create", label: "Create Strategy", route: "/" as Route },
          { id: "trade-backtest", label: "Backtests", route: "/" as Route },
        ],
      },
      {
        id: "trade-execution",
        label: "Execution",
        icon: Zap,
        route: "/" as Route,
        subItems: [
          { id: "trade-orders", label: "Order Book", route: "/" as Route },
          { id: "trade-positions", label: "Positions", route: "/" as Route },
          { id: "trade-fills", label: "Fills & Slippage", route: "/" as Route },
        ],
      },
      {
        id: "trade-analytics",
        label: "Performance",
        icon: Activity,
        route: "/" as Route,
      },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "org-overview",
        label: "Overview",
        icon: Building2,
        route: "/organization" as Route,
      },
      {
        id: "org-teams",
        label: "Teams",
        icon: Users,
        route: "/" as Route,
      },
      {
        id: "org-members",
        label: "Members",
        icon: User,
        route: "/" as Route,
      },
      {
        id: "org-access",
        label: "Access Control",
        icon: Lock,
        route: "/" as Route,
      },
      {
        id: "org-billing",
        label: "Billing",
        icon: CreditCard,
        route: "/" as Route,
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "account-profile",
        label: "Profile",
        icon: User,
        route: "/account" as Route,
      },
      {
        id: "account-linked",
        label: "Linked Accounts",
        icon: Database,
        route: "/" as Route,
      },
      {
        id: "account-security",
        label: "Security",
        icon: Shield,
        route: "/" as Route,
      },
      {
        id: "account-notifications",
        label: "Notifications",
        icon: Bell,
        route: "/" as Route,
      },
      {
        id: "account-preferences",
        label: "Preferences",
        icon: Settings,
        route: "/" as Route,
      },
    ],
  },
];
