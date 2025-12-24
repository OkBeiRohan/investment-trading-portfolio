"use client";

import { useAuth } from "@/hooks/auth/use-auth";
import { useOrganization } from "@/hooks/auth/use-organization";
import styles from "./user.module.css";
import HeaderUserLoading from "./loading";
import Link from "next/link";
import getUserIcon from "./user-utils";
import HeaderUserOrgSwitcher from "./switcher";
import { Skeleton } from "@/components/loading/skeleton";

export default function HeaderUser() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { organization, isLoading: isOrgLoading } = useOrganization();

  if (isLoading) return <HeaderUserLoading />;
  if (!isAuthenticated || !user)
    return (
      <div className={styles.headerUser}>
        <Link href="/authentication/login">Login</Link>
      </div>
    );

  return (
    <div className={styles.headerUser}>
      <Link href="/account" className={styles.avatar}>
        {getUserIcon(user)}
      </Link>
      <div className={styles.userInfo}>
        <Link href="/account" className={styles.userName}>
          {user.name}
        </Link>
        {isOrgLoading ? (
          <Skeleton
            className={styles.userRole}
            variant="text"
            width={70}
            height={10}
          />
        ) : (
          <p className={styles.userRole}>{organization?.name || user.role}</p>
        )}
      </div>
      <HeaderUserOrgSwitcher />
    </div>
  );
}
