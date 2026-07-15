-- Admin MCP access tokens (scoped Bearer for /api/mcp)
CREATE TABLE IF NOT EXISTS mcp_tokens (
  id TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "tokenPrefix" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL,
  "lastUsedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mcp_tokens_company_created_idx
  ON mcp_tokens ("companyId", "createdAt");

CREATE INDEX IF NOT EXISTS mcp_tokens_user_idx
  ON mcp_tokens ("userId");
