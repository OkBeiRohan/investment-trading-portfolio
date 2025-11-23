import z from "zod";
import { organisationRoleEnum } from "./organization.schema";

export const memberSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  userId: z.uuid(),
  role: organisationRoleEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IMember = z.infer<typeof memberSchema>;
