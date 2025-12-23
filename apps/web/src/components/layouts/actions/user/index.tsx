"use client";

import { useAuth } from "@/hooks/auth/use-auth";
import styles from "./user.module.css";
import HeaderUserLoading from "./loading";
import Link from "next/link";
import getUserIcon from "./user-utils";

export default function HeaderUser() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <HeaderUserLoading />;
  if (!isAuthenticated || !user)
    return (
      <div className={styles.headerUser}>
        <Link href="/authentication/login">Login</Link>
      </div>
    );

  return (
    <div className={styles.headerUser}>
      <div className={styles.avatar}>{getUserIcon(user)}</div>
      <div className={styles.userInfo}>
        <p className={styles.userName}>{user.name}</p>
        <p className={styles.userRole}>{user.role}</p>
      </div>
    </div>
  );
}
