import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/shared/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AvatarUploadCard } from "@/features/profile/components/avatar-setup";

export default async function EmployeeProfilePage() {
  const user = await requireUser();
  const employee = user.employee;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your employment details." />
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploadCard currentImage={user.image} userName={user.name} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-bold">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-bold">Role:</span> <Badge>{user.role}</Badge>
          </p>
          {employee ? (
            <>
              <p>
                <span className="font-bold">Code:</span> {employee.employeeCode}
              </p>
              <p>
                <span className="font-bold">Designation:</span>{" "}
                {employee.designation ?? "—"}
              </p>
              <p>
                <span className="font-bold">Phone:</span> {employee.phone ?? "—"}
              </p>
              <p>
                <span className="font-bold">Joined:</span>{" "}
                {employee.joiningDate ? formatDate(employee.joiningDate) : "—"}
              </p>
              <p>
                <span className="font-bold">Status:</span> {employee.employmentStatus}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
