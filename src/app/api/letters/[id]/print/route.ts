import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAdminRole } from "@/lib/session";
import { getOfferLetter } from "@/services/letter.service";
import { getAppBaseUrl } from "@/lib/tenant-url";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("en-IN")}`;
  }
}

function formatLongDate(d: Date | null | undefined) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!isAdminRole(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const letter = await getOfferLetter(user.companyId!, user.role, id);
  const company = letter.company;
  const isAppointment = letter.letterType === "APPOINTMENT";
  const title = isAppointment ? "Appointment Letter" : "Offer Letter";
  const today = formatLongDate(new Date());
  const logoUrl = company.logoUrl
    ? `${getAppBaseUrl()}/api/brand/icon?kind=logo&companyId=${encodeURIComponent(company.id)}`
    : null;
  const address = (company.address || "").trim();
  const salary =
    letter.salaryAmount != null
      ? money(letter.salaryAmount, letter.salaryCurrency || "INR")
      : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} · ${escapeHtml(letter.candidateName)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
  ${
    logoUrl
      ? `<link rel="icon" href="${escapeHtml(
          `${getAppBaseUrl()}/api/brand/icon?kind=favicon&companyId=${encodeURIComponent(company.id)}`
        )}" />`
      : ""
  }
  <style>
    :root { --page-w: 210mm; --page-h: 297mm; --page-pad: 40px; --accent: ${escapeHtml(company.primaryColor || "#2563EB")}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 0; }
    body { font-family: "Segoe UI", system-ui, sans-serif; background: #E8E4E0; color: #111; font-size: 11pt; line-height: 1.55; }
    .no-print { max-width: var(--page-w); margin: 16px auto; display: flex; gap: 8px; flex-wrap: wrap; padding: 0 8px; }
    .no-print button, .no-print a { font-family: inherit; background: #111; color: #fff; border: 0; padding: 10px 16px; cursor: pointer; text-decoration: none; border-radius: 6px; font-size: 13px; }
    .page {
      width: var(--page-w); height: var(--page-h); min-height: var(--page-h); max-height: var(--page-h);
      margin: 0 auto 20px; background: #fff; position: relative; overflow: hidden;
    }
    .page-inner { padding: var(--page-pad); padding-bottom: 48px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid var(--accent); padding-bottom: 14px; }
    .brand { display: flex; gap: 12px; align-items: flex-start; }
    .brand img { height: 48px; max-width: 120px; object-fit: contain; }
    .brand h1 { font-size: 20px; }
    .addr { margin-top: 4px; color: #666; font-size: 9.5pt; max-width: 320px; white-space: pre-line; }
    .doc-title { text-align: right; }
    .doc-title .eyebrow { font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; color: #666; }
    .doc-title .name { margin-top: 4px; font-size: 18px; font-weight: 700; color: var(--accent); }
    .meta { margin-top: 18px; font-size: 10.5pt; }
    .body { margin-top: 22px; flex: 1; }
    .body p { margin-bottom: 12px; }
    .details { margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .details row, .details .row { display: grid; grid-template-columns: 160px 1fr; border-bottom: 1px solid #eee; }
    .details .row:last-child { border-bottom: 0; }
    .details .k { padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #555; font-size: 10pt; }
    .details .v { padding: 8px 12px; font-weight: 600; }
    .sign { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign .line { margin-top: 48px; border-top: 1px solid #111; padding-top: 6px; font-size: 10pt; }
    .footer { margin-top: auto; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 9pt; }
    @media print {
      body { background: #fff; margin: 0; width: var(--page-w); }
      .no-print { display: none !important; }
      .page { margin: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()">Print / Save PDF</button>
    <a class="btn" href="/admin/letters" id="back-btn">Back</a>
  </div>
  <script>
    document.getElementById("back-btn")?.addEventListener("click", function (e) {
      if (window.history.length > 1) {
        e.preventDefault();
        history.back();
        return;
      }
      if (window.opener && !window.opener.closed) {
        e.preventDefault();
        window.close();
      }
    });
  </script>
  <section class="page">
    <div class="page-inner">
      <div class="header">
        <div class="brand">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" />` : ""}
          <div>
            <h1>${escapeHtml(company.name)}</h1>
            ${address ? `<p class="addr">${escapeHtml(address)}</p>` : ""}
          </div>
        </div>
        <div class="doc-title">
          <div class="eyebrow">Official document</div>
          <div class="name">${escapeHtml(title)}</div>
        </div>
      </div>
      <div class="meta">
        <p><strong>Date:</strong> ${escapeHtml(today)}</p>
        <p style="margin-top:8px"><strong>To,</strong><br/>${escapeHtml(letter.candidateName)}</p>
      </div>
      <div class="body">
        <p>Dear ${escapeHtml(letter.candidateName.split(" ")[0] || letter.candidateName)},</p>
        <p>
          ${
            isAppointment
              ? `We are pleased to confirm your appointment with <strong>${escapeHtml(company.name)}</strong> for the position of <strong>${escapeHtml(letter.designation)}</strong>.`
              : `We are pleased to offer you the position of <strong>${escapeHtml(letter.designation)}</strong> at <strong>${escapeHtml(company.name)}</strong>.`
          }
        </p>
        <div class="details">
          <div class="row"><div class="k">Position</div><div class="v">${escapeHtml(letter.designation)}</div></div>
          ${letter.department ? `<div class="row"><div class="k">Department</div><div class="v">${escapeHtml(letter.department)}</div></div>` : ""}
          <div class="row"><div class="k">Joining date</div><div class="v">${escapeHtml(formatLongDate(letter.joiningDate))}</div></div>
          ${salary ? `<div class="row"><div class="k">Compensation</div><div class="v">${escapeHtml(salary)}</div></div>` : ""}
          ${letter.employmentType ? `<div class="row"><div class="k">Employment type</div><div class="v">${escapeHtml(letter.employmentType.replace(/_/g, " "))}</div></div>` : ""}
          ${letter.reportingTo ? `<div class="row"><div class="k">Reporting to</div><div class="v">${escapeHtml(letter.reportingTo)}</div></div>` : ""}
          ${letter.location ? `<div class="row"><div class="k">Location</div><div class="v">${escapeHtml(letter.location)}</div></div>` : ""}
        </div>
        ${
          letter.bodyExtras
            ? `<p>${escapeHtml(letter.bodyExtras).replace(/\n/g, "<br/>")}</p>`
            : `<p>Please confirm your acceptance of this ${isAppointment ? "appointment" : "offer"} by signing and returning a copy of this letter.</p>`
        }
        <p>We look forward to working with you.</p>
        <div class="sign">
          <div>
            <div class="line">
              For ${escapeHtml(company.name)}<br/>Authorized Signatory
            </div>
          </div>
          <div>
            <div class="line">
              Accepted by<br/>${escapeHtml(letter.candidateName)}
            </div>
          </div>
        </div>
      </div>
      <div class="footer">— System-generated letter · ${escapeHtml(company.name)} —</div>
    </div>
  </section>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
