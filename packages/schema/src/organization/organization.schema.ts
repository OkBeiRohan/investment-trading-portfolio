import z from "zod";

export const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  logo: z.url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type IOrganization = z.infer<typeof organizationSchema>;

export const organisationRoleEnum = z.enum(["owner", "admin", "member"]);
export type OrganizationRole = z.infer<typeof organisationRoleEnum>;
