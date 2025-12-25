"use client";

import { PropsWithChildren } from "react";
import { useLoginPageChecker } from "../../_contexts/login-page-checker";
import styles from "./container.module.css";

export default function MainAuthFormContainer(props: PropsWithChildren) {
  const { showForm } = useLoginPageChecker();

  return (
    <div
      className={`${styles.formContainer} ${showForm ? styles.formVisible : ""}`}
      data-show={showForm}
    >
      {props.children}
    </div>
  );
}
