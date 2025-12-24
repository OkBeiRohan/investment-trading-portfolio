import { IUser } from "@repo/schema";
import Image from "next/image";
import { ReactNode } from "react";

export default function getUserIcon(user: IUser): ReactNode {
  if (user.image)
    return <Image src={user.image} height={40} width={40} alt="User Icon" />;

  return getUserIconCharacters(user.name || user.email || "User");
}

function getUserIconCharacters(name: string): string {
  const names = name.split(" ");
  if (names.length === 0) return "U";
  if (names.length === 1) return name.slice(0, 2).toUpperCase();

  const initials = names.map((n) => n.charAt(0).toUpperCase());
  return initials.slice(0, 2).join("");
}
