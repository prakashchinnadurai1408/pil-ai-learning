import { useStudentModuleGroups } from "@/hooks/useModuleGroups";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Layers, BookOpen, Play, CheckCircle, ChevronRight, List } from "lucide-react";
import { useState } from "react";
import { modules } from "@/data/modules";
import { useAdminModules } from "@/hooks/useAdminModules";

interface Props {
  studentId: string | null;
  college: string;
  department: string;
  degree: string;
  filteredModules: typeof modules;
  filteredAdminModules: ReturnType<typeof useAdminModules>["adminModules"];
  onOpenModule: (id: number) => void;
}

const StudentModulesView = ({ studentId, college, department, degree, filteredModules, filteredAdminModules, onOpenModule }: Props) => {
  const { groups, loading } = useStudentModuleGroups(studentId, college, department, degree);
  const hasGroups = groups.length > 0;
  const [view, setView] = useState<"grouped" | "flat">(hasGroups ? "grouped" : "flat");

  const allKnown = [
    ...filteredModules.map((m) => ({ id: m.id, title: m.title, source: "static" as const, mod: m })),
    ...filteredAdminModules.map((m) => ({ id: m.id, title: m.title, source: "admin" as const, mod: m })),
  ];

  const renderModuleCard = (item: typeof allKnown[number]) => {
    if (item.source === "static") {
      const m = item.mod as typeof modules[number];
      const Icon = m.icon;
      return (
        <div key={`s-${m.id}`} className="bg-card rounded-lg border border-border p-4 shadow-card hover:shadow-elevated transition-all">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center`}>
              <Icon className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <h3 className="font-display font-semibold text-sm text-card-foreground mb-1">{m.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary p-0" onClick={() => onOpenModule(m.id)}>
            <Play className="h-3 w-3" /> Open <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      );
    } else {
      const m = item.mod as ReturnType<typeof useAdminModules>["adminModules"][number];
      return (
        <div key={`a-${m.id}`} className="bg-card rounded-lg border border-accent/20 p-4 shadow-card hover:shadow-elevated transition-all">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">New</span>
          </div>
          <h3 className="font-display font-semibold text-sm text-card-foreground mb-1">{m.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-accent p-0" onClick={() => onOpenModule(m.id)}>
            <Play className="h-3 w-3" /> Open <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      {hasGroups && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2 px-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span><strong className="text-foreground">{groups.length}</strong> module group(s) assigned to you</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={view === "grouped" ? "default" : "ghost"} className="h-7 text-xs gap-1" onClick={() => setView("grouped")}>
              <Layers className="h-3 w-3" /> Grouped
            </Button>
            <Button size="sm" variant={view === "flat" ? "default" : "ghost"} className="h-7 text-xs gap-1" onClick={() => setView("flat")}>
              <List className="h-3 w-3" /> Flat
            </Button>
          </div>
        </div>
      )}

      {hasGroups && view === "grouped" ? (
        <div className="space-y-6">
          {groups.map((g) => {
            const groupItems = g.items.map((it) => allKnown.find((m) => m.id === it.module_id)).filter(Boolean) as typeof allKnown;
            return (
              <div key={g.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold text-card-foreground">{g.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">{g.items.length} modules</Badge>
                  {g.description && <span className="text-xs text-muted-foreground">— {g.description}</span>}
                </div>
                {groupItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No modules in this group are available to you.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupItems.map(renderModuleCard)}
                  </div>
                )}
              </div>
            );
          })}
          {/* Modules NOT in any group */}
          {(() => {
            const groupedIds = new Set(groups.flatMap((g) => g.items.map((i) => i.module_id)));
            const ungrouped = allKnown.filter((m) => !groupedIds.has(m.id));
            if (ungrouped.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display font-semibold text-muted-foreground">Other Modules</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ungrouped.map(renderModuleCard)}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allKnown.map(renderModuleCard)}
        </div>
      )}
    </div>
  );
};

export default StudentModulesView;
