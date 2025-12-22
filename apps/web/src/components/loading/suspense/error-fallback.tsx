import { PropsWithChildren } from "react";
import { FallbackProps } from "react-error-boundary";

interface ErrorFallbackProps extends FallbackProps {
  className?: string;
  message?: string;
}

export default function ErrorFallback(
  props: PropsWithChildren<ErrorFallbackProps>
) {
  return (
    <div className={`${props.className}`}>
      {props.message || "Something went wrong."}
      <button onClick={props.resetErrorBoundary}>Try again</button>
    </div>
  );
}
