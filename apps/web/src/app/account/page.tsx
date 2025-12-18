"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { ProfileSettings } from "@/features/account/components/profile-settings";
import { useNavigation } from "@/hooks/use-navigation";

export default function AccountPage() {
  const { setNavigation } = useNavigation();

  useEffect(() => {
    setNavigation({
      title: "Profile Settings",
      breadcrumbs: [
        { label: "Account", href: "/account" as Route },
        { label: "Profile" },
      ],
    });
  }, [setNavigation]);

  return <ProfileSettings />;
}
