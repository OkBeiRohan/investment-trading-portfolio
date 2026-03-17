---
applyTo: "apps/api/**"
---

# GitHub Copilot Instructions - API Server

## Role & Context

You are working on the **API Server** - the main REST API and authentication server for the investment trading portfolio system. This NestJS application handles user management, authentication, portfolio data, and serves as the gateway between the web dashboard and trading engines.

## Application Overview

**Purpose**: Central API server for user-facing operations
**Port**: 3004
**Stack**: NestJS, MongoDB, tRPC, Better Auth (via `@repo/authentication`)

**Responsibilities**:

- User authentication and authorization (Better Auth with session-based auth, httpOnly cookies)
- User profile and settings management
- Portfolio aggregation and reporting
- Historical trade queries
- Integration with algo-worker for trading commands
- Rate limiting and security middleware

## Architecture Rules

### 1. Shared Package Usage

**ALWAYS use shared packages - NEVER duplicate code:**

```typescript
// ✅ CORRECT - Use shared packages
import { type User, userSchema } from '@repo/schema';
import { UserDatabaseModule } from '@repo/database';
import { appRouter } from '@repo/trpc';

// ❌ WRONG - Local implementations
import { User } from './types/user'; // NEVER
import { connectDB } from './db'; // NEVER
```

### 2. Database Package Rule

**CRITICAL: ALL database code MUST be in `@repo/database`**

- ✅ **DO**: Use `UserDatabaseModule` from `@repo/database`
- ✅ **DO**: Import repositories from `@repo/database`
- ❌ **DON'T**: Install `@nestjs/mongoose` in this app
- ❌ **DON'T**: Create database connections locally
- ❌ **DON'T**: Define schemas in this app

```typescript
// ✅ CORRECT
import { UserDatabaseModule, UserRepository } from '@repo/database';

@Module({
  imports: [UserDatabaseModule.forRoot()],
})
export class AppModule {}

// In service
constructor(private readonly userRepo: UserRepository) {}
```

### 3. Authentication & Authorization

**Better Auth with session-based authentication (httpOnly cookies):**

The API uses `@repo/authentication` which wraps Better Auth with NestJS integration via `@thallesp/nestjs-better-auth`. Features include organization plugin, 2FA, passkeys, and session-based auth.

```typescript
// Use @repo/authentication for Better Auth integration
import { BetterAuthModule, BetterAuthGuard } from '@repo/authentication';

@Module({
  imports: [BetterAuthModule.forRoot()],
})
export class AuthModule {}

// Guards for routes
@UseGuards(BetterAuthGuard)
@Get('profile')
async getProfile(@Request() req) {
  return this.userService.findOne(req.user.userId);
}
```

### 4. tRPC Integration

**tRPC routers are defined in the API app, AppRouter type is exported to @repo/schema:**

```typescript
// src/app.module.ts
import { TRPCModule } from '@mguay/nestjs-trpc';
import { UserRouter } from './user/user.router';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: './node_modules/@repo/schema/src/api/app-router.ts',
    }),
  ],
  controllers: [UserRouter],
})
export class AppModule {}
```

### 5. Rate Limiting

**Implement rate limiting for public endpoints:**

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
})

// Apply to specific routes
@UseGuards(ThrottlerGuard)
@Post('login')
async login(@Body() credentials: LoginDto) {}
```

## Key Features to Implement

### User Management

- User registration with email verification
- Session-based login with httpOnly cookies (Better Auth)
- Password reset flow
- Profile management (name, email, preferences)
- Two-factor authentication (2FA) and passkey support
- Organization-based multi-tenancy (Better Auth organization plugin)

### Portfolio Endpoints

```typescript
// GET /api/portfolio/summary
interface PortfolioSummary {
  totalValue: number;
  totalPnL: number;
  activePositions: number;
  todayPnL: number;
  weekPnL: number;
  monthPnL: number;
}

// GET /api/portfolio/positions
interface Position {
  id: string;
  strategy: string;
  instrument: string;
  entryDate: Date;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

// GET /api/portfolio/trades
interface TradeHistory {
  trades: Trade[];
  pagination: { page: number; total: number };
}
```

### Trading Commands

```typescript
// POST /api/trading/start
// Start algo-worker for user
async startTrading(userId: string): Promise<{ status: 'started' }>;

// POST /api/trading/stop
// Stop algo-worker for user
async stopTrading(userId: string): Promise<{ status: 'stopped' }>;

// GET /api/trading/status
// Get current trading status
async getTradingStatus(userId: string): Promise<{
  isRunning: boolean;
  lastSignal?: Date;
  activeStrategies: string[];
}>;
```

## Security Best Practices

### 1. Input Validation

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;
}

// Use ValidationPipe globally
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

### 2. Password Hashing

```typescript
import * as bcrypt from 'bcrypt';

async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async comparePasswords(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
```

### 3. CORS Configuration

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
});
```

### 4. Helmet for Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet());
```

## Error Handling

```typescript
// Create custom exception filters
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Apply globally
app.useGlobalFilters(new HttpExceptionFilter());
```

## Testing

```typescript
// Unit test example
describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: { findOne: jest.fn(), create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repo = module.get(UserRepository);
  });

  it('should create a user', async () => {
    const user = { email: 'test@example.com', name: 'Test' };
    repo.create.mockResolvedValue(user);
    expect(await service.create(user)).toEqual(user);
  });
});
```

## Environment Variables

```bash
# Server
PORT=3004
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017

# Authentication (Better Auth)
BETTER_AUTH_SECRET=<strong-secret>
BETTER_AUTH_URL=http://localhost:3004

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# External Services
ALGO_WORKER_URL=http://localhost:3000
```

## Code Quality Standards

- **TypeScript Strict Mode**: Always enabled
- **ESLint**: Must pass with no errors
- **Prettier**: Auto-format all code
- **Tests**: Maintain >80% coverage
- **Documentation**: Update README and API docs

## When Making Changes

1. ✅ Use shared packages (@repo/schema, @repo/database, @repo/authentication)
2. ✅ Validate all inputs with class-validator
3. ✅ Implement proper error handling
4. ✅ Add authentication guards to protected routes
5. ✅ Write unit tests for business logic
6. ✅ Update API documentation
7. ✅ Check rate limiting on public endpoints

## Common Anti-Patterns to Avoid

❌ Creating database connections locally
❌ Defining types outside @repo/schema
❌ Storing passwords in plain text
❌ Missing input validation
❌ No rate limiting on public endpoints
❌ Exposing sensitive data in responses
❌ Missing authentication guards
❌ Using `any` types

## Documentation

Keep these files updated:

- `README.md` - Quick start, API overview
- `docs/API.md` - Endpoint documentation
- `docs/AUTHENTICATION.md` - Auth flow details
- `.env.example` - Environment variables

## References

- [NestJS Documentation](https://docs.nestjs.com)
- [Better Auth Documentation](https://www.better-auth.com/)
- [@thallesp/nestjs-better-auth](https://github.com/thallesp/nestjs-better-auth)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

