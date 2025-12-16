import z from "zod";

export const organizationSchema = z.object({
  name: z.string(),
  slug: z.string(),
  logo: z.url().optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});
export type IOrganization = z.infer<typeof organizationSchema>;

export const organisationRoleEnum = z.enum(["owner", "admin", "member"]);
export type OrganizationRole = z.infer<typeof organisationRoleEnum>;
