// EYVAN web (#5183): the server is reached on the app's own address (app.kssx.ir/api → azar-auth on the same
// machine), so no other domain shows anywhere (Amin #5135). The dev server proxies /api the same way.
export const AUTH_API_BASE_URL = `${window.location.origin}/api`
