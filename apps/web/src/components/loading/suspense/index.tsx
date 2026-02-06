"use client";

import { PropsWithChildren, ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./error-fallback";

interface LoadWithSuspenseProps {
  name: string;
  fallback: ReactNode;
  errorFallback?: ReactNode;
  errorClassName?: string;
  defaultErrorMessage?: string;
}

function LoadWithSuspenseAndError(
  props: PropsWithChildren<LoadWithSuspenseProps>
) {
  const { name, errorFallback, errorClassName, defaultErrorMessage } = props;

  return (
    <ErrorBoundary
      fallbackRender={(fbProps) => (
        <ErrorFallback
          {...fbProps}
          message={defaultErrorMessage}
          className={errorClassName}
        >
          {errorFallback}
        </ErrorFallback>
      )}
      onError={(error, info) => {
        console.error(`Error in Suspense component (${name}):`, error, info);
      }}
      onReset={(details) => {
        console.log(`Resetting Suspense component (${name}).`, details);
      }}
    >
      <Suspense name={props.name} fallback={props.fallback}>
        {props.children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default LoadWithSuspenseAndError;
