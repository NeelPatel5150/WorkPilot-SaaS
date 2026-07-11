import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  buildReportRows,
  toCsv,
  toExcelBuffer,
  type ReportKind,
} from "@/services/report.service";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const kind = (req.nextUrl.searchParams.get("kind") || "attendance") as ReportKind;
  const format = req.nextUrl.searchParams.get("format") || "csv";

  const report = await buildReportRows(user.companyId!, user.role, kind);
  const company = user.company!;
  const letterhead = {
    companyName: company.name,
    title: `${report.filename.replace(/-/g, " ")} report`.replace(/\b\w/g, (c) =>
      c.toUpperCase()
    ),
    primaryColor: company.primaryColor,
  };

  if (format === "xlsx") {
    const buffer = await toExcelBuffer(report.headers, report.rows, letterhead);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${company.slug}-${report.filename}.xlsx"`,
      },
    });
  }

  const csv = toCsv(report.headers, report.rows, letterhead);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${company.slug}-${report.filename}.csv"`,
    },
  });
}
