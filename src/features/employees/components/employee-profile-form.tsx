"use client";

import { useTransition } from "react";
import { updateEmployeeProfileAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

type Dept = { id: string; name: string };

export function EmployeeProfileForm({
  employeeId,
  firstName,
  lastName,
  email,
  phone,
  emergencyContact,
  designation,
  departmentId,
  role,
  joiningDate,
  departments,
  lockRole,
}: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: string;
  designation: string;
  departmentId: string;
  role: string;
  joiningDate: string;
  departments: Dept[];
  lockRole: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile &amp; department</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("employeeId", employeeId);
            startTransition(async () => {
              const res = await updateEmployeeProfileAction(fd);
              if (res && "error" in res) toastError("Save failed", res.error);
              else toastSuccess("Saved", "Employee profile updated.");
            });
          }}
        >
          <div className="space-y-1">
            <Label>First name</Label>
            <Input name="firstName" required defaultValue={firstName} />
          </div>
          <div className="space-y-1">
            <Label>Last name</Label>
            <Input name="lastName" required defaultValue={lastName} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Work email</Label>
            <Input name="email" type="email" required defaultValue={email} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input name="phone" defaultValue={phone} placeholder="Enter phone" />
          </div>
          <div className="space-y-1">
            <Label>Emergency contact</Label>
            <Input
              name="emergencyContact"
              defaultValue={emergencyContact}
              placeholder="Enter emergency contact"
            />
          </div>
          <div className="space-y-1">
            <Label>Designation</Label>
            <Input
              name="designation"
              defaultValue={designation}
              placeholder="Enter designation"
            />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Select name="departmentId" defaultValue={departmentId || ""}>
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            {lockRole ? (
              <>
                <Input value={role} disabled readOnly />
                <input type="hidden" name="role" value={role} />
              </>
            ) : (
              <Select name="role" defaultValue={role}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
                <option value="COMPANY_ADMIN">Company admin</option>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label>Joining date</Label>
            <Input name="joiningDate" type="date" defaultValue={joiningDate} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
