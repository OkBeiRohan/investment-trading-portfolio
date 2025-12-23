"use client";

import { RouteType } from "next/dist/lib/load-custom-routes";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

interface ActiveLinkProps extends LinkProps<RouteType> {
  activeClassName?: string;
  matchFullPath?: boolean;
}

export default function ActiveLink({
  activeClassName,
  matchFullPath = true,
  children,
  ...props
}: PropsWithChildren<ActiveLinkProps>) {
  const pathname = usePathname();

  const isActive = matchFullPath
    ? pathname === props.href.toString()
    : pathname === "/" || props.href.toString() === "/"
      ? pathname === props.href.toString()
      : pathname.startsWith(props.href.toString());

  return (
    <Link
      className={`${props.className ? props.className : ""} ${
        activeClassName ? (isActive ? activeClassName : "") : ""
      }`}
      {...props}
    >
      {children}
    </Link>
  );
}
