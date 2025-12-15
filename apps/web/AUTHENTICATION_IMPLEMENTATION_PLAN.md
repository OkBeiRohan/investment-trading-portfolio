# Authentication System Implementation Plan

## Current State Analysis

### ✅ Completed

- **Login Page**: Fully modularized with LoginForm and MoreLoginOptions
- **Login Structure**:
  - `components/auth/login/form/login-form.tsx` - Email/password form with server action
  - `components/auth/login/more-login/more-login.tsx` - Social, passkey, magic-link, anonymous
  - Server action: `lib/actions/authentication/login/login-action.ts`
  - Schema: `@repo/schema/authentication/dto/login.dto.ts`
- **Better Auth Setup**: All plugins enabled (organization, 2FA, passkey, magic-link, email OTP)
- **Shared Components**: Input, Checkbox, PrimaryButton, FormGroup
- **handleAuthSuccess**: Handles callback URL redirection and session refresh

### 🚧 Legacy Components (Need Refactoring)

- `components/auth/register-form.tsx` - Old monolithic component
- `components/auth/magic-link-form.tsx` - Old monolithic component
- `components/auth/passkey-form.tsx` - Old monolithic component
- `components/auth/two-factor-form.tsx` - Old monolithic component
- `components/auth/forgot-password-form.tsx` - Old monolithic component
- `components/auth/reset-password-form.tsx` - Old monolithic component
- `components/auth/verify-email-view.tsx` - Old monolithic component

### 🔴 Missing Critical Functionality

1. **2FA Redirect Handling**: `handleAuthSuccess` doesn't check for `twoFactorRedirect` in login response
2. **Email Verification Flow**: After registration, users should receive verification email
3. **Passkey Registration**: No UI for adding passkeys after login
4. **2FA Setup**: No UI for enabling/disabling 2FA with QR code

---

## Better Auth Patterns (from Documentation)

### 1. Two-Factor Authentication (2FA)

**Key Pattern**: After `signIn.email`, check response for `twoFactorRedirect` property

```typescript
const { data, error } = await authClient.signIn.email({ email, password });

if (data?.twoFactorRedirect) {
  // User has 2FA enabled, redirect to 2FA verification
  router.push("/authentication/2fa");
  return;
}

// Normal login flow continues
await handleAuthSuccess();
```

**2FA Verification**:

```typescript
const { data, error } = await authClient.twoFactor.verifyOtp({ code });
if (!error) {
  await handleAuthSuccess();
}
```

**2FA Setup Flow**:

1. User enables 2FA: `authClient.twoFactor.enable()` - Returns QR code URI
2. Display QR code for user to scan with authenticator app
3. Verify setup: `authClient.twoFactor.verifyOtp({ code })` to confirm

### 2. Magic Link

**Pattern**: Send link, user clicks to authenticate

```typescript
// Request magic link
const { data, error } = await authClient.signIn.magicLink({
  email,
  callbackURL: "/dashboard",
});
// Shows success message, user checks email

// Verification happens automatically when user clicks link
// Better Auth handles: /magic-link/verify?token=xxx
```

### 3. Passkey (WebAuthn)

**Sign In**:

```typescript
const { data, error } = await authClient.signIn.passkey({
  autoFill: true, // For conditional UI (browser autofill)
});
```

**Registration** (must be authenticated first):

```typescript
const { data, error } = await authClient.passkey.addPasskey({
  name: "My Security Key",
  authenticatorAttachment: "cross-platform", // or "platform"
});
```

### 4. Registration

**Pattern**: Use `signUp.email` with email/password/name

```typescript
const { data, error } = await authClient.signUp.email({
  email,
  password,
  name,
});

// If email verification is enabled, user receives verification email
// After verification, user can login
```

### 5. Email Verification

**Pattern**: Automatic email sent after registration

```typescript
// Verification happens when user clicks link in email
const { data, error } = await authClient.verifyEmail({
  query: { token },
});
```

