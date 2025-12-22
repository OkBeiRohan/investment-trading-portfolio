import { PropsWithChildren, ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./error-fallback";

interface LoadWithSuspenseProps {
  name: string;
  fallback: ReactNode;
  errorFallback?: ReactNode;
  errorClassName?: string;
  defaultErrorMessage?: string;
  onRetry?: () => void;
  defer?: boolean;
}

export default function LoadWithSuspense(
  props: Required<PropsWithChildren<LoadWithSuspenseProps>>
) {
  return (
    <ErrorBoundary
      fallbackRender={(params) => (
        <ErrorFallback
          {...params}
          className={props.errorClassName}
          message={props.defaultErrorMessage}
        />
      )}
      onError={(error) => {
        console.error(`Error in Suspense component (${props.name}):`, error);
      }}
      onReset={(details) => {
        props.onRetry?.();
        console.log(`Resetting Suspense component (${props.name}).`, details);
      }}
    >
      <Suspense name={props.name} fallback={props.fallback} defer={props.defer}>
        {props.children}
      </Suspense>
    </ErrorBoundary>
  );
}
