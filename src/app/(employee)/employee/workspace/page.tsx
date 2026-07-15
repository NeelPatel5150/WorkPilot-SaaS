import { requireUser } from "@/lib/session";
import { listMyTasks } from "@/services/task.service";
import { PageHeader } from "@/components/shared/page";
import { EmployeeTaskPanel } from "@/features/tasks/components/employee-task-panel";
import { WorkspaceTabs } from "@/features/tasks/components/kanban-board";

export default async function EmployeeWorkspacePage() {
  const user = await requireUser();
  let items: Awaited<ReturnType<typeof listMyTasks>> = [];
  try {
    items = await listMyTasks(user.companyId!, user.id, user.role);
  } catch (e) {
    console.error("employee/workspace failed", e);
    items = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description="Your assigned work — tap a card for details, drag to update progress."
      />
      <WorkspaceTabs
        mode="employee"
        myTasks={items}
        tasksPanel={<EmployeeTaskPanel items={items} />}
      />
    </div>
  );
}
