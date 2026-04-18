import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportData {
  stats: {
    totalAttempts: number;
    uniqueStudents: number;
    avgScore: number;
    passRate: number;
    maxScore: number;
    minScore: number;
  } | null;
  rankings: {
    name: string;
    college: string;
    bestScore: number;
    avgScore: number;
    attempts: number;
  }[];
  scoreDistribution: { range: string; count: number }[];
  assessmentPerformance: { name: string; avgScore: number; attempts: number }[];
  questionStats: {
    questionNumber: number;
    question: string;
    correctRate: number;
    correctCount: number;
    totalAnswered: number;
    mostCommonWrong: number;
    mostCommonWrongCount: number;
    options: string[];
  }[];
  aiDiagnostics: string | null;
  reportTitle: string;
}

export function exportAnalyticsPDF(data: ExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addHeader = (text: string, size = 14) => {
    if (y > 260) { doc.addPage(); y = margin; }
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(text, margin, y);
    y += size * 0.5 + 2;
    // underline
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
  };

  const addSubHeader = (text: string) => {
    if (y > 265) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text(text, margin, y);
    y += 7;
  };

  const addText = (text: string, size = 9) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size * 0.45 + 1;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Assessment Diagnostic Report", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`${data.reportTitle} • Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
  y += 12;

  // Stats Overview
  if (data.stats) {
    addHeader("Performance Overview");
    const s = data.stats;
    const statsRows = [
      ["Total Attempts", String(s.totalAttempts), "Unique Candidates", String(s.uniqueStudents)],
      ["Average Score", `${s.avgScore}%`, "Pass Rate", `${s.passRate}%`],
      ["Highest Score", `${s.maxScore}%`, "Lowest Score", `${s.minScore}%`],
    ];
    autoTable(doc, {
      startY: y,
      body: statsRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [240, 245, 255] },
        2: { fontStyle: "bold", fillColor: [240, 245, 255] },
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Score Distribution
  if (data.scoreDistribution.some(s => s.count > 0)) {
    addHeader("Score Distribution");
    autoTable(doc, {
      startY: y,
      head: [["Score Range", "Candidates", "Bar"]],
      body: data.scoreDistribution.map(s => {
        const maxCount = Math.max(...data.scoreDistribution.map(d => d.count), 1);
        const bar = "█".repeat(Math.round((s.count / maxCount) * 20)) || "░";
        return [s.range, String(s.count), bar];
      }),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Assessment Performance
  if (data.assessmentPerformance.length > 0) {
    addHeader("Assessment-wise Performance");
    autoTable(doc, {
      startY: y,
      head: [["Assessment", "Avg Score", "Attempts"]],
      body: data.assessmentPerformance.map(a => [a.name, `${a.avgScore}%`, String(a.attempts)]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Student Rankings
  if (data.rankings.length > 0) {
    addHeader("Candidate Rankings");
    autoTable(doc, {
      startY: y,
      head: [["Rank", "Candidate", "Institute", "Best Score", "Avg Score", "Attempts"]],
      body: data.rankings.map((r, i) => [
        String(i + 1),
        r.name,
        r.college,
        `${r.bestScore}%`,
        `${r.avgScore}%`,
        String(r.attempts),
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Question-Level Analytics
  if (data.questionStats.length > 0) {
    if (y > 200) { doc.addPage(); y = margin; }
    addHeader("Question-Level Analytics");
    addText("Questions sorted by difficulty (hardest first):");
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["Q#", "Question", "Correct %", "Correct/Total", "Common Wrong Answer"]],
      body: data.questionStats
        .sort((a, b) => a.correctRate - b.correctRate)
        .map(q => {
          let wrongAnswer = "—";
          if (q.mostCommonWrong >= 0 && q.options[q.mostCommonWrong]) {
            wrongAnswer = `"${q.options[q.mostCommonWrong]}" (${q.mostCommonWrongCount})`;
          }
          return [
            String(q.questionNumber),
            q.question.length > 80 ? q.question.slice(0, 77) + "..." : q.question,
            `${q.correctRate}%`,
            `${q.correctCount}/${q.totalAnswered}`,
            wrongAnswer,
          ];
        }),
      theme: "striped",
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 65 },
        2: { cellWidth: 18 },
        3: { cellWidth: 22 },
        4: { cellWidth: 45 },
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // AI Diagnostics
  if (data.aiDiagnostics) {
    if (y > 100) { doc.addPage(); y = margin; }
    addHeader("AI Diagnostic Report");
    const lines = data.aiDiagnostics.split("\n");
    for (const line of lines) {
      if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("**")) {
        const clean = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
        addSubHeader(clean);
      } else if (line.startsWith("- ")) {
        addText(`  •  ${line.slice(2)}`);
      } else if (line.trim()) {
        addText(line);
      } else {
        y += 3;
      }
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: "center" });
    doc.text("PIL AI Learning Platform", margin, 290);
  }

  doc.save(`assessment-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
