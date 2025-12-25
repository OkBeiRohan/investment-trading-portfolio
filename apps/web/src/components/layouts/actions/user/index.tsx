"use client";

import styles from "./user.module.css";
import HeaderUserLoading from "./loading";
import Link from "next/link";
import getUserIcon from "./user-utils";
import HeaderUserOrgSwitcher from "./switcher";
import { Skeleton } from "@/components/loading/skeleton";
import { authClient } from "@repo/auth-client";

export default function HeaderUser() {
  const { data, error, isPending } = authClient.useSession();
  const { data: organization, isPending: isOrgPending } =
    authClient.useActiveOrganization();

  if (isPending) return <HeaderUserLoading />;
  if (!data || error)
    return (
      <div className={styles.headerUser}>
        <Link href="/authentication/login">Login</Link>
      </div>
    );

  return (
    <div className={styles.headerUser}>
      <Link href="/account" className={styles.avatar}>
        {getUserIcon(data.user)}
      </Link>
      <div className={styles.userInfo}>
        <Link href="/account" className={styles.userName}>
          {data.user.name}
        </Link>
        {isOrgPending ? (
          <Skeleton
            className={styles.userRole}
            variant="text"
            width={70}
            height={10}
          />
        ) : (
          <p className={styles.userRole}>
            {organization?.name || data.user.role}
          </p>
        )}
      </div>
      <HeaderUserOrgSwitcher />
    </div>
  );
}
