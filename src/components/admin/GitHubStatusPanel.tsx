import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Github, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, GitCommit, Clock } from "lucide-react";

const REPO = "prakashchinnadurai1408/pil-ai-learning";
const REPO_URL = `https://github.com/${REPO}`;
const API_URL = `https://api.github.com/repos/${REPO}`;

type Commit = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string; avatar_url: string; html_url: string } | null;
};

type RepoMeta = { default_branch: string; pushed_at: string; private: boolean; html_url: string };

const LOVABLE_AUTHORS = ["lovable", "lovable-dev", "gpt-engineer-app[bot]", "lovable-app[bot]"];

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const GitHubStatusPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repo, setRepo] = useState<RepoMeta | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c] = await Promise.all([
        fetch(API_URL),
        fetch(`${API_URL}/commits?per_page=5`),
      ]);
      if (r.status === 404) throw new Error("Repository not found or is private without access.");
      if (!r.ok) throw new Error(`GitHub API returned ${r.status}`);
      if (!c.ok) throw new Error(`Commits API returned ${c.status}`);
      setRepo(await r.json());
      setCommits(await c.json());
      setCheckedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Failed to reach GitHub");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const lastPush = repo?.pushed_at ? new Date(repo.pushed_at) : null;
  const minsSincePush = lastPush ? (Date.now() - lastPush.getTime()) / 60000 : Infinity;
  const hasLovableCommit = commits.some((c) => {
    const login = c.author?.login?.toLowerCase() || "";
    const name = c.commit.author?.name?.toLowerCase() || "";
    return LOVABLE_AUTHORS.some((a) => login.includes(a) || name.includes("lovable"));
  });

  const status: { tone: "success" | "warning" | "destructive"; label: string; detail: string } =
    error
      ? { tone: "destructive", label: "Unable to verify", detail: error }
      : !repo
        ? { tone: "warning", label: "Checking…", detail: "Contacting GitHub" }
        : hasLovableCommit && minsSincePush < 60 * 24 * 7
          ? { tone: "success", label: "Connected & syncing", detail: `Lovable has pushed commits in the last ${timeAgo(repo.pushed_at)}.` }
          : hasLovableCommit
            ? { tone: "warning", label: "Connected (idle)", detail: `Last Lovable activity ${timeAgo(repo.pushed_at)}. Make a change in Lovable to confirm sync.` }
            : { tone: "warning", label: "Repo reachable — sync unverified", detail: "No recent Lovable-authored commits found. The integration may not be connected, or recent edits haven't been made." };

  const toneClass =
    status.tone === "success" ? "border-success/40 bg-success/10 text-success"
    : status.tone === "destructive" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-warning/40 bg-warning/10 text-warning";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2"><Github className="h-5 w-5" /> GitHub Connection</span>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-1.5">Refresh</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Live status of your project's sync with <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{REPO}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
            <div className="flex items-center gap-2 font-semibold">
              {status.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {status.label}
            </div>
            <p className="text-xs mt-1 opacity-90">{status.detail}</p>
          </div>

          {repo && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Repository</dt>
                <dd className="font-mono text-xs flex items-center gap-1.5">
                  {REPO}
                  <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Default branch</dt>
                <dd><Badge variant="outline" className="font-mono text-xs">{repo.default_branch}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Visibility</dt>
                <dd><Badge variant={repo.private ? "secondary" : "outline"} className="text-xs">{repo.private ? "Private" : "Public"}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last push</dt>
                <dd className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(repo.pushed_at)}</dd>
              </div>
            </dl>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Couldn't reach GitHub</AlertTitle>
              <AlertDescription className="text-xs">
                {error}. If the repo is private, the public API can't verify it — check the repository directly.
              </AlertDescription>
            </Alert>
          )}

          {checkedAt && (
            <p className="text-[10px] text-muted-foreground">Last checked {timeAgo(checkedAt.toISOString())}</p>
          )}
        </CardContent>
      </Card>

      {commits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitCommit className="h-4 w-4" /> Recent commits
            </CardTitle>
            <CardDescription className="text-xs">Latest 5 commits on the default branch</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {commits.map((c) => {
                const isLovable = LOVABLE_AUTHORS.some((a) =>
                  (c.author?.login || "").toLowerCase().includes(a) ||
                  (c.commit.author?.name || "").toLowerCase().includes("lovable")
                );
                return (
                  <li key={c.sha} className="flex items-start gap-3 text-sm border-b last:border-b-0 pb-3 last:pb-0">
                    {c.author?.avatar_url && (
                      <img src={c.author.avatar_url} alt="" className="h-6 w-6 rounded-full mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <a href={c.html_url} target="_blank" rel="noreferrer" className="font-medium hover:underline line-clamp-1">
                        {c.commit.message.split("\n")[0]}
                      </a>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <span>{c.author?.login || c.commit.author.name}</span>
                        {isLovable && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Lovable</Badge>}
                        <span>·</span>
                        <span>{timeAgo(c.commit.author.date)}</span>
                        <span className="font-mono opacity-60">{c.sha.slice(0, 7)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GitHubStatusPanel;
