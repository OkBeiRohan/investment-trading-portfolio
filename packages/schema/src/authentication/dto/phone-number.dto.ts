import { z } from "zod";

/**
 * Phone Number DTO Schema
 */
export const PhoneNumberDtoSchema = z.object({
  phoneNumber: z
    .string({ message: "Phone number is required" })
    .min(10, "Phone number must be at least 10 digits")
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      "Please enter a valid phone number (E.164 format)"
    ),
});

export type IPhoneNumberDto = z.infer<typeof PhoneNumberDtoSchema>;
export type PhoneNumberFieldErrors = z.core.$ZodErrorTree<IPhoneNumberDto>;

export type PhoneNumberFormResult =
  | { success: true; data: IPhoneNumberDto }
  | { success: false; fieldErrors: PhoneNumberFieldErrors };

export function parsePhoneNumberFormData(
  formData: FormData
): PhoneNumberFormResult {
  const result = PhoneNumberDtoSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
  });

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

/**
 * Phone OTP Verification DTO Schema
 */
export const PhoneOtpDtoSchema = z.object({
  phoneNumber: z.string({ message: "Phone number is required" }),
  code: z
    .string({ message: "Verification code is required" })
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type IPhoneOtpDto = z.infer<typeof PhoneOtpDtoSchema>;
export type PhoneOtpFieldErrors = z.core.$ZodErrorTree<IPhoneOtpDto>;

export type PhoneOtpFormResult =
  | { success: true; data: IPhoneOtpDto }
  | { success: false; fieldErrors: PhoneOtpFieldErrors };

export function parsePhoneOtpFormData(formData: FormData): PhoneOtpFormResult {
  const result = PhoneOtpDtoSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    code: formData.get("code"),
  });

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
