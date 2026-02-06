"use client";

import { PropsWithChildren } from "react";
import { FallbackProps, useErrorBoundary } from "react-error-boundary";

interface ErrorFallbackProps extends FallbackProps {
  className?: string;
  message?: string;
}

export default function ErrorFallback(
  props: PropsWithChildren<ErrorFallbackProps>
) {
  const { resetBoundary } = useErrorBoundary();

  return (
    <div className={props.className}>
      {props.message || "Something went wrong."}
      {`${props.error}`}
      <button onClick={resetBoundary}>Try again</button>
    </div>
  );
}
