import { requireUser } from "@/lib/session";
import { listHolidays } from "@/services/holiday.service";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { HolidayForms } from "@/features/holidays/components/holiday-forms";

export default async function AdminHolidaysPage() {
  const user = await requireUser();
  const holidays = await listHolidays(user.companyId!);

  return (
    <div className="space-y-6">
      <PageHeader title="Holidays" description="Company holiday calendar." />
      <HolidayForms />
      {holidays.length === 0 ? (
        <EmptyState title="No holidays" description="Add public holidays for your company." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-bold">{h.name}</TableCell>
                  <TableCell>{formatDate(h.date)}</TableCell>
                  <TableCell className="text-right">
                    <HolidayForms deleteId={h.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