---

## Implementation Plan

## Phase 1: Core Authentication Refactoring

### 1.1 Update handleAuthSuccess for 2FA Support

**File**: `apps/web/src/lib/actions/authentication/index.ts`

**Changes**:

```typescript
export async function handleAuthSuccess(data?: {
  twoFactorRedirect?: boolean;
}): Promise<never> {
  // Check for 2FA redirect first
  if (data?.twoFactorRedirect) {
    redirect("/authentication/2fa" as Route);
  }

  const cookieStore = await cookies();
  const callbackUrl = cookieStore.get("app.callbackUrl")?.value;
  cookieStore.delete("app.callbackUrl");

  if (callbackUrl) {
    const validationResult = CallbackUrlSchema.safeParse(callbackUrl);
    if (validationResult.success && validationResult.data) {
      redirect(validationResult.data as Route);
    }
  }

  redirect("/");
}
```

**Update login action**:

```typescript
// apps/web/src/lib/actions/authentication/login/login-action.ts
const { data, error } = await authClient.signIn.email(result.data);

if (error) {
  return { error: error.message || "Invalid credentials" };
}

if (!data) {
  return { error: "Authentication failed" };
}

// Pass data to handle 2FA redirect
await handleAuthSuccess(data);
```

### 1.2 Create Registration Module (Matching Login Structure)

**Directory Structure**:

```
apps/web/src/
├── components/auth/register/
│   ├── form/
│   │   ├── register-form.tsx          # Main registration form
│   │   ├── register-form.module.css   # Form-specific styles
│   │   └── skeleton.tsx               # Loading skeleton
│   └── more-options/
│       ├── more-register.tsx          # Social registration options
│       ├── more-register.module.css   # Social buttons styles
│       └── skeleton.tsx               # Loading skeleton
├── lib/actions/authentication/register/
│   └── register-action.ts             # Server action
└── app/authentication/register/
    ├── page.tsx                       # Main page (uses components)
    ├── register.module.css            # Page layout styles
    └── loading.tsx                    # Page loading state
```

**Schema** (`@repo/schema/src/authentication/dto/register.dto.ts`):

```typescript
import { z } from "zod";

export const RegisterDtoSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email address").min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z
      .string()
      .optional()
      .default("off")
      .transform((val) => val === "on")
      .refine(
        (val) => val === true,
        "You must accept the terms and conditions"
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type IRegisterDto = z.infer<typeof RegisterDtoSchema>;
export type RegisterFieldErrors = z.core.$ZodErrorTree<IRegisterDto>;

export type RegisterFormResult =
  | { success: true; data: IRegisterDto }
  | { success: false; fieldErrors: RegisterFieldErrors };

export function parseRegisterFormData(formData: FormData): RegisterFormResult {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    agreeToTerms: formData.get("agreeToTerms"),
  };

  const result = RegisterDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

**Server Action** (`apps/web/src/lib/actions/authentication/register/register-action.ts`):

```typescript
"use server";

import { authClient } from "@/lib/auth/auth-client";
import { type RegisterFieldErrors, parseRegisterFormData } from "@repo/schema";
import { redirect } from "next/navigation";
import type { Route } from "next";

interface RegisterState {
  error: string | null;
  fieldErrors?: RegisterFieldErrors;
  success?: boolean;
}

