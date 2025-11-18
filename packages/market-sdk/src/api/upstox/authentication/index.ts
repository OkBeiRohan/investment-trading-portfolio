import { UpstoxConfig } from "@repo/schema";
import { LoginApi, BASE_PATH } from "@repo/upstox-sdk";

class UpstoxAuthentication {
  private api: LoginApi;
  private config: UpstoxConfig;

  constructor(config: UpstoxConfig) {
    this.api = new LoginApi({
      apiKey: config.client_id,
    });
    this.config = config;
  }

  public getLoginUrl(state?: string, scope?: string): URL {
    const pathname = "/v2/login/authorization/dialog";

    const url = new URL(pathname, BASE_PATH);
    url.searchParams.append("client_id", this.config.client_id);
    url.searchParams.append("redirect_uri", this.config.redirect_uri);
    url.searchParams.append("response_type", "code");
    if (state) url.searchParams.append("state", state);
    if (scope) url.searchParams.append("scope", scope);

    return url;
  }

  public async generateAccessToken(code: string) {
    try {
      const response = await this.api.tokenForm(
        code,
        this.config.client_id,
        this.config.client_secret,
        this.config.redirect_uri,
        "authorization_code"
      );

      console.log(response.data.accessToken);
    } catch (error) {
      console.error("Error generating access token:", error);
    }
  }
}

export default UpstoxAuthentication;
