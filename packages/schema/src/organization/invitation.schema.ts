import z from "zod";
import { organisationRoleEnum } from "./organization.schema";

export const invitationStatusEnum = z.enum([
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

export type InvitationStatus = z.infer<typeof invitationStatusEnum>;

export const invitationSchema = z.object({
  organizationId: z.uuid(),
  email: z.email(),
  role: organisationRoleEnum,
  status: invitationStatusEnum,
  expiresAt: z.date(),
  inviterId: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export type IInvitation = z.infer<typeof invitationSchema>;
