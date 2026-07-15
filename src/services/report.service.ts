import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/session";
import type { UserRole } from "@/generated/prisma";
import { formatDate, formatTime } from "@/lib/utils";

export type ReportKind = "attendance" | "leave" | "employees" | "late";

export async function buildBankSalaryCsv(
  companyId: string,
  role: UserRole,
  year: number,
  month: number
) {
  assertPermission(role, "payroll:manage");

  const slips = await prisma.salarySlip.findMany({
    where: {
      companyId,
      year,
      month,
      status: { in: ["PUBLISHED", "LOCKED"] },
    },
    include: { employee: true },
    orderBy: { employee: { employeeCode: "asc" } },
  });

  const headers = [
    "Employee Code",
    "Name",
    "Account Name",
    "Account Number",
    "IFSC",
    "Bank Name",
    "Amount",
    "Narration",
  ];

  const rows = slips.map((s) => {
    const e = s.employee;
    const name = `${e.firstName} ${e.lastName}`.trim();
    return [
      e.employeeCode,
      name,
      e.bankAccountName || name,
      e.bankAccountNumber || "",
      e.bankIfsc || "",
      e.bankName || "",
      String(Math.round(s.netPay)),
      `SALARY ${String(month).padStart(2, "0")}${year}`,
    ];
  });

  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];

  return {
    filename: `bank-salary-${year}-${String(month).padStart(2, "0")}.csv`,
    csv: lines.join("\n"),
    count: slips.length,
  };
}

export async function buildReportRows(
  companyId: string,
  role: UserRole,
  kind: ReportKind
) {
  assertPermission(role, "reports:view");

  if (kind === "employees") {
    const rows = await prisma.employee.findMany({
      where: { companyId },
      include: { department: true, user: true },
      orderBy: { employeeCode: "asc" },
    });
    return {
      filename: "employees",
      headers: ["Code", "Name", "Email", "Role", "Department", "Status"],
      rows: rows.map((e) => [
        e.employeeCode,
        `${e.firstName} ${e.lastName}`,
        e.user.email,
        e.user.role,
        e.department?.name ?? "",
        e.employmentStatus,
      ]),
    };
  }

  if (kind === "leave") {
    const rows = await prisma.leaveRequest.findMany({
      where: { companyId },
      include: { employee: true, leaveType: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      filename: "leaves",
      headers: ["Employee", "Type", "Start", "End", "Half day", "Status", "Reason"],
      rows: rows.map((r) => [
        `${r.employee.firstName} ${r.employee.lastName}`,
        r.leaveType.name,
        formatDate(r.startDate),
        formatDate(r.endDate),
        r.isHalfDay ? "Yes" : "No",
        r.status,
        r.reason ?? "",
      ]),
    };
  }

  if (kind === "late") {
    const rows = await prisma.attendance.findMany({
      where: { companyId, isLate: true },
      include: { employee: true },
      orderBy: { date: "desc" },
      take: 500,
    });
    return {
      filename: "late-arrivals",
      headers: ["Date", "Employee", "Check in", "Status"],
      rows: rows.map((r) => [
        formatDate(r.date),
        `${r.employee.firstName} ${r.employee.lastName}`,
        formatTime(r.checkIn),
        r.status,
      ]),
    };
  }

  const rows = await prisma.attendance.findMany({
    where: { companyId },
    include: { employee: true },
    orderBy: [{ date: "desc" }, { checkIn: "desc" }],
    take: 1000,
  });
  return {
    filename: "attendance",
    headers: ["Date", "Employee", "In", "Out", "Hours", "OT", "Late", "Status"],
    rows: rows.map((r) => [
      formatDate(r.date),
      `${r.employee.firstName} ${r.employee.lastName}`,
      formatTime(r.checkIn),
      formatTime(r.checkOut),
      r.workingHours ?? "",
      r.overtimeHours ?? "",
      r.isLate ? "Yes" : "No",
      r.status,
    ]),
  };
}

export function toCsv(
  headers: string[],
  rows: (string | number)[][],
  letterhead?: { companyName: string; title: string }
) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const preface = letterhead
    ? [`"${letterhead.companyName}"`, `"${letterhead.title}"`, `"Generated ${new Date().toISOString()}"`, ""]
    : [];
  return [
    ...preface,
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
}

export async function toExcelBuffer(
  headers: string[],
  rows: (string | number)[][],
  letterhead?: {
    companyName: string;
    title: string;
    primaryColor?: string;
  }
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  let startRow = 1;
  if (letterhead) {
    sheet.mergeCells("A1", `${String.fromCharCode(64 + Math.max(headers.length, 2))}1`);
    const titleCell = sheet.getCell("A1");
    titleCell.value = letterhead.companyName;
    titleCell.font = { bold: true, size: 16, color: { argb: "FF111827" } };

    sheet.mergeCells("A2", `${String.fromCharCode(64 + Math.max(headers.length, 2))}2`);
    const sub = sheet.getCell("A2");
    sub.value = letterhead.title;
    sub.font = { bold: true, size: 12 };

    sheet.mergeCells("A3", `${String.fromCharCode(64 + Math.max(headers.length, 2))}3`);
    sheet.getCell("A3").value = `Generated ${new Date().toLocaleString("en-IN")}`;
    sheet.getCell("A3").font = { size: 10, italic: true, color: { argb: "FF64748B" } };
    startRow = 5;
  }

  const headerRow = sheet.getRow(startRow);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: (letterhead?.primaryColor || "#2563EB").replace("#", "FF") },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  rows.forEach((r, idx) => {
    const row = sheet.getRow(startRow + 1 + idx);
    r.forEach((v, i) => {
      row.getCell(i + 1).value = v;
    });
  });

  sheet.columns.forEach((col) => {
    col.width = 16;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
