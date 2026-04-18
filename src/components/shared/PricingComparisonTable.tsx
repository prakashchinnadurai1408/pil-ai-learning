import { CheckCircle } from "lucide-react";
import { TIERS, TIER_META, type Tier, type MenuAccessConfig } from "@/hooks/useMenuAccessControls";

interface Props {
  menuAccess: MenuAccessConfig;
  /** Optional: highlights the user's current tier column */
  currentTier?: Tier;
  /** Optional: pretty labels for menu_keys (falls back to title-cased key) */
  labels?: Record<string, string>;
  className?: string;
}

const prettify = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const PricingComparisonTable = ({ menuAccess, currentTier, labels, className }: Props) => {
  const rows = Object.entries(menuAccess);

  return (
    <div className={`overflow-x-auto -mx-2 px-2 ${className ?? ""}`}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium text-muted-foreground">Feature</th>
            {TIERS.map((t) => (
              <th
                key={t}
                className={`p-2 text-center font-display ${TIER_META[t].color} ${
                  t === currentTier ? "bg-muted/50 rounded-t" : ""
                }`}
              >
                {TIER_META[t].label}
                <br />
                <span className="text-[10px] text-muted-foreground font-normal">
                  {TIER_META[t].price}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={TIERS.length + 1} className="p-6 text-center text-muted-foreground">
                No features configured yet.
              </td>
            </tr>
          ) : (
            rows.map(([key, perTier]) => (
              <tr key={key} className="border-b border-border/30">
                <td className="p-2 text-card-foreground">{labels?.[key] ?? prettify(key)}</td>
                {TIERS.map((t) => (
                  <td key={t} className={`p-2 text-center ${t === currentTier ? "bg-muted/30" : ""}`}>
                    {perTier[t] ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success mx-auto" />
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PricingComparisonTable;
