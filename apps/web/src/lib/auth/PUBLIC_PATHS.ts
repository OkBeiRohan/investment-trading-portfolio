/**
 * List of public paths that do not require authentication
 *
 * These paths are used in the proxy middleware and auth verifiers
 * Only include top-level paths (e.g., "/authentication", not "/authentication/login")
 */
const publicPaths = ["/authentication"];

export default publicPaths;
