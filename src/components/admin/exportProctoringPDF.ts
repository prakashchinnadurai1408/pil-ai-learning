import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProcSummary {
  student_name: string;
  assessment_id: string;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  face_not_detected_count: number;
  multiple_faces_count: number;
  eye_movement_violations: number;
  photos_captured: number;
  proctoring_score: number;
  status: string;
  created_at: string;
}

interface Assessment {
  id: string;
  title: string;
}

export const exportProctoringPDF = async (summaries: ProcSummary[], assessments: Assessment[]) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Proctoring Analytics Report", pageW / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Sessions: ${summaries.length}`, pageW / 2, 26, { align: "center" });

  // Summary stats
  const good = summaries.filter(s => s.status === "Good").length;
  const avg = summaries.filter(s => s.status === "Average").length;
  const poor = summaries.filter(s => s.status === "Poor").length;
  const avgScore = summaries.length > 0 ? Math.round(summaries.reduce((a, s) => a + s.proctoring_score, 0) / summaries.length) : 0;

  doc.setFontSize(11);
  doc.text(`Good: ${good}  |  Average: ${avg}  |  Poor: ${poor}  |  Avg Score: ${avgScore}%`, pageW / 2, 34, { align: "center" });

  // Main table
  const rows = summaries.map(s => {
    const assessment = assessments.find(a => a.id === s.assessment_id);
    return [
      s.student_name,
      assessment?.title || "—",
      s.tab_switch_count.toString(),
      s.fullscreen_exit_count.toString(),
      s.face_not_detected_count.toString(),
      s.multiple_faces_count.toString(),
      s.eye_movement_violations.toString(),
      s.photos_captured.toString(),
      `${s.proctoring_score}%`,
      s.status,
      new Date(s.created_at).toLocaleDateString(),
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [["Student", "Assessment", "Tab Sw", "FS Exit", "No Face", "Multi Face", "Eye Viol", "Photos", "Score", "Status", "Date"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      8: { fontStyle: "bold" },
      9: { fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 9) {
        const val = data.cell.raw as string;
        if (val === "Good") data.cell.styles.textColor = [34, 197, 94];
        else if (val === "Average") data.cell.styles.textColor = [234, 179, 8];
        else data.cell.styles.textColor = [239, 68, 68];
      }
    },
  });

  // Per-student detail pages
  const studentGroups = new Map<string, ProcSummary[]>();
  summaries.forEach(s => {
    const existing = studentGroups.get(s.student_name) || [];
    existing.push(s);
    studentGroups.set(s.student_name, existing);
  });

  studentGroups.forEach((studentSummaries, name) => {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Student Detail: ${name}`, 14, 18);

    const totalViolations = studentSummaries.reduce((acc, s) =>
      acc + s.tab_switch_count + s.fullscreen_exit_count + s.face_not_detected_count + s.multiple_faces_count + s.eye_movement_violations, 0);
    const studentAvg = Math.round(studentSummaries.reduce((a, s) => a + s.proctoring_score, 0) / studentSummaries.length);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Sessions: ${studentSummaries.length}  |  Avg Score: ${studentAvg}%  |  Total Violations: ${totalViolations}`, 14, 26);

    // Violation breakdown
    const violationData = studentSummaries.map(s => {
      const assessment = assessments.find(a => a.id === s.assessment_id);
      return [
        assessment?.title || "—",
        s.tab_switch_count.toString(),
        s.fullscreen_exit_count.toString(),
        s.face_not_detected_count.toString(),
        s.multiple_faces_count.toString(),
        s.eye_movement_violations.toString(),
        `${s.proctoring_score}%`,
        s.status,
        new Date(s.created_at).toLocaleString(),
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [["Assessment", "Tab Sw", "FS Exit", "No Face", "Multi Face", "Eye Viol", "Score", "Status", "Date/Time"]],
      body: violationData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    });
  });

  doc.save("proctoring-report.pdf");
};