export async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const result = parseRegisterFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  try {
    const { data, error } = await authClient.signUp.email({
      email: result.data.email,
      password: result.data.password,
      name: result.data.name,
    });

    if (error) {
      return { error: error.message || "Registration failed" };
    }

    if (!data) {
      return { error: "Registration failed" };
    }

    // Redirect to verify-email page to inform user to check email
    redirect("/authentication/verify-email/sent" as Route);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }

    console.error("Registration error:", err);
    return { error: "An unexpected error occurred" };
  }
}
```

**Component** (`apps/web/src/components/auth/register/form/register-form.tsx`):

```typescript
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, KeyRound, User, Check } from "lucide-react";
import styles from "./register-form.module.css";
import Input from "@/components/form/input";
import Checkbox from "@/components/form/input/checkbox";
import PrimaryButton from "@/components/form/button";
import { registerAction } from "@/lib/actions/authentication/register/register-action";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, {
    error: null,
  });

  return (
    <div className={styles.form}>
      <form className={styles.form} action={formAction}>
        <Input
          type="text"
          name="name"
          label="Full Name"
          icon={<User />}
          placeholder="John Doe"
          autoComplete="name"
          error={state.fieldErrors?.properties?.name}
          required
        />

        <Input
          type="email"
          name="email"
          label="Email Address"
          icon={<Mail />}
          placeholder="you@example.com"
          autoComplete="email"
          error={state.fieldErrors?.properties?.email}
          required
        />

        <Input
          type="password"
          name="password"
          label="Password"
          icon={<KeyRound />}
          placeholder="••••••••"
          autoComplete="new-password"
          error={state.fieldErrors?.properties?.password}
          required
        />

        <Input
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          icon={<KeyRound />}
          placeholder="••••••••"
          autoComplete="new-password"
          error={state.fieldErrors?.properties?.confirmPassword}
          required
        />

        <Checkbox
          name="agreeToTerms"
          label={
            <>
              I agree to the{" "}
              <Link href="/legal/terms" className={styles.link}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className={styles.link}>
                Privacy Policy
              </Link>
            </>
          }
          error={state.fieldErrors?.properties?.agreeToTerms}
        />

        <PrimaryButton type="submit" loading={isPending} text="Create Account" />

        {state.error && <div className={styles.error}>{state.error}</div>}
      </form>
    </div>
  );
}
```

### 1.3 Create Forgot Password Module

**Directory Structure**:

```
apps/web/src/
├── components/auth/forgot-password/
│   ├── form/
│   │   ├── forgot-password-form.tsx
│   │   ├── forgot-password-form.module.css
│   │   └── skeleton.tsx
├── lib/actions/authentication/forgot-password/
│   └── forgot-password-action.ts
└── app/authentication/forgot-password/
    ├── page.tsx
    ├── sent/
    │   └── page.tsx  # Success page
    └── forgot-password.module.css
```

**Schema** (`@repo/schema/src/authentication/dto/forgot-password.dto.ts`):

```typescript
import { z } from "zod";

export const ForgotPasswordDtoSchema = z.object({
  email: z.email("Invalid email address").min(1, "Email is required"),
});

export type IForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;
export type ForgotPasswordFieldErrors =
  z.core.$ZodErrorTree<IForgotPasswordDto>;

export type ForgotPasswordFormResult =
  | { success: true; data: IForgotPasswordDto }
  | { success: false; fieldErrors: ForgotPasswordFieldErrors };

