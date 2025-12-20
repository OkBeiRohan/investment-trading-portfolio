/**
 * Upstox API Error Response
 * Returned when status is "error"
 */
export interface IUpstoxErrorResponse {
  status: "error";
  errors: Array<{
    error_code: string;
    message: string;
    property_path?: string;
    invalid_value?: string;
  }>;
}

/**
 * Upstox API Success Response
 * Returned when status is "success"
 */
export interface IUpstoxSuccessResponse<T> {
  status: "success";
  data: T;
}

/**
 * Generic Upstox API Response
 * Can be either success or error
 */
type IUpstoxResponse<T> = IUpstoxErrorResponse | IUpstoxSuccessResponse<T>;
export default IUpstoxResponse;

/**
 * Type guard to check if response is successful
 */
export function isUpstoxSuccess<T>(
  response: IUpstoxResponse<T>
): response is IUpstoxSuccessResponse<T> {
  return response.status === "success";
}

/**
 * Type guard to check if response is an error
 */
export function isUpstoxError<T>(
  response: IUpstoxResponse<T>
): response is IUpstoxErrorResponse {
  return response.status === "error";
}

/**
 * Extract data from Upstox response or throw error
 */
export function extractUpstoxData<T>(response: IUpstoxResponse<T>): T {
  if (isUpstoxSuccess(response)) {
    return response.data;
  }
  const errorMessages = response.errors.map((e) => e.message).join(", ");
  throw new Error(`Upstox API Error: ${errorMessages}`);
}
