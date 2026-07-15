import { redirect } from "next/navigation";
import { requireUser, isAdminRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listMcpTokens } from "@/features/mcp/tokens";
import { getMcpUsageSummary } from "@/features/mcp/usage";
import { PageHeader } from "@/components/shared/page";
import { McpAdminPanel } from "@/features/mcp/components/mcp-admin-panel";
import { headers } from "next/headers";

export default async function AdminMcpPage() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) {
    redirect("/employee/dashboard");
  }

  const [tokens, company, usage] = await Promise.all([
    listMcpTokens(user.companyId!, user.role),
    prisma.company.findUnique({
      where: { id: user.companyId! },
      select: { id: true, name: true, slug: true, timezone: true },
    }),
    getMcpUsageSummary(user.companyId!, user.role, 30),
  ]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || `${proto}://${host}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP"
        description="Create a token, then connect Claude Code, Claude Desktop, or Cursor — no code clone required."
      />
      <McpAdminPanel
        tokens={tokens}
        usage={usage}
        appBaseUrl={appBaseUrl}
        company={company}
        adminEmail={user.email}
      />
    </div>
  );
}
