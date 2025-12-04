/**
 * User Role Enum
 */ 
export const USER_ROLES = ["Investor", "Trader", "Admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  phoneNumber?: string | null;
  phoneVerified: boolean;
  image?: string | null;
  dateOfBirth?: Date | null;
  country?: string | null;
  isActive: boolean;
  isBlocked: boolean;
  role: UserRole[];
  twoFactorEnabled: boolean;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
