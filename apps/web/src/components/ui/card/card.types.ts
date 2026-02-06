import { HTMLAttributes, ReactNode } from "react";

export type CardVariant =
  | "default"
  | "glass"
  | "elevated"
  | "yellow"
  | "mint"
  | "coral"
  | "blue"
  | "dark";

export type CardPadding = "none" | "compact" | "default" | "spacious";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  actions?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
