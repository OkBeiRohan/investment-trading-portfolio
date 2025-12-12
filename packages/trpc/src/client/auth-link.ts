import { observable } from "@repo/trpc/client";

export const authLink = (authClient: AuthClient) => {
  return ({ next, op }) => {
    return observable((observer) => {
      return next(op).subscribe({
        next(result) {
          observer.next(result);
        },
        error(err) {
          // 1. Check if error is 401 Unauthorized
          if (err.data?.httpStatus === 401) {
            // 2. Attempt to refresh the session
            // Note: Use better-auth's listSession or explicitly call refresh endpoint
            authClient
              .getSession()
              .then((session) => {
                if (session) {
                  // 3. If refresh successful, RETRY the original request
                  next(op).subscribe(observer);
                } else {
                  // 4. If refresh fails, bubble the error (User is truly logged out)
                  observer.error(err);
                  // Optional: Trigger global logout action here
                  // window.location.href = '/sign-in';
                }
              })
              .catch(() => {
                observer.error(err);
              });
          } else {
            observer.error(err);
          }
        },
        complete() {
          observer.complete();
        },
      });
    });
  };
};
