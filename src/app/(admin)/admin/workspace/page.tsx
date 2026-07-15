import { requireUser } from "@/lib/session";
import { listEmployees } from "@/services/employee.service";
import { listCompanyTasks } from "@/services/task.service";
import { listProjects } from "@/services/project.service";
import { PageHeader, StatCard } from "@/components/shared/page";
import {
  AdminTaskList,
  CreateTaskForm,
} from "@/features/tasks/components/admin-task-panel";
import { WorkspaceTabs } from "@/features/tasks/components/kanban-board";
import { ProjectsVault } from "@/features/projects/components/projects-vault";

export default async function AdminWorkspacePage() {
  const user = await requireUser();
  const [tasks, employees, projects] = await Promise.all([
    listCompanyTasks(user.companyId!, user.role).catch((err) => {
      console.error("admin/workspace list failed", err);
      return [];
    }),
    listEmployees(user.companyId!, user.role),
    listProjects(user.companyId!, user.role).catch((err) => {
      console.error("admin/workspace projects failed", err);
      return [];
    }),
  ]);

  const employeeOptions = employees
    .filter(
      (e) =>
        (e.employmentStatus === "ACTIVE" || e.employmentStatus === "ON_NOTICE") &&
        e.user.role !== "COMPANY_ADMIN" &&
        e.user.role !== "SUPER_ADMIN" &&
        e.user.isActive
    )
    .map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName} · ${e.employeeCode}`,
    }));

  const openAssignees = tasks.reduce(
    (n, t) => n + t.assignees.filter((a) => a.status !== "DONE").length,
    0
  );
  const doneAssignees = tasks.reduce(
    (n, t) => n + t.assignees.filter((a) => a.status === "DONE").length,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description="Board, tasks, and project credentials — keep everything in one place."
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Tasks" value={tasks.length} />
        <StatCard label="Open assignments" value={openAssignees} />
        <StatCard label="Completed" value={doneAssignees} />
        <StatCard label="Projects" value={projects.length} />
      </div>
      <WorkspaceTabs
        mode="admin"
        adminTasks={tasks}
        employees={employeeOptions}
        tasksPanel={
          <div className="space-y-6">
            <CreateTaskForm employees={employeeOptions} />
            <AdminTaskList tasks={tasks} />
          </div>
        }
        projectsPanel={
          <ProjectsVault projects={projects} employees={employeeOptions} />
        }
      />
    </div>
  );
}
