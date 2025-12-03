import { type IUser, userSchema } from '@repo/schema';
import { Input, Mutation, Query, Router } from 'nestjs-trpc';
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
      id: id,
      email: '',
      emailVerified: false,
      name: '',
      phoneVerified: false,
      isActive: false,
      isBlocked: false,
      role: [],
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
