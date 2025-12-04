/**
 * User Role Enum
 */
export enum UserRole {
  Investor = "Investor",
  Trader = "Trader",
  Admin = "Admin",
}

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