export function parseForgotPasswordFormData(
  formData: FormData
): ForgotPasswordFormResult {
  const rawData = {
    email: formData.get("email"),
  };

  const result = ForgotPasswordDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

### 1.4 Create Reset Password Module

**Directory Structure**:

```
apps/web/src/
├── components/auth/reset-password/
│   ├── form/
│   │   ├── reset-password-form.tsx
│   │   ├── reset-password-form.module.css
│   │   └── skeleton.tsx
├── lib/actions/authentication/reset-password/
│   └── reset-password-action.ts
└── app/authentication/reset-password/
    ├── page.tsx  # Includes token validation
    └── reset-password.module.css
```

**Schema** (`@repo/schema/src/authentication/dto/reset-password.dto.ts`):

```typescript
import { z } from "zod";

export const ResetPasswordDtoSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type IResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
export type ResetPasswordFieldErrors = z.core.$ZodErrorTree<IResetPasswordDto>;

export type ResetPasswordFormResult =
  | { success: true; data: IResetPasswordDto }
  | { success: false; fieldErrors: ResetPasswordFieldErrors };

export function parseResetPasswordFormData(
  formData: FormData
): ResetPasswordFormResult {
  const rawData = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const result = ResetPasswordDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

### 1.5 Create 2FA Verification Module

**Directory Structure**:

```
apps/web/src/
├── components/auth/two-factor/
│   ├── verify/
│   │   ├── verify-form.tsx
│   │   ├── verify-form.module.css
│   │   └── skeleton.tsx
│   └── setup/
│       ├── setup-form.tsx  # QR code display + verification
│       ├── setup-form.module.css
│       └── skeleton.tsx
├── lib/actions/authentication/two-factor/
│   ├── verify-action.ts
│   └── enable-action.ts
└── app/authentication/
    ├── 2fa/
    │   ├── page.tsx  # Verification page (during login)
    │   └── 2fa.module.css
    └── account/security/
        └── page.tsx  # 2FA setup/management page
```

**Schema** (`@repo/schema/src/authentication/dto/two-factor.dto.ts`):

```typescript
import { z } from "zod";

export const TwoFactorVerifyDtoSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must be numeric"),
});

export type ITwoFactorVerifyDto = z.infer<typeof TwoFactorVerifyDtoSchema>;
export type TwoFactorVerifyFieldErrors =
  z.core.$ZodErrorTree<ITwoFactorVerifyDto>;

export type TwoFactorVerifyFormResult =
  | { success: true; data: ITwoFactorVerifyDto }
  | { success: false; fieldErrors: TwoFactorVerifyFieldErrors };

export function parseTwoFactorVerifyFormData(
  formData: FormData
): TwoFactorVerifyFormResult {
  const rawData = {
    code: formData.get("code"),
  };

  const result = TwoFactorVerifyDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

### 1.6 Refactor Magic Link Module

**Directory Structure**:

```
apps/web/src/
├── components/auth/magic-link/
│   ├── request/
│   │   ├── request-form.tsx
│   │   ├── request-form.module.css
│   │   └── skeleton.tsx
│   └── verify/
│       ├── verify-view.tsx  # Handles automatic verification from email link
│       └── verify-view.module.css
├── lib/actions/authentication/magic-link/
│   └── request-action.ts
└── app/authentication/magic-link/
    ├── page.tsx  # Request magic link
    ├── sent/
    │   └── page.tsx  # Success page
    └── magic-link.module.css
```

**Schema** (`@repo/schema/src/authentication/dto/magic-link.dto.ts`):

```typescript
import { z } from "zod";

export const MagicLinkDtoSchema = z.object({
  email: z.email("Invalid email address").min(1, "Email is required"),
});

export type IMagicLinkDto = z.infer<typeof MagicLinkDtoSchema>;
export type MagicLinkFieldErrors = z.core.$ZodErrorTree<IMagicLinkDto>;

export type MagicLinkFormResult =
  | { success: true; data: IMagicLinkDto }
  | { success: false; fieldErrors: MagicLinkFieldErrors };

export function parseMagicLinkFormData(
  formData: FormData
): MagicLinkFormResult {
  const rawData = {
    email: formData.get("email"),
  };

  const result = MagicLinkDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

### 1.7 Refactor Passkey Module

**Directory Structure**:

```
apps/web/src/
├── components/auth/passkey/
│   ├── signin/
│   │   ├── passkey-signin.tsx  # Client-side passkey auth
│   │   ├── passkey-signin.module.css
│   │   └── skeleton.tsx
│   └── manage/
│       ├── passkey-list.tsx  # List user's passkeys
│       ├── passkey-add.tsx  # Add new passkey
│       └── passkey-manage.module.css
└── app/authentication/passkey/
    ├── page.tsx  # Sign in with passkey
    ├── passkey.module.css
    └── account/security/
        └── page.tsx  # Manage passkeys
```

**Note**: Passkeys don't use FormData/server actions - they're pure client-side WebAuthn

### 1.8 Create Email Verification Module

**Directory Structure**:

```
apps/web/src/
├── components/auth/verify-email/
│   ├── verify/
│   │   ├── verify-view.tsx  # Auto-verification from email link
│   │   └── verify-view.module.css
│   └── sent/
│       ├── sent-view.tsx  # "Check your email" page
│       └── sent-view.module.css
└── app/authentication/verify-email/
    ├── page.tsx  # Auto-verification endpoint
    ├── sent/
    │   └── page.tsx  # After registration
    └── verify-email.module.css
```

---

## Phase 2: Shared Components & Design System

### 2.1 Create Shared Divider Component

**File**: `apps/web/src/components/auth/shared/divider/divider.tsx`

```typescript
import styles from "./divider.module.css";

interface DividerProps {
  text?: string;
}

export function Divider({ text = "Or continue with" }: DividerProps) {
  return (
    <div className={styles.divider}>
      <span className={styles.dividerText}>{text}</span>
    </div>
  );
}
```

**File**: `apps/web/src/components/auth/shared/divider/divider.module.css`

```css
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--color-text-secondary);
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--color-border);
}

