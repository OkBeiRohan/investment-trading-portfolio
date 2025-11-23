import { Injectable, Logger } from "@nestjs/common";
import { ValidationError } from "../../../core/error";

@Injectable()
export class SandboxAuthStrategy {
  private readonly logger = new Logger(SandboxAuthStrategy.name);

  /**
   * Validate sandbox token format
   */
  validateToken(token: string): boolean {
    // Upstox tokens are typically JWT format
    if (!token || typeof token !== "string") {
      return false;
    }

    // Basic JWT format check (3 parts separated by dots)
    const parts = token.split(".");
    if (parts.length !== 3) {
      this.logger.warn("Invalid token format: not a valid JWT structure");
      return false;
    }

    // Check if each part is base64url encoded
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    for (const part of parts) {
      if (!base64UrlRegex.test(part)) {
        this.logger.warn("Invalid token format: invalid base64url encoding");
        return false;
      }
    }

    return true;
  }

  /**
   * Process and validate sandbox token before storage
   */
  async processSandboxToken(rawToken: string): Promise<string> {
    const trimmedToken = rawToken.trim();

    if (!this.validateToken(trimmedToken)) {
      throw new ValidationError("Invalid sandbox token format", {
        hint: "Token should be a valid JWT from Upstox Developer Dashboard",
      });
    }

    this.logger.log("Sandbox token validated successfully");
    return trimmedToken;
  }

  /**
   * Extract user info from sandbox token (if possible)
   */
  extractUserInfo(token: string): { userId?: string; expiry?: Date } | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      // Decode payload (middle part)
      const payload = JSON.parse(
        Buffer.from(parts[1] || "", "base64url").toString("utf-8")
      );

      return {
        userId: payload.sub || payload.user_id,
        expiry: payload.exp ? new Date(payload.exp * 1000) : undefined,
      };
    } catch (error) {
      this.logger.warn("Failed to extract user info from token");
      return null;
    }
  }

  /**
   * Generate instructions for obtaining sandbox token
   */
  getSandboxInstructions(): string {
    return `
To obtain a sandbox access token:
1. Go to https://upstox.com/developer/apps
2. Select your application
3. Navigate to the "API Credentials" section
4. Generate a sandbox access token
5. Copy the entire token and paste it here

Note: Sandbox tokens are valid for 30 days.
    `.trim();
  }
}
