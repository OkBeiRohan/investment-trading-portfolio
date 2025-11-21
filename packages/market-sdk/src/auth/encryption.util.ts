import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = "aes-256-gcm";
  private readonly secretKey: Buffer;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>("ENCRYPTION_KEY");
    if (!key || key.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 characters");
    }
    this.secretKey = Buffer.from(key, "utf-8");
  }

  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: cipher.getAuthTag().toString("hex"),
    };
  }

  decrypt(encrypted: string, ivHex: string, tagHex: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