.dividerText {
  padding: 0 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}
```

### 2.2 Create Success/Error Message Component

**File**: `apps/web/src/components/auth/shared/message/message.tsx`

```typescript
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import styles from "./message.module.css";

type MessageType = "success" | "error" | "info" | "warning";

interface MessageProps {
  type: MessageType;
  title?: string;
  message: string;
  children?: React.ReactNode;
}

export function Message({ type, title, message, children }: MessageProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const Icon = icons[type];

  return (
    <div className={`${styles.message} ${styles[type]}`}>
      <div className={styles.iconContainer}>
        <Icon className={styles.icon} />
      </div>
      <div className={styles.content}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <p className={styles.text}>{message}</p>
        {children}
      </div>
    </div>
  );
}
```

### 2.3 Create Back Link Component

**File**: `apps/web/src/components/auth/shared/back-link/back-link.tsx`

```typescript
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./back-link.module.css";

interface BackLinkProps {
  href: string;
  text?: string;
}

export function BackLink({ href, text = "Back to sign in" }: BackLinkProps) {
  return (
    <Link href={href} className={styles.backLink}>
      <ArrowLeft className={styles.icon} />
      {text}
    </Link>
  );
}
```

### 2.4 Create Code Input Component (for 2FA)

**File**: `apps/web/src/components/form/code-input/code-input.tsx`

```typescript
"use client";

import { useRef, useState } from "react";
import FormGroup from "../group";
import styles from "./code-input.module.css";

interface CodeInputProps {
  length?: number;
  name: string;
  label?: string;
  error?: string | string[] | { errors: string[] };
  onComplete?: (code: string) => void;
}

export function CodeInput({
  length = 6,
  name,
  label,
  error,
  onComplete,
}: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newValues = [...values];
    newValues[index] = value.slice(-1); // Only last char
    setValues(newValues);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Check if complete
    if (newValues.every((v) => v !== "") && onComplete) {
      onComplete(newValues.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    const digits = pastedData.match(/\d/g) || [];

    const newValues = [...values];
    digits.forEach((digit, i) => {
      if (i < length) newValues[i] = digit;
    });
    setValues(newValues);

    if (newValues.every((v) => v !== "") && onComplete) {
      onComplete(newValues.join(""));
    }
  };

  let hasError = false,
    errorMessage: string | undefined;

  if (typeof error === "string") {
    hasError = !!error;
    errorMessage = error;
  } else if (Array.isArray(error)) {
    hasError = error.length > 0;
    errorMessage = error.join(", ");
  } else if (error && "errors" in error) {
    hasError = error.errors.length > 0;
    errorMessage = error.errors.join(", ");
  }

  return (
    <FormGroup label={label} error={errorMessage}>
      <div className={styles.codeInputContainer}>
        <input type="hidden" name={name} value={values.join("")} />
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`${styles.codeInput} ${hasError ? styles.hasError : ""}`}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
    </FormGroup>
  );
}
```

---

## Phase 3: Design Improvements

### 3.1 Modern Design System

**Color Palette** (already established in CSS variables):

- Primary: Blue gradient (login buttons)
- Success: Green (#047857)
- Error: Red
- Background: Dark theme with glass morphism
- Text: High contrast for accessibility

### 3.2 Animation & Transitions

**Add to global styles**:

```css
/* Smooth transitions for all interactive elements */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3.3 Consistent Spacing & Typography

