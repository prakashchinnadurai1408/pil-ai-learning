import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Award, Code2, Hash } from "lucide-react";

interface LeaderboardEntry {
  student_name: string;
  solved_count: number;
  last_solved: string;
}

const rankIcons = [
  <Trophy className="h-5 w-5 text-warning" />,
  <Medal className="h-5 w-5 text-muted-foreground" />,
  <Award className="h-5 w-5 text-primary" />,
];

const CodingLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currentStudent = sessionStorage.getItem("studentName") || "";

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);
    const { data } = await supabase
      .from("student_solved_challenges")
      .select("student_name, solved_at");

    if (data) {
      const map = new Map<string, { count: number; last: string }>();
      data.forEach((row: any) => {
        const existing = map.get(row.student_name);
        if (existing) {
          existing.count++;
          if (row.solved_at > existing.last) existing.last = row.solved_at;
        } else {
          map.set(row.student_name, { count: 1, last: row.solved_at });
        }
      });

      const sorted = Array.from(map.entries())
        .map(([name, val]) => ({ student_name: name, solved_count: val.count, last_solved: val.last }))
        .sort((a, b) => b.solved_count - a.solved_count || a.last_solved.localeCompare(b.last_solved));

      setEntries(sorted);
    }
    setLoading(false);
  }

  const currentRank = entries.findIndex(e => e.student_name === currentStudent) + 1;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-primary" />
          Coding Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentStudent && currentRank > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">Your Rank</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-primary">#{currentRank}</span>
              <span className="text-sm text-muted-foreground">
                · {entries[currentRank - 1]?.solved_count} solved
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Code2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No challenges solved yet</p>
            <p className="text-xs">Be the first to solve a challenge!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {entries.map((entry, i) => {
                const isCurrentUser = entry.student_name === currentStudent;
                return (
                  <div
                    key={entry.student_name}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isCurrentUser ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-8 flex justify-center">
                      {i < 3 ? rankIcons[i] : (
                        <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCurrentUser ? "text-primary" : "text-card-foreground"}`}>
                        {entry.student_name}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Hash className="h-3 w-3" />
                      {entry.solved_count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default CodingLeaderboard;
