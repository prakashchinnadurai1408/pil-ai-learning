import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search, ChevronDown, ChevronRight, FileText, ExternalLink,
  CheckCircle, Monitor, BookOpen, FolderOpen, Github
} from "lucide-react";
import { techStream, nonTechStream } from "@/data/projectGuideData";

interface ProjectProgress {
  id: string;
  student_name: string;
  stream_id: string;
  completed_steps: Record<string, boolean>;
  completed_docs: Record<string, boolean>;
  github_url: string;
  updated_at: string;
}

interface ProjectDocument {
  id: string;
  student_name: string;
  stream_id: string;
  step_number: number;
  doc_code: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

interface StudentProjectSummary {
  studentName: string;
  streams: {
    streamId: string;
    streamTitle: string;
    totalSteps: number;
    completedStepCount: number;
    completedDocCount: number;
    totalDocCount: number;
    githubUrl: string;
    progress: ProjectProgress | null;
    documents: ProjectDocument[];
  }[];
}

const getStream = (id: string) => (id === "tech" ? techStream : nonTechStream);

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const TrainerProjectReview = () => {
  const [progressData, setProgressData] = useState<ProjectProgress[]>([]);
  const [documentsData, setDocumentsData] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [expandedStream, setExpandedStream] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [progRes, docRes] = await Promise.all([
        supabase.from("student_project_progress").select("*"),
        supabase.from("student_project_documents").select("*").order("uploaded_at", { ascending: false }),
      ]);
      if (progRes.data) setProgressData(progRes.data as ProjectProgress[]);
      if (docRes.data) setDocumentsData(docRes.data as ProjectDocument[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const studentSummaries = useMemo<StudentProjectSummary[]>(() => {
    const studentNames = new Set<string>();
    progressData.forEach((p) => studentNames.add(p.student_name));
    documentsData.forEach((d) => studentNames.add(d.student_name));

    return Array.from(studentNames)
      .sort()
      .map((name) => {
        const studentProgress = progressData.filter((p) => p.student_name === name);
        const studentDocs = documentsData.filter((d) => d.student_name === name);

        const streamIds = new Set<string>();
        studentProgress.forEach((p) => streamIds.add(p.stream_id));
        studentDocs.forEach((d) => streamIds.add(d.stream_id));

        const streams = Array.from(streamIds).map((sid) => {
          const stream = getStream(sid);
          const prog = studentProgress.find((p) => p.stream_id === sid) || null;
          const docs = studentDocs.filter((d) => d.stream_id === sid);

          const completedStepCount = prog
            ? Object.values(prog.completed_steps).filter(Boolean).length
            : 0;
          const completedDocCount = prog
            ? Object.values(prog.completed_docs).filter(Boolean).length
            : 0;
          const totalDocCount = stream.steps.reduce((sum, s) => sum + s.documents.length, 0);

          return {
            streamId: sid,
            streamTitle: stream.title,
            totalSteps: stream.steps.length,
            completedStepCount,
            completedDocCount,
            totalDocCount,
            githubUrl: prog?.github_url || "",
            progress: prog,
            documents: docs,
          };
        });

        return { studentName: name, streams };
      });
  }, [progressData, documentsData]);

  const filtered = useMemo(
    () =>
      searchQuery
        ? studentSummaries.filter((s) =>
            s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : studentSummaries,
    [studentSummaries, searchQuery]
  );

  const totalStudentsWithProjects = studentSummaries.length;
  const totalUploadsAll = documentsData.length;
  const avgCompletion = useMemo(() => {
    if (studentSummaries.length === 0) return 0;
    const perStudent = studentSummaries.map((s) => {
      const best = s.streams.reduce(
        (b, st) => Math.max(b, st.totalSteps > 0 ? Math.round((st.completedStepCount / st.totalSteps) * 100) : 0),
        0
      );
      return best;
    });
    return Math.round(perStudent.reduce((a, b) => a + b, 0) / perStudent.length);
  }, [studentSummaries]);

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from("project-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading project data...
      </div>
    );
  }

  if (studentSummaries.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
        <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h4 className="font-display font-semibold text-card-foreground mb-1">No Project Data Yet</h4>
        <p className="text-sm text-muted-foreground">
          Student project progress and uploads will appear here once students start working.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{totalStudentsWithProjects}</p>
            <p className="text-xs text-muted-foreground">Students with Projects</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{avgCompletion}%</p>
            <p className="text-xs text-muted-foreground">Avg Completion Rate</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{totalUploadsAll}</p>
            <p className="text-xs text-muted-foreground">Total Uploads</p>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <h3 className="font-display font-semibold text-card-foreground">
            Student Project Progress
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students match your search.
            </div>
          )}
          {filtered.map((student) => {
            const isExpanded = expandedStudent === student.studentName;
            const bestProgress = student.streams.reduce(
              (best, s) => Math.max(best, s.totalSteps > 0 ? Math.round((s.completedStepCount / s.totalSteps) * 100) : 0),
              0
            );
            const totalUploads = student.streams.reduce((sum, s) => sum + s.documents.length, 0);

            return (
              <div key={student.studentName}>
                <button
                  onClick={() => setExpandedStudent(isExpanded ? null : student.studentName)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                    {student.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-card-foreground">{student.studentName}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{student.streams.length} stream{student.streams.length !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{totalUploads} file{totalUploads !== 1 ? "s" : ""} uploaded</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 hidden sm:flex">
                      <Progress value={bestProgress} className="h-1.5 w-20" />
                      <span className="text-xs font-medium text-card-foreground w-8">{bestProgress}%</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {student.streams.map((stream) => {
                      const streamKey = `${student.studentName}-${stream.streamId}`;
                      const isStreamExpanded = expandedStream === streamKey;
                      const pct = stream.totalSteps > 0 ? Math.round((stream.completedStepCount / stream.totalSteps) * 100) : 0;
                      const StreamIcon = stream.streamId === "tech" ? Monitor : BookOpen;

                      return (
                        <div key={stream.streamId} className="border border-border rounded-lg">
                          <button
                            onClick={() => setExpandedStream(isStreamExpanded ? null : streamKey)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/20 transition-colors"
                          >
                            <StreamIcon className={`h-4 w-4 flex-shrink-0 ${stream.streamId === "tech" ? "text-primary" : "text-accent"}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-card-foreground">{stream.streamTitle}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{stream.completedStepCount}/{stream.totalSteps} steps</span>
                                <span>·</span>
                                <span>{stream.completedDocCount}/{stream.totalDocCount} docs checked</span>
                                <span>·</span>
                                <span>{stream.documents.length} file{stream.documents.length !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Progress value={pct} className="h-1.5 w-16" />
                              <span className="text-xs font-medium w-8">{pct}%</span>
                              {isStreamExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                          </button>

                          {isStreamExpanded && (
                            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                              {/* Step completion overview */}
                              <div>
                                <h6 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Step Completion</h6>
                                <div className="flex flex-wrap gap-2">
                                  {getStream(stream.streamId).steps.map((step) => {
                                    const done = stream.progress?.completed_steps?.[String(step.stepNumber)];
                                    return (
                                      <div
                                        key={step.stepNumber}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                          done
                                            ? "bg-success/10 text-success"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                      >
                                        {done && <CheckCircle className="h-3 w-3" />}
                                        Step {step.stepNumber}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Uploaded documents */}
                              {stream.documents.length > 0 && (
                                <div>
                                  <h6 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Uploaded Files ({stream.documents.length})
                                  </h6>
                                  <div className="space-y-1.5">
                                    {stream.documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/20 text-sm"
                                      >
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="flex-1 truncate text-foreground">{doc.file_name}</span>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">
                                          Step {doc.step_number}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">
                                          {formatSize(doc.file_size)}
                                        </span>
                                        <a
                                          href={getPublicUrl(doc.file_path)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:text-primary/80 flex-shrink-0"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {stream.documents.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">No files uploaded yet.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrainerProjectReview;