**Standard spacing scale**:

- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

**Typography hierarchy**:

- Page Title: 2rem, bold
- Subtitle: 1rem, medium, secondary color
- Form Labels: 0.875rem, medium
- Input Text: 1rem, regular
- Helper Text: 0.75rem, regular, secondary color

### 3.4 Improved Loading States

**Create skeleton components** for all forms:

- Input skeleton
- Button skeleton
- Social button skeleton
- Message skeleton

---

## Phase 4: Testing & Validation

### 4.1 Unit Tests

**Test Coverage**:

- ✅ Schema validation (Zod)
- ✅ Form data parsing
- ✅ Server actions (mock Better Auth)
- ✅ Component rendering

**Example**:

```typescript
// __tests__/authentication/register.test.ts
import { parseRegisterFormData } from "@repo/schema";

describe("Registration Schema", () => {
  it("validates correct data", () => {
    const formData = new FormData();
    formData.set("name", "John Doe");
    formData.set("email", "john@example.com");
    formData.set("password", "SecurePass123");
    formData.set("confirmPassword", "SecurePass123");
    formData.set("agreeToTerms", "on");

    const result = parseRegisterFormData(formData);
    expect(result.success).toBe(true);
  });

  it("rejects weak passwords", () => {
    const formData = new FormData();
    formData.set("password", "weak");

    const result = parseRegisterFormData(formData);
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.properties?.password).toBeDefined();
  });
});
```

### 4.2 Integration Tests

**Test Flows**:

- ✅ Complete registration flow
- ✅ Email verification flow
- ✅ Login with 2FA redirect
- ✅ Password reset flow
- ✅ Magic link flow
- ✅ Passkey registration & signin

### 4.3 E2E Tests (Playwright)

**Critical paths**:

- User registration → Email verification → Login
- Login → 2FA setup → Logout → Login with 2FA
- Forgot password → Reset → Login
- Magic link request → Email click → Authenticated
- Passkey registration → Signin with passkey

---

## Phase 5: Documentation

### 5.1 Component Documentation

**Each component should have**:

- JSDoc comments
- Usage examples
- Props documentation
- Accessibility notes

**Example**:

````typescript
/**
 * RegisterForm Component
 *
 * Handles user registration with email/password.
 * After successful registration, user is redirected to verify-email/sent.
 *
 * @example
 * ```tsx
 * import { RegisterForm } from "@/components/auth/register/form/register-form";
 *
 * export default function RegisterPage() {
 *   return <RegisterForm />;
 * }
 * ```
 *
 * @features
 * - Password strength validation
 * - Terms acceptance requirement
 * - Field-level error display
 * - Loading state during submission
 *
 * @accessibility
 * - ARIA labels on all inputs
 * - Error announcements
 * - Keyboard navigation support
 */
````

### 5.2 Update README

**Add to `apps/web/README.md`**:

````markdown
## Authentication System

### Features

- ✅ Email/Password Login
- ✅ Social Login (Google, GitHub)
- ✅ Two-Factor Authentication (TOTP)
- ✅ Passkey/WebAuthn Support
- ✅ Magic Link Authentication
- ✅ Password Reset Flow
- ✅ Email Verification
- ✅ Anonymous Login

### Structure

All authentication components follow a modular structure:

