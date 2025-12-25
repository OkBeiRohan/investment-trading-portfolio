"use client";

import styles from "./auth.module.css";
import MainAuthFormContainer from "./_components/container";
import LoginPageCheckerProvider from "./_contexts/login-page-checker";

export default function AuthLayout({
  children,
  header,
  information,
}: LayoutProps<"/authentication">) {
  return (
    <LoginPageCheckerProvider>
      <div className={styles.authRoot}>
        {information}
        <MainAuthFormContainer>
          {header}
          {children}
        </MainAuthFormContainer>
      </div>
    </LoginPageCheckerProvider>
  );
}
