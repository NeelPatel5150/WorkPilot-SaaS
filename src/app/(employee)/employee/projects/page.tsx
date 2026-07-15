import { requireUser } from "@/lib/session";
import { listMySharedProjects } from "@/services/project.service";
import { PageHeader } from "@/components/shared/page";
import { SharedProjectsView } from "@/features/projects/components/shared-projects-view";

export default async function EmployeeProjectsPage() {
  const user = await requireUser();
  const projects = await listMySharedProjects(
    user.companyId!,
    user.id,
    user.role
  ).catch((err) => {
    console.error("employee/projects failed", err);
    return [];
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared projects"
        description="Credentials shared with you — view and copy as JSON."
      />
      <SharedProjectsView projects={projects} />
    </div>
  );
}