\```
components/auth/{feature}/
├── {action}/
│ ├── {action}-{component}.tsx
│ ├── {action}-{component}.module.css
│ └── skeleton.tsx
\```

### Adding New Auth Features

1. Create schema in `@repo/schema/src/authentication/dto/`
2. Create server action in `lib/actions/authentication/{feature}/`
3. Create component in `components/auth/{feature}/`
4. Create page in `app/authentication/{feature}/`
5. Add tests
````

---

## Implementation Checklist

### Phase 1: Core Refactoring

- [ ] 1.1 Update handleAuthSuccess for 2FA support
- [ ] 1.2 Create Registration module (form + action + schema)
- [ ] 1.3 Create Forgot Password module
- [ ] 1.4 Create Reset Password module
- [ ] 1.5 Create 2FA Verification module
- [ ] 1.6 Refactor Magic Link module
- [ ] 1.7 Refactor Passkey module
- [ ] 1.8 Create Email Verification module

### Phase 2: Shared Components

- [ ] 2.1 Create Divider component
- [ ] 2.2 Create Message component (success/error/info)
- [ ] 2.3 Create BackLink component
- [ ] 2.4 Create CodeInput component (for 2FA)

### Phase 3: Design Improvements

- [ ] 3.1 Review and enhance color palette
- [ ] 3.2 Add animations & transitions
- [ ] 3.3 Standardize spacing & typography
- [ ] 3.4 Improve loading states with skeletons

### Phase 4: Testing

- [ ] 4.1 Write unit tests for schemas
- [ ] 4.2 Write integration tests for server actions
- [ ] 4.3 Write E2E tests for critical flows

### Phase 5: Documentation

- [ ] 5.1 Add JSDoc to all components
- [ ] 5.2 Update README with auth documentation
- [ ] 5.3 Create AUTHENTICATION.md guide

---

## Key Better Auth API Reference

### Sign In

```typescript
// Email/Password
await authClient.signIn.email({ email, password, rememberMe });

// Social
await authClient.signIn.social({ provider: "google" | "github", callbackURL });

// Passkey
await authClient.signIn.passkey({ autoFill: true });

// Magic Link
await authClient.signIn.magicLink({ email, callbackURL });

// Anonymous
await authClient.signIn.anonymous();
```

### Sign Up

```typescript
await authClient.signUp.email({ email, password, name });
```

### Password Management

```typescript
// Request reset
await authClient.forgetPassword.emailOtp({ email });

// Reset password
await authClient.resetPassword({ newPassword, token });
```

### Two-Factor Authentication

```typescript
// Enable 2FA (returns QR code URI)
await authClient.twoFactor.enable();

// Verify OTP
await authClient.twoFactor.verifyOtp({ code });

// Disable 2FA
await authClient.twoFactor.disable({ password });
```

### Email Verification

```typescript
await authClient.verifyEmail({ query: { token } });
```

### Passkey Management

```typescript
// Add passkey (must be authenticated)
await authClient.passkey.addPasskey({
  name: "My Security Key",
  authenticatorAttachment: "cross-platform",
});

// List passkeys
await authClient.passkey.listUserPasskeys();

// Delete passkey
await authClient.passkey.deletePasskey({ id });

