import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildBankSalaryCsv } from "@/services/report.service";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year"));
    const month = Number(sp.get("month"));
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return new NextResponse("Invalid year/month", { status: 400 });
    }

    const { filename, csv } = await buildBankSalaryCsv(
      user.companyId!,
      user.role,
      year,
      month
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed";
    const status = error instanceof AppError ? error.status : 500;
    return new NextResponse(message, { status });
  }
}
