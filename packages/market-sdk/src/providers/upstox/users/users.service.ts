import { Injectable } from "@nestjs/common";

/**
 * Service to manage Upstox user configurations and details.
 *
 * For users actively trading, their information will be kept in memory
 * for quicker usage of accessToken, trading mode (live or sandbox), etc
 * without needing to fetch from DB every time.
 *
 * For other operations, this service can fetch user details from database.
 * Also handles updating information, etc.
 */
@Injectable()
export class UpstoxUsersService {
  constructor() {}
}
