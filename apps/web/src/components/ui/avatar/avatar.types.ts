import { HTMLAttributes, ReactNode } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  fallback?: ReactNode;
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  max?: number;
}
