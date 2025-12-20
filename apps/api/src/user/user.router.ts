import { type IUser, userSchema } from '@repo/schema/user';
import { Input, Mutation, Query, Router, UseMiddlewares } from 'nestjs-trpc-v2';
import { TrpcAuthMiddleware } from 'src/app.middleware';
import { z } from 'zod';

@Router({ alias: 'user' })
@UseMiddlewares(TrpcAuthMiddleware)
export class UserRouter {
  constructor() {}

  @Query({
    input: z.object({ id: z.string() }),
    output: userSchema,
  })
  getUser(@Input('id') id: string): IUser {
    return {
      email: id,
      emailVerified: false,
      name: '',
      phoneNumberVerified: false,
      isActive: false,
      isBlocked: false,
      role: 'Investor',
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  @Mutation({
    input: userSchema,
    output: userSchema,
  })
  createUser(@Input() input: IUser): IUser {
    return input;
  }
}
