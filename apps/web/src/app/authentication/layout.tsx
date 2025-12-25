import styles from "./auth.module.css";
import MainAuthFormContainer from "./_components/container";
import LoginPageCheckerProvider from "./_contexts/login-page-checker";

export default function AuthLayout({
  children,
  information,
  header,
  more,
}: LayoutProps<"/authentication">) {
  return (
    <LoginPageCheckerProvider>
      <div className={styles.authRoot}>
        {information}
        <MainAuthFormContainer>
          {header}
          {children}
          {more}
        </MainAuthFormContainer>
      </div>
    </LoginPageCheckerProvider>
  );
}
