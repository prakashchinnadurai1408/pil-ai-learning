import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Unlock, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  useMenuAccessControls,
  TIERS,
  TIER_META,
  type Audience,
  type Tier,
} from "@/hooks/useMenuAccessControls";

const AudiencePanel = ({ audience }: { audience: Audience }) => {
  const { rows, updateAccess, loading } = useMenuAccessControls(audience);

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="p-3 font-medium">Menu</th>
            {TIERS.map((t) => (
              <th key={t} className="p-3 font-medium text-center min-w-[110px]">
                <span className={TIER_META[t].color}>{TIER_META[t].label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.menu_key} className="border-b border-border/50">
              <td className="p-3 text-sm text-card-foreground">
                <div className="flex items-center gap-2">
                  {r.free || r.beginner || r.advanced || r.enterprise
                    ? <Unlock className="h-3.5 w-3.5 text-success" />
                    : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  {r.label}
                </div>
              </td>
              {TIERS.map((t) => (
                <td key={t} className="p-3 text-center">
                  <Switch
                    checked={r[t]}
                    onCheckedChange={(v) => {
                      updateAccess(r.menu_key, t, v);
                      toast.success(`${r.label} ${v ? "enabled" : "disabled"} for ${TIER_META[t].label}`);
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MenuAccessControls = () => {
  const [tab, setTab] = useState<Audience>("student");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Settings className="h-4 w-4" /> Menu Access Controls
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Toggle which dashboard menus are accessible per subscription tier. Changes apply instantly to live users.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Audience)}>
          <TabsList className="mb-4">
            <TabsTrigger value="student">Student Menus</TabsTrigger>
            <TabsTrigger value="trainer">Trainer Menus</TabsTrigger>
          </TabsList>
          <TabsContent value="student"><AudiencePanel audience="student" /></TabsContent>
          <TabsContent value="trainer"><AudiencePanel audience="trainer" /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MenuAccessControls;
