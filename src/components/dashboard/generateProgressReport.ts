import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ReportProfile {
  name: string;
  email: string;
  mobile: string;
  college: string;
  location: string;
  degree: string;
  department: string;
  subscription_tier: string;
}

interface ReportStats {
  modulesCompleted: number;
  totalModules: number;
  assessmentsTaken: number;
  avgScore: number;
  challengesSolved: number;
  overallProgress: number;
}

interface ReportActivity {
  type: string;
  title: string;
  detail: string;
  date: string;
}

export const generateProgressReport = (
  profile: ReportProfile,
  stats: ReportStats,
  activities: ReportActivity[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header bar
  doc.setFillColor(37, 99, 235); // primary blue
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Student Progress Report", 14, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 30);

  y = 45;

  // Student info section
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Student Information", 14, y);
  y += 2;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(14, y, 80, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const info = [
    ["Name", profile.name],
    ["Email", profile.email],
    ["Mobile", profile.mobile],
    ["College", profile.college],
    ["Location", profile.location],
    ["Degree", profile.degree || "—"],
    ["Department", profile.department || "—"],
    ["Subscription", profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)],
  ];

  info.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 55, y);
    y += 6;
  });

  y += 6;

  // Stats section
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Learning Statistics", 14, y);
  y += 2;
  doc.setDrawColor(37, 99, 235);
  doc.line(14, y, 80, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Modules Completed", `${stats.modulesCompleted} / ${stats.totalModules}`],
      ["Overall Progress", `${stats.overallProgress}%`],
      ["Assessments Taken", String(stats.assessmentsTaken)],
      ["Average Score", `${stats.avgScore}%`],
      ["Coding Challenges Solved", String(stats.challengesSolved)],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Activity timeline
  if (activities.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("Recent Activity", 14, y);
    y += 2;
    doc.setDrawColor(37, 99, 235);
    doc.line(14, y, 70, y);
    y += 4;

    const activityRows = activities.slice(0, 15).map((a) => [
      a.type.charAt(0).toUpperCase() + a.type.slice(1),
      a.title,
      a.detail,
      a.date ? format(new Date(a.date), "MMM d, yyyy") : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Type", "Title", "Detail", "Date"]],
      body: activityRows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
      },
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `PIL AI Learning Platform — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`${profile.name.replace(/\s+/g, "_")}_Progress_Report.pdf`);
};
