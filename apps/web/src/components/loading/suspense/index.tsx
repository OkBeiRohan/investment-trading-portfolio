"use client";

import { PropsWithChildren, ReactNode, Suspense } from "react";
import { withErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./error-fallback";

interface LoadWithSuspenseProps {
  name: string;
  fallback: ReactNode;
  errorFallback?: ReactNode;
  errorClassName?: string;
  defaultErrorMessage?: string;
  defer?: boolean;
}

function LoadWithSuspense(
  props: Required<PropsWithChildren<LoadWithSuspenseProps>>
) {
  return (
    <Suspense name={props.name} fallback={props.fallback} defer={props.defer}>
      {props.children}
    </Suspense>
  );
}

const LoadWithSuspenseAndError = withErrorBoundary(LoadWithSuspense, {
  fallbackRender: (props) => (
    <ErrorFallback
      {...props}
      message={props.message}
      className={props.className}
    >
      {props.errorFallback}
    </ErrorFallback>
  ),
  onError: (error) => {
    console.error(`Error in Suspense component (${props.name}):`, error);
  },
  onReset: (details) => {
    console.log(`Resetting Suspense component (${props.name}).`, details);
  },
});

export default LoadWithSuspenseAndError;
