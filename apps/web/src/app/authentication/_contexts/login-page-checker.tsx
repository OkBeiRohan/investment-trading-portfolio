"use client";

import { usePathname } from "next/navigation";
import { createContext, PropsWithChildren, useContext, useState } from "react";
import { StoreCallbackUrl } from "../login/store-callback-url";

interface ILoginPageCheckerContext {
  isLoginPage: boolean;
  showForm: boolean;
  getStarted: () => void;
}

export const LoginPageCheckerContext = createContext<ILoginPageCheckerContext>({
  isLoginPage: false,
  showForm: false,
  getStarted: () => {},
});

export const useLoginPageChecker = () => {
  return useContext(LoginPageCheckerContext);
};

export default function LoginPageCheckerProvider(props: PropsWithChildren) {
  const [showForm, setShowForm] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/authentication/login";

  return (
    <LoginPageCheckerContext.Provider
      value={{ isLoginPage, showForm, getStarted: () => setShowForm(true) }}
    >
      {isLoginPage && <StoreCallbackUrl />}
      {props.children}
    </LoginPageCheckerContext.Provider>
  );
}
