/**
 * Resolves workspace (tenant) from request and attaches to req.workspaceId.
 * Expects workspace to be identified by header (e.g. X-Workspace-Id) or subdomain.
 * Replace with actual lookup (e.g. by slug/header) when auth is implemented.
 */
export function tenantContext(req, res, next) {
  const workspaceId =
    req.headers['x-workspace-id'] ?? req.headers['x-tenant-id'] ?? null;

  if (!workspaceId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Workspace context required (X-Workspace-Id header)' },
    });
  }

  req.workspaceId = workspaceId;
  next();
}
