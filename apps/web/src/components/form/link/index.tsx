"use client";

import { Route } from "next";
import { RouteType } from "next/dist/lib/load-custom-routes";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

interface ActiveLinkProps extends LinkProps<RouteType> {
  activeClassName?: string;
  matchFullPath?: boolean;
  href: Route;
}

export default function ActiveLink({
  className = "",
  activeClassName = "",
  matchFullPath = true,
  children,
  ...props
}: PropsWithChildren<ActiveLinkProps>) {
  const pathname = usePathname();

  const isActive = matchFullPath
    ? pathname === props.href
    : pathname === "/" || props.href === "/"
      ? pathname === props.href
      : pathname.startsWith(props.href);

  return (
    <Link
      className={`${className} ${isActive ? activeClassName : ""}`}
      {...props}
    >
      {children}
    </Link>
  );
}
