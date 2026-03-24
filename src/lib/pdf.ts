import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to get last table Y position from jspdf-autotable
function getLastTableY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  return d.lastAutoTable?.finalY ?? fallback;
}

interface ProjectReportData {
  name: string;
  description: string;
  goals: string;
  date: string;
  due_date: string;
  status: string;
  completion_pct: number;
  total_tasks: number;
  completed_tasks: number;
  sections: { id: number; name: string }[];
  tasks: {
    section_id: number;
    name: string;
    status: string;
    due_date: string;
    assigned_to: string;
    remarks: string;
    notes: string;
  }[];
  expenditures: { description: string; amount: number; date: string }[];
}

export function generateProjectPDF(project: ProjectReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("UP Alpha Sigma Fraternity Alumni Association", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("Project Report", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(project.name, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Project info
  doc.setFontSize(10);
  doc.setTextColor(80);
  const info = [
    `Status: ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}`,
    `Start Date: ${project.date}`,
    ...(project.due_date ? [`Due Date: ${project.due_date}`] : []),
    `Completion: ${project.completion_pct}% (${project.completed_tasks}/${project.total_tasks} tasks)`,
  ];
  for (const line of info) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 3;

  // Goals
  if (project.goals) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Goals", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const goalLines = doc.splitTextToSize(project.goals, pageWidth - 28);
    doc.text(goalLines, 14, y);
    y += goalLines.length * 5 + 5;
  }

  // Description
  if (project.description) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Description", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const descLines = doc.splitTextToSize(project.description, pageWidth - 28);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 5;
  }

  // Sections & Tasks
  for (const section of project.sections) {
    const sectionTasks = project.tasks.filter((t) => t.section_id === section.id);
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(section.name, 14, y);
    y += 2;

    if (sectionTasks.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Task", "Status", "Assigned To", "Due Date", "Remarks"]],
        body: sectionTasks.map((t) => [
          t.name,
          t.status,
          t.assigned_to || "-",
          t.due_date || "-",
          t.remarks || "-",
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = getLastTableY(doc, y + 20);
      y += 8;
    } else {
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("No tasks in this section", 14, y);
      y += 8;
    }
  }

  // Expenditures
  if (project.expenditures.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Expenditures", 14, y);
    y += 2;

    const totalExp = project.expenditures.reduce((s, e) => s + Number(e.amount), 0);

    autoTable(doc, {
      startY: y,
      head: [["Date", "Description", "Amount"]],
      body: [
        ...project.expenditures.map((e) => [e.date, e.description, `₱${Number(e.amount).toLocaleString()}`]),
        ["", "Total", `₱${totalExp.toLocaleString()}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_Report.pdf`);
}

interface FinancialReportData {
  summary: {
    total_dues: number;
    total_donations: number;
    total_income: number;
    total_expenditures: number;
    net: number;
  };
  breakdown: {
    dues: { month: string; total: number }[];
    donations: { month: string; total: number }[];
    expenditures: { month: string; total: number }[];
  };
  filters: { start: string; end: string };
}

export function generateFinancialPDF(report: FinancialReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("UP Alpha Sigma Fraternity Alumni Association", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("Financial Report", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Period: ${report.filters.start} to ${report.filters.end}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // Summary
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Summary", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Category", "Amount"]],
    body: [
      ["Total Dues", `₱${report.summary.total_dues.toLocaleString()}`],
      ["Total Donations", `₱${report.summary.total_donations.toLocaleString()}`],
      ["Total Income", `₱${report.summary.total_income.toLocaleString()}`],
      ["Total Expenditures", `₱${report.summary.total_expenditures.toLocaleString()}`],
      ["Net", `₱${report.summary.net.toLocaleString()}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = getLastTableY(doc, y + 40);
  y += 10;

  // Dues breakdown
  if (report.breakdown.dues.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Dues by Month", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Month", "Total"]],
      body: report.breakdown.dues.map((d) => [d.month, `₱${d.total.toLocaleString()}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: pageWidth / 2 + 5 },
    });
    y = getLastTableY(doc, y + 20);
    y += 8;
  }

  // Donations breakdown
  if (report.breakdown.donations.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Donations by Month", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Month", "Total"]],
      body: report.breakdown.donations.map((d) => [d.month, `₱${d.total.toLocaleString()}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: pageWidth / 2 + 5 },
    });
    y = getLastTableY(doc, y + 20);
    y += 8;
  }

  // Expenditures breakdown
  if (report.breakdown.expenditures.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Expenditures by Month", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Month", "Total"]],
      body: report.breakdown.expenditures.map((d) => [d.month, `₱${d.total.toLocaleString()}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: pageWidth / 2 + 5 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`Financial_Report_${report.filters.start}_to_${report.filters.end}.pdf`);
}

interface CollectionRateData {
  year: number;
  total_active_members: number;
  paid_members: number;
  collection_rate: string;
  total_collected: number;
  monthly: { month: string; count: number; amount: number }[];
}

export function generateCollectionRatePDF(data: CollectionRateData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("UP Alpha Sigma Fraternity Alumni Association", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("Collection Rate Report", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Year: ${data.year}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // Summary
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Summary", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Active Members", String(data.total_active_members)],
      ["Paid Members", String(data.paid_members)],
      ["Collection Rate", `${data.collection_rate}%`],
      ["Total Collected", `₱${data.total_collected.toLocaleString()}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: pageWidth / 2 + 5 },
  });
  y = getLastTableY(doc, y + 40);
  y += 10;

  // Monthly breakdown
  if (data.monthly && data.monthly.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Monthly Breakdown", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Month", "Members Paid", "Amount Collected", "Collection Rate"]],
      body: [
        ...data.monthly.map((m) => [
          m.month,
          String(m.count),
          `₱${m.amount.toLocaleString()}`,
          data.total_active_members > 0
            ? `${((m.count / data.total_active_members) * 100).toFixed(1)}%`
            : "0.0%",
        ]),
        [
          "Total",
          String(data.paid_members),
          `₱${data.total_collected.toLocaleString()}`,
          `${data.collection_rate}%`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`Collection_Rate_Report_${data.year}.pdf`);
}
