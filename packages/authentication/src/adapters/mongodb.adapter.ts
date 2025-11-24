import {
  createAdapterFactory,
  type Where,
  type DBAdapterDebugLogOption,
} from "better-auth/adapters";
import { AuthRepositories } from "@repo/database";
import { CustomAdapter } from "@better-auth/core/db/adapter";

export interface MongoAdapterConfig {
  debugLogs?: DBAdapterDebugLogOption;
}

export const mongoAdapter = (
  repositories: AuthRepositories,
  config: MongoAdapterConfig = {}
) => {
  return createAdapterFactory({
    config: {
      adapterId: "mongodb-mongoose",
      adapterName: "MongoDB Mongoose Adapter",
      supportsBooleans: true,
      supportsDates: true,
      supportsUUIDs: false,
      supportsNumericIds: false,
      supportsJSON: true,
    },
    adapter: ({ options, schema, debugLog }) => {
      const modelMap: Record<string, any> = {
        user: repositories.users,
        session: repositories.sessions,
        account: repositories.accounts,
        verification: repositories.verifications,
        organization: repositories.organizations,
        member: repositories.organizations, // Uses same repository
        invitation: repositories.organizations, // Uses same repository
        twoFactor: repositories.twoFactors,
        passkey: repositories.passkeys,
      };

      // Helper to convert Where clauses to MongoDB filter
      const convertWhereToFilter = (where?: Where[]): any => {
        if (!where || where.length === 0) return {};

        const filter: any = {};
        const orConditions: any[] = [];

        for (const condition of where) {
          const {
            field,
            operator = "eq",
            value,
            connector = "AND",
          } = condition;

          let fieldCondition: any;

          switch (operator) {
            case "eq":
              fieldCondition = value;
              break;
            case "ne":
              fieldCondition = { $ne: value };
              break;
            case "lt":
              fieldCondition = { $lt: value };
              break;
            case "lte":
              fieldCondition = { $lte: value };
              break;
            case "gt":
              fieldCondition = { $gt: value };
              break;
            case "gte":
              fieldCondition = { $gte: value };
              break;
            case "in":
              fieldCondition = { $in: Array.isArray(value) ? value : [value] };
              break;
            case "contains":
              fieldCondition = { $regex: value, $options: "i" };
              break;
            case "starts_with":
              fieldCondition = { $regex: `^${value}`, $options: "i" };
              break;
            case "ends_with":
              fieldCondition = { $regex: `${value}$`, $options: "i" };
              break;
            default:
              fieldCondition = value;
          }

          if (connector === "OR") {
            orConditions.push({ [field]: fieldCondition });
          } else {
            filter[field] = fieldCondition;
          }
        }

        if (orConditions.length > 0) {
          return { ...filter, $or: orConditions };
        }

        return filter;
      };

      // Helper to get repository method name
      const getRepositoryMethod = (model: string, method: string): string => {
        // Map model names to repository methods
        const methodMap: Record<string, Record<string, string>> = {
          organization: {
            create: "createOrganization",
            findOne: "findOrganizationById",
            update: "updateOrganization",
            delete: "deleteOrganization",
            findMany: "findOrganizations",
          },
          member: {
            create: "createMember",
            findOne: "findMember",
            update: "updateMember",
            delete: "deleteMember",
            findMany: "findMembers",
          },
          invitation: {
            create: "createInvitation",
            findOne: "findInvitation",
            update: "updateInvitation",
            delete: "deleteInvitation",
            findMany: "findInvitations",
          },
          twoFactor: {
            findOne: "findByUserId",
          },
        };

        return methodMap[model]?.[method] || method;
      };

      // Helper to log debug information
      const debugLogger = (operation: string, details: any) => {
        if (
          config.debugLogs === true ||
          (typeof config.debugLogs === "object" &&
            config.debugLogs[operation as keyof DBAdapterDebugLogOption])
        ) {
          debugLog(operation, details);
        }
      };

      const customAdapter: CustomAdapter = {
        // Create operation
        create: async ({ data, model, select }) => {
          debugLogger("create", { model, data });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const methodName = getRepositoryMethod(model, "create");
          const result = await repository[methodName](data);

          // Convert MongoDB document to plain object
          const plainResult = result.toObject ? result.toObject() : result;

          // Handle _id to id conversion
          if (plainResult._id) {
            plainResult.id = plainResult._id.toString();
            delete plainResult._id;
          }

          // Handle __v field
          if (plainResult.__v !== undefined) {
            delete plainResult.__v;
          }

          return plainResult;
        },

        // Update operation
        update: async ({ update, model, where }) => {
          debugLogger("update", { model, where, update });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);

          // Find the document first
          const existing = await repository.findOne(filter);
          if (!existing) return null;

          const id = existing._id?.toString() || existing.id;
          const methodName = getRepositoryMethod(model, "update");
          const result = await repository[methodName](id, update);

          if (!result) return null;

          const plainResult = result.toObject ? result.toObject() : result;

          if (plainResult._id) {
            plainResult.id = plainResult._id.toString();
            delete plainResult._id;
          }

          if (plainResult.__v !== undefined) {
            delete plainResult.__v;
          }

          return plainResult;
        },

        // Update many operation
        updateMany: async ({ update, model, where }) => {
          debugLogger("updateMany", { model, where, update });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);
          const count = await repository.updateMany(filter, update);

          return count;
        },

        // Delete operation
        delete: async ({ model, where }) => {
          debugLogger("delete", { model, where });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);

          // Find the document first
          const existing = await repository.findOne(filter);
          if (!existing) return null;

          const id = existing._id?.toString() || existing.id;
          const methodName = getRepositoryMethod(model, "delete");
          await repository[methodName](id);

          return existing;
        },

        // Delete many operation
        deleteMany: async ({ model, where }) => {
          debugLogger("deleteMany", { model, where });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);
          const count = await repository.deleteMany(filter);

          return count;
        },

        // Find one operation
        findOne: async ({ model, where, select, join }) => {
          debugLogger("findOne", { model, where });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);
          const methodName = getRepositoryMethod(model, "findOne");
          const result = await repository[methodName](filter);

          if (!result) return null;

          const plainResult = result.toObject ? result.toObject() : result;

          if (plainResult._id) {
            plainResult.id = plainResult._id.toString();
            delete plainResult._id;
          }

          if (plainResult.__v !== undefined) {
            delete plainResult.__v;
          }

          // Handle populated fields
          if (plainResult.userId && typeof plainResult.userId === "object") {
            const user = plainResult.userId;
            if (user._id) {
              user.id = user._id.toString();
              delete user._id;
            }
            if (user.__v !== undefined) {
              delete user.__v;
            }
            plainResult.userId = user.id || user._id?.toString();
            plainResult.user = user;
          }

          return plainResult;
        },

        // Find many operation
        findMany: async ({ model, where, limit, sortBy, offset, join }) => {
          debugLogger("findMany", { model, where, limit, offset });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);
          const options: any = {};

          if (limit) options.limit = limit;
          if (offset) options.skip = offset;
          if (sortBy) {
            options.sort = {
              [sortBy.field]: sortBy.direction === "desc" ? -1 : 1,
            };
          }

          const methodName = getRepositoryMethod(model, "findMany");
          const results = await repository[methodName](filter, options);

          return results.map((result: any) => {
            const plainResult = result.toObject ? result.toObject() : result;

            if (plainResult._id) {
              plainResult.id = plainResult._id.toString();
              delete plainResult._id;
            }

            if (plainResult.__v !== undefined) {
              delete plainResult.__v;
            }

            return plainResult;
          });
        },

        // Count operation
        count: async ({ model, where }) => {
          debugLogger("count", { model, where });

          const repository = modelMap[model];
          if (!repository) {
            throw new Error(`Repository for model "${model}" not found`);
          }

          const filter = convertWhereToFilter(where);
          const count = await repository.count(filter);

          return count;
        },
      };

      return customAdapter;
    },
  });
};
