import { type IUser, userSchema } from '@repo/schema/user';
import { Input, Mutation, Query, Router } from 'nestjs-trpc-v2';
import { z } from 'zod';

@Router({ alias: 'user' })
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
