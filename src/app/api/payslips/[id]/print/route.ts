import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAdminRole } from "@/lib/session";
import { getAdminSalarySlip, getMySalarySlip } from "@/services/payroll.service";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { indianRupeeInWords } from "@/lib/amount-in-words";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(n: number) {
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPayDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const canManage =
    isAdminRole(user.role) ||
    hasPermission(user.role as Role, "payroll:manage");

  const slip = canManage
    ? await getAdminSalarySlip(user.companyId!, user.role, id)
    : await getMySalarySlip(user.companyId!, user.id, user.role, id);

  const period = `${MONTHS[slip.month - 1]} ${slip.year}`;
  const employeeName = `${slip.employee.firstName} ${slip.employee.lastName}`.trim();
  const payDate = formatPayDate(slip.updatedAt ?? slip.createdAt);
  const paidDays = Number(slip.presentDays) || 0;
  const lopDays = Number(slip.lopDays) || 0;

  const basic = Number(slip.basic) || 0;
  const allowances = Number(slip.allowances) || 0;
  const grossEarnings = basic + allowances;

  const incomeTax = Number(slip.tds) || 0;
  const pf = Number(slip.pf) || 0;
  const esi = Number(slip.esi) || 0;
  const professionalTax = Number(slip.deductions) || 0;
  const totalDeductions = incomeTax + pf + esi + professionalTax;
  const netPay = Number(slip.netPay) || 0;
  const amountWords = indianRupeeInWords(netPay);

  const address = (slip.company.address || "").trim();
  const logoUrl = slip.company.logoUrl
    ? `/api/brand/icon?kind=logo&companyId=${encodeURIComponent(slip.companyId)}`
    : null;

  const earningsRows = [
    { label: "Basic", amount: basic },
    { label: "House Rent Allowance", amount: allowances },
  ];

  const deductionRows: { label: string; amount: number }[] = [
    { label: "Income Tax", amount: incomeTax },
    { label: "Provident Fund", amount: pf },
  ];
  if (esi > 0) deductionRows.push({ label: "ESI", amount: esi });
  deductionRows.push({ label: "Professional tax", amount: professionalTax });

  const earningsHtml = earningsRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td class="amt">₹${money(r.amount)}</td></tr>`
    )
    .join("");

  const deductionsHtml = deductionRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td class="amt">₹${money(r.amount)}</td></tr>`
    )
    .join("");

  const brandName = escapeHtml(slip.company.name);
  const backHref = canManage
    ? "/admin/payroll"
    : `/employee/payslips/${encodeURIComponent(slip.id)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payslip · ${escapeHtml(period)} · ${escapeHtml(employeeName)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
  ${
    slip.companyId
      ? `<link rel="icon" href="/api/brand/icon?kind=favicon&amp;companyId=${encodeURIComponent(slip.companyId)}" />`
      : ""
  }
  <style>
    /* ========== SINGLE-PAGE A4 PDF CONFIG ========== */
    :root {
      --page-w: 210mm;
      --page-h: 297mm;
      --page-pad: 38px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      background: #E8E4E0;
      color: #111;
    }

    @page {
      size: A4;
      margin: 0;
    }

    .page {
      width: var(--page-w);
      height: var(--page-h);
      min-height: var(--page-h);
      max-height: var(--page-h);
      margin: 0 auto 20px;
      background: #fff;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    .page-inner {
      padding: var(--page-pad);
      padding-bottom: 46px;
      height: 100%;
      max-height: var(--page-h);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      gap: 18px;
    }

    .page-inner.compact {
      padding: 28px 32px 42px;
      gap: 12px;
    }

    .page-number {
      position: absolute;
      bottom: 18px;
      right: var(--page-pad);
      font-size: 8pt;
      color: #888;
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .no-print {
      max-width: var(--page-w);
      margin: 16px auto;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 0 8px;
    }
    .no-print button, .no-print a.btn {
      font-family: inherit;
      background: #111;
      color: #fff;
      border: 0;
      padding: 10px 16px;
      cursor: pointer;
      text-decoration: none;
      font-size: 13px;
      border-radius: 6px;
    }
    .no-print .hint {
      font-size: 12px;
      color: #555;
      width: 100%;
    }

    /* Content */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }
    .brand {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
    }
    .brand img {
      height: 40px;
      max-width: 110px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #111;
    }
    .brand-text .addr {
      margin: 3px 0 0;
      color: #6b7280;
      font-size: 9.5pt;
      max-width: 320px;
      white-space: pre-line;
      line-height: 1.35;
    }
    .period { text-align: right; flex-shrink: 0; }
    .period .label { color: #4b5563; font-size: 10pt; }
    .period .value {
      margin-top: 2px;
      font-size: 16px;
      font-weight: 700;
      color: #111;
    }

    .summary {
      display: grid;
      grid-template-columns: 1fr 250px;
      gap: 20px;
      align-items: start;
      flex-shrink: 0;
    }
    .summary-title {
      margin: 0 0 10px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #6b7280;
      text-transform: uppercase;
    }
    .kv {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 6px 8px;
      font-size: 10pt;
    }
    .kv .k { color: #6b7280; }
    .kv .v { color: #111; font-weight: 600; }

    .net-box {
      background: #e8f5e9;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .net-box .net-label { color: #374151; font-size: 10pt; font-weight: 500; }
    .net-box .net-amount {
      margin-top: 2px;
      font-size: 24px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.02em;
    }
    .net-box .net-divider {
      border: 0;
      border-top: 1px dotted #9ca3af;
      margin: 10px 0;
    }
    .net-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10pt;
      color: #374151;
    }
    .net-meta strong { color: #111; font-weight: 700; }

    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      flex: 1 1 auto;
      min-height: 0;
      align-content: start;
    }
    table.breakdown {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    table.breakdown thead th {
      text-align: left;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #6b7280;
      text-transform: uppercase;
      padding: 0 0 6px;
      border-bottom: 1px dotted #d1d5db;
    }
    table.breakdown thead th.amt,
    table.breakdown td.amt { text-align: right; }
    table.breakdown tbody td {
      padding: 7px 0;
      border-bottom: 1px dotted #e5e7eb;
      color: #111;
      vertical-align: top;
    }
    table.breakdown tfoot td {
      padding: 8px 6px;
      background: #f3f4f6;
      font-weight: 700;
      color: #111;
    }
    table.breakdown tfoot td:first-child { border-radius: 4px 0 0 4px; }
    table.breakdown tfoot td:last-child {
      border-radius: 0 4px 4px 0;
      text-align: right;
    }

    .payable {
      background: #e8f5e9;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .payable .title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #111;
      text-transform: uppercase;
    }
    .payable .sub {
      margin-top: 2px;
      font-size: 9pt;
      color: #6b7280;
      font-weight: 500;
      letter-spacing: 0;
      text-transform: none;
    }
    .payable .amount {
      font-size: 18px;
      font-weight: 700;
      color: #111;
      white-space: nowrap;
    }
    .words {
      text-align: right;
      font-size: 10pt;
      color: #374151;
      flex-shrink: 0;
    }
    .words strong { color: #111; }

    .footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 9pt;
      flex-shrink: 0;
    }
    .footer .brand-line {
      margin-top: 6px;
      font-size: 8.5pt;
      color: #6b7280;
    }

    @media print {
      body {
        background: #fff;
        width: var(--page-w);
        margin: 0;
        padding: 0;
      }

      .page {
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        overflow: hidden !important;
        width: var(--page-w) !important;
        height: var(--page-h) !important;
        min-height: var(--page-h) !important;
        max-height: var(--page-h) !important;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .page-inner {
        height: 100%;
        max-height: var(--page-h);
        overflow: hidden;
      }

      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()">Print / Save PDF</button>
    <a class="btn" href="${escapeHtml(backHref)}" id="back-btn">Back</a>
    <p class="hint">Chrome: A4 · Margins <strong>None</strong> · Scale 100% · Background graphics On · Headers/footers Off</p>
  </div>
  <script>
    document.getElementById("back-btn")?.addEventListener("click", function (e) {
      // New-tab opens often have no history, so prefer close when we can.
      if (window.history.length > 1) {
        e.preventDefault();
        history.back();
        return;
      }
      if (window.opener && !window.opener.closed) {
        e.preventDefault();
        window.close();
      }
      // else fall through to href (payroll / payslip page)
    });
  </script>

  <section class="page">
    <div class="page-inner compact">
      <div class="header avoid-break">
        <div class="brand">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" />` : ""}
          <div class="brand-text">
            <h1>${brandName}</h1>
            ${address ? `<p class="addr">${escapeHtml(address)}</p>` : ""}
          </div>
        </div>
        <div class="period">
          <div class="label">Payslip For the Month</div>
          <div class="value">${escapeHtml(period)}</div>
        </div>
      </div>

      <div class="summary avoid-break">
        <div>
          <p class="summary-title">Employee Summary</p>
          <div class="kv">
            <span class="k">Employee Name</span><span class="v">: ${escapeHtml(employeeName)}</span>
            <span class="k">Employee ID</span><span class="v">: ${escapeHtml(slip.employee.employeeCode)}</span>
            <span class="k">Pay Period</span><span class="v">: ${escapeHtml(period)}</span>
            <span class="k">Pay Date</span><span class="v">: ${escapeHtml(payDate)}</span>
          </div>
        </div>
        <div class="net-box">
          <div class="net-label">Total Net Pay</div>
          <div class="net-amount">₹${money(netPay)}</div>
          <hr class="net-divider" />
          <div class="net-meta">
            <div>Paid Days : <strong>${paidDays}</strong></div>
            <div>LOP Days : <strong>${lopDays}</strong></div>
          </div>
        </div>
      </div>

      <div class="split avoid-break">
        <table class="breakdown">
          <thead>
            <tr>
              <th>Earnings</th>
              <th class="amt">Amount</th>
            </tr>
          </thead>
          <tbody>${earningsHtml}</tbody>
          <tfoot>
            <tr>
              <td>Gross Earnings</td>
              <td>₹${money(grossEarnings)}</td>
            </tr>
          </tfoot>
        </table>
        <table class="breakdown">
          <thead>
            <tr>
              <th>Deductions</th>
              <th class="amt">Amount</th>
            </tr>
          </thead>
          <tbody>${deductionsHtml}</tbody>
          <tfoot>
            <tr>
              <td>Total Deductions</td>
              <td>₹${money(totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="payable avoid-break">
        <div>
          <div class="title">Total Net Payable</div>
          <div class="sub">Gross Earnings - Total Deductions</div>
        </div>
        <div class="amount">₹${money(netPay)}</div>
      </div>
      <p class="words avoid-break">Amount In Words : <strong>${escapeHtml(amountWords)}</strong></p>

      <div class="footer avoid-break">
        <div>— This is a system-generated document. —</div>
        <div class="brand-line">${brandName}</div>
      </div>
    </div>
    <div class="page-number">01</div>
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