// Update passkey name
await authClient.passkey.updatePasskey({ id, name });
```

---

## Security Considerations

### 1. Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- (Optional) At least 1 special character

### 2. Rate Limiting

Better Auth handles rate limiting internally:

- Login attempts: 5 per 15 minutes
- Password reset: 3 per hour
- Email verification: 5 per hour

### 3. Session Management

- Access tokens: 15 minutes
- Refresh tokens: 30 days (if rememberMe)
- Session cookies: httpOnly, secure, sameSite

### 4. CSRF Protection

Better Auth uses CSRF tokens automatically for all mutations.

### 5. XSS Prevention

- All user input sanitized
- CSP headers configured
- No inline scripts in auth forms

---

## Accessibility Guidelines

### 1. Keyboard Navigation

- All forms navigable with Tab/Shift+Tab
- Enter to submit forms
- Escape to close modals

### 2. Screen Reader Support

- ARIA labels on all inputs
- Error announcements with role="alert"
- Loading states announced
- Success/failure messages announced

### 3. Focus Management

- Focus on first error field after submission
- Focus on first input on page load
- Visible focus indicators

### 4. Color Contrast

- WCAG AA compliance (4.5:1 for normal text)
- Error states not reliant on color alone
- Icons supplement color indicators

---

## Performance Optimization

### 1. Code Splitting

- Each auth page lazy-loaded
- Shared components in separate chunk
- Better Auth client loaded on-demand

### 2. Bundle Size

- Tree-shake unused Better Auth plugins
- Minimize CSS duplication
- Use CSS modules for scoped styles

### 3. Loading States

- Skeleton loaders for initial render
- Optimistic UI updates where possible
- Progressive enhancement

### 4. Caching

- Static pages cached (register, login)
- API responses cached where appropriate
- Session data cached in memory

---

## Migration Path from Legacy Components

### Step 1: Create New Modular Structure

- Build new components alongside old ones
- No breaking changes to existing pages

### Step 2: Update Pages One by One

- Replace old component with new modular version
- Test thoroughly before moving to next page

### Step 3: Remove Legacy Components

- Delete old monolithic components
- Update imports across codebase
- Run full test suite

### Step 4: Cleanup

- Remove unused CSS files
- Remove old server actions (if any)
- Update documentation

---

## Timeline Estimate

### Week 1: Core Refactoring

- Days 1-2: Registration module
- Days 3-4: Password reset modules
- Day 5: 2FA verification module

### Week 2: Additional Features

- Days 1-2: Magic Link refactor
- Days 3-4: Passkey refactor
- Day 5: Email verification module

### Week 3: Polish & Testing

- Days 1-2: Shared components & design improvements
- Days 3-4: Testing (unit + integration + E2E)
- Day 5: Documentation & cleanup

### Week 4: Migration & Deployment

- Days 1-3: Migrate pages to use new components
- Day 4: Final testing & bug fixes
- Day 5: Deploy & monitor

---

## Success Criteria

### Functionality

- ✅ All auth flows working end-to-end
- ✅ 2FA redirect handled correctly
- ✅ Email verification working
- ✅ Password reset working
- ✅ Magic link working
- ✅ Passkey registration & signin working

### Code Quality

- ✅ All components modular and reusable
- ✅ Type-safe with Zod schemas
- ✅ Server actions follow established patterns
- ✅ No code duplication

### Design

- ✅ Consistent visual style across all pages
- ✅ Professional, modern appearance
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Smooth animations & transitions

### Testing

- ✅ 80%+ test coverage
- ✅ All critical paths tested E2E
- ✅ No console errors or warnings

### Documentation

- ✅ All components documented
- ✅ README updated
- ✅ AUTHENTICATION.md guide created

### Performance

- ✅ First paint < 1s
- ✅ Time to interactive < 2s
- ✅ Lighthouse score > 90

### Accessibility

- ✅ WCAG AA compliance
- ✅ Keyboard navigable
- ✅ Screen reader friendly

---

## Notes

1. **Better Auth Server Config**: Ensure email sending is configured in `@repo/authentication` for:
   - Email verification
   - Magic links
   - Password reset
   - 2FA backup codes (optional)

2. **Environment Variables**: Required for production:

   ```env
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   SMTP_HOST=
   SMTP_PORT=
   SMTP_USER=
   SMTP_PASS=
   ```

3. **Database Migrations**: Run migrations after adding Better Auth plugins:

   ```bash
   npx @better-auth/cli migrate
   ```

4. **Testing Better Auth**: Use test email service (e.g., Ethereal Email) for development.

5. **Passkey Testing**: Use Chrome DevTools WebAuthn emulator for local testing.
