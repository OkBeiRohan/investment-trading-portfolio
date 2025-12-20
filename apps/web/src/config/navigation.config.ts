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
        route: "/",
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
        route: "/",
      },
      {
        id: "wealth-assets",
        label: "Assets",
        icon: Coins,
        route: "/",
        subItems: [
          {
            id: "wealth-stocks",
            label: "Stocks & Equity",
            route: "/",
          },
          {
            id: "wealth-mutual-funds",
            label: "Mutual Funds",
            route: "/",
          },
          { id: "wealth-crypto", label: "Cryptocurrency", route: "/" },
          {
            id: "wealth-real-estate",
            label: "Real Estate",
            route: "/",
          },
          {
            id: "wealth-fixed-income",
            label: "Fixed Income",
            route: "/",
          },
        ],
      },
      {
        id: "wealth-analytics",
        label: "Analytics",
        icon: BarChart3,
        route: "/",
        subItems: [
          {
            id: "wealth-allocation",
            label: "Asset Allocation",
            route: "/",
          },
          {
            id: "wealth-performance",
            label: "Performance",
            route: "/",
          },
          {
            id: "wealth-timemachine",
            label: "Time Machine",
            route: "/",
          },
        ],
      },
      {
        id: "wealth-legacy",
        label: "Legacy Planning",
        icon: Shield,
        route: "/",
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
        route: "/",
      },
      {
        id: "trade-options",
        label: "Options Analytics",
        icon: LineChart,
        route: "/",
        subItems: [
          { id: "trade-greeks", label: "Greeks Center", route: "/" },
          {
            id: "trade-volatility",
            label: "Volatility Surface",
            route: "/",
          },
          { id: "trade-gex", label: "Gamma Exposure", route: "/" },
          {
            id: "trade-maxpain",
            label: "Max Pain Analysis",
            route: "/",
          },
        ],
      },
      {
        id: "trade-strategies",
        label: "Strategies",
        icon: Target,
        route: "/",
        badge: "3",
        subItems: [
          {
            id: "trade-active",
            label: "Active Strategies",
            route: "/",
          },
          { id: "trade-create", label: "Create Strategy", route: "/" },
          { id: "trade-backtest", label: "Backtests", route: "/" },
        ],
      },
      {
        id: "trade-execution",
        label: "Execution",
        icon: Zap,
        route: "/",
        subItems: [
          { id: "trade-orders", label: "Order Book", route: "/" },
          { id: "trade-positions", label: "Positions", route: "/" },
          { id: "trade-fills", label: "Fills & Slippage", route: "/" },
        ],
      },
      {
        id: "trade-analytics",
        label: "Performance",
        icon: Activity,
        route: "/",
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
        route: "/organization",
      },
      {
        id: "org-teams",
        label: "Teams",
        icon: Users,
        route: "/",
      },
      {
        id: "org-members",
        label: "Members",
        icon: User,
        route: "/",
      },
      {
        id: "org-access",
        label: "Access Control",
        icon: Lock,
        route: "/",
      },
      {
        id: "org-billing",
        label: "Billing",
        icon: CreditCard,
        route: "/",
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
        route: "/account",
      },
      {
        id: "account-linked",
        label: "Linked Accounts",
        icon: Database,
        route: "/account/linked",
      },
      {
        id: "account-security",
        label: "Security",
        icon: Shield,
        route: "/account/security",
      },
      {
        id: "account-notifications",
        label: "Notifications",
        icon: Bell,
        route: "/",
      },
      {
        id: "account-preferences",
        label: "Preferences",
        icon: Settings,
        route: "/account/preferences",
      },
    ],
  },
];
