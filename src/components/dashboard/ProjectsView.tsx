import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Monitor, BookOpen, ArrowLeft, CheckCircle, ChevronDown, ChevronRight,
  FileText, Clock, Target, AlertCircle, Lightbulb, Layers
} from "lucide-react";
import { techStream, nonTechStream, type ProjectStream, type ProjectStep } from "@/data/projectGuideData";
import { useProjectDocuments } from "@/hooks/useProjectDocuments";
import StepFileUpload from "./StepFileUpload";

const ProjectsView = () => {
  const [selectedStream, setSelectedStream] = useState<ProjectStream | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [completedDocs, setCompletedDocs] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const toggleDoc = (key: string) => {
    setCompletedDocs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const markStepDone = (stepNum: number) => {
    setCompletedSteps(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const completedStepCount = selectedStream
    ? selectedStream.steps.filter(s => completedSteps[s.stepNumber]).length
    : 0;

  const overallProgress = selectedStream
    ? Math.round((completedStepCount / selectedStream.steps.length) * 100)
    : 0;

  // Stream selection screen
  if (!selectedStream) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="font-display font-bold text-xl text-foreground mb-2">College Academic Project Guide</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Complete step-by-step guide for your college project. Choose your stream to get started.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Tech Stream */}
          <button
            onClick={() => setSelectedStream(techStream)}
            className="group bg-card rounded-xl border-2 border-border p-6 shadow-card hover:shadow-elevated hover:border-primary/40 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Monitor className="h-7 w-7 text-primary" />
            </div>
            <h4 className="font-display font-bold text-lg text-card-foreground mb-1">Tech Project Stream</h4>
            <p className="text-sm text-primary font-medium mb-2">8 Steps · Software / IT / Engineering</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Covers: Project Documents, Coding & Compilation, Testing & Execution, Demonstration
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Get Started <ChevronRight className="h-3 w-3" />
            </div>
          </button>

          {/* Non-Tech Stream */}
          <button
            onClick={() => setSelectedStream(nonTechStream)}
            className="group bg-card rounded-xl border-2 border-border p-6 shadow-card hover:shadow-elevated hover:border-accent/40 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <BookOpen className="h-7 w-7 text-accent" />
            </div>
            <h4 className="font-display font-bold text-lg text-card-foreground mb-1">Non-Tech Project Stream</h4>
            <p className="text-sm text-accent font-medium mb-2">7 Steps · Commerce / Arts / Management</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Covers: Research Proposal, Data Collection, Analysis, Report Writing, Presentation
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              Get Started <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  const isTech = selectedStream.id === "tech";
  const accentClass = isTech ? "text-primary" : "text-accent";
  const accentBg = isTech ? "bg-primary/10" : "bg-accent/10";
  const accentBorder = isTech ? "border-primary/30" : "border-accent/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">{selectedStream.title}</h3>
          <p className="text-sm text-muted-foreground">{selectedStream.subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedStream(null);
            setExpandedStep(null);
            setCompletedDocs({});
            setCompletedSteps({});
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Change Stream
        </Button>
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-lg border border-border p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-card-foreground">Overall Progress</span>
          <span className={`text-lg font-display font-bold ${accentClass}`}>
            {completedStepCount}/{selectedStream.steps.length} steps · {overallProgress}%
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {selectedStream.steps.map((step) => (
          <StepCard
            key={step.stepNumber}
            step={step}
            isExpanded={expandedStep === step.stepNumber}
            isCompleted={!!completedSteps[step.stepNumber]}
            completedDocs={completedDocs}
            accentClass={accentClass}
            accentBg={accentBg}
            accentBorder={accentBorder}
            isTech={isTech}
            onToggleExpand={() => setExpandedStep(expandedStep === step.stepNumber ? null : step.stepNumber)}
            onToggleDoc={toggleDoc}
            onMarkStepDone={() => markStepDone(step.stepNumber)}
          />
        ))}
      </div>
    </div>
  );
};

interface StepCardProps {
  step: ProjectStep;
  isExpanded: boolean;
  isCompleted: boolean;
  completedDocs: Record<string, boolean>;
  accentClass: string;
  accentBg: string;
  accentBorder: string;
  isTech: boolean;
  onToggleExpand: () => void;
  onToggleDoc: (key: string) => void;
  onMarkStepDone: () => void;
}

const StepCard = ({
  step, isExpanded, isCompleted, completedDocs,
  accentClass, accentBg, accentBorder, isTech,
  onToggleExpand, onToggleDoc, onMarkStepDone,
}: StepCardProps) => {
  const docsDone = step.documents.filter(d => completedDocs[`${step.stepNumber}-${d.code}`]).length;

  return (
    <div className={`bg-card rounded-lg border shadow-card transition-all ${
      isCompleted ? "border-success/40 bg-success/5" : isExpanded ? accentBorder : "border-border"
    }`}>
      {/* Collapsed header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm ${
          isCompleted
            ? "bg-success text-white"
            : `${accentBg} ${accentClass}`
        }`}>
          {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.stepNumber.toString().padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-card-foreground text-sm">
            Step {step.stepNumber} — {step.title}
          </h4>
          <p className="text-xs text-muted-foreground truncate">{step.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">
            <Clock className="h-3 w-3 inline mr-1" />{step.duration}
          </span>
          {step.documents.length > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              <FileText className="h-3 w-3 inline mr-1" />{docsDone}/{step.documents.length} docs
            </span>
          )}
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* What Happens */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> What Happens
            </h5>
            <ul className="space-y-2">
              {step.whatHappens.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isTech ? "bg-primary" : "bg-accent"}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Documents */}
          {step.documents.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Documents to Capture
              </h5>
              <div className="space-y-2">
                {step.documents.map((doc) => {
                  const docKey = `${step.stepNumber}-${doc.code}`;
                  const isDone = !!completedDocs[docKey];
                  return (
                    <button
                      key={docKey}
                      onClick={() => onToggleDoc(docKey)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left text-sm transition-colors ${
                        isDone
                          ? "border-success/30 bg-success/5"
                          : "border-border hover:border-primary/20"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isDone ? "bg-success text-white" : "bg-muted"
                      }`}>
                        {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold text-muted-foreground">{doc.code}</span>}
                      </div>
                      <div>
                        <span className={`font-medium ${isDone ? "text-success line-through" : "text-foreground"}`}>
                          {doc.title}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Info / Tips */}
          {step.additionalInfo && step.additionalInfo.length > 0 && (
            <div className={`rounded-lg p-3 ${accentBg}`}>
              <h5 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${accentClass}`}>
                <Lightbulb className="h-3.5 w-3.5" /> Tips & Notes
              </h5>
              <ul className="space-y-1">
                {step.additionalInfo.map((info, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    {info}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer: Deliverable + Mark Complete */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span>Deliverable: <strong className="text-foreground">{step.deliverable}</strong></span>
              <span>·</span>
              <span>{step.duration}</span>
            </div>
            <Button
              size="sm"
              variant={isCompleted ? "outline" : "default"}
              className={`h-8 text-xs gap-1.5 ${isCompleted ? "border-success text-success hover:bg-success/10" : ""}`}
              onClick={onMarkStepDone}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {isCompleted ? "Completed" : "Mark Complete"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
