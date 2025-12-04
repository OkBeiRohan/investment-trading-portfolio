import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/auth/use-auth";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
  backLink?: { label: string; href: string };
  footerSlot?: React.ReactNode;
}

export function Sidebar({ items, title, backLink, footerSlot }: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        {backLink ? (
          <Link
            href={backLink.href}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLink.label}
          </Link>
        ) : (
          <span className="text-lg font-semibold">{title}</span>
        )}
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {items.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  isActive
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        {footerSlot}
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function MainSidebar() {
  const items = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Portfolio", href: "/portfolio", icon: LayoutDashboard },
    { label: "Trades", href: "/trades", icon: LayoutDashboard },
    { label: "Strategies", href: "/strategies", icon: LayoutDashboard },
    { label: "Organizations", href: "/organizations", icon: Users },
    { label: "Account", href: "/account", icon: User },
  ];

  return <Sidebar items={items} title="Project Quantum" />;
}

export function OrgSidebar({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const items = [
    {
      label: "Overview",
      href: `/organizations/${orgId}`,
      icon: LayoutDashboard,
    },
    {
      label: "Members",
      href: `/organizations/${orgId}/members`,
      icon: Users,
    },
    {
      label: "Settings",
      href: `/organizations/${orgId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <Sidebar
      items={items}
      title={orgName}
      backLink={{ label: "Back to Main", href: "/dashboard" }}
    />
  );
}

export function AccountSidebar() {
  const items = [
    { label: "Profile", href: "/account", icon: User },
    { label: "Security", href: "/account/security", icon: Settings },
    { label: "Preferences", href: "/account/preferences", icon: Settings },
  ];

  return (
    <Sidebar
      items={items}
      title="My Account"
      backLink={{ label: "Back to Dashboard", href: "/dashboard" }}
    />
  );
}
