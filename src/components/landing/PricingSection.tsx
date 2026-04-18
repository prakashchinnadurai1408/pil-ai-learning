import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Sparkles, Rocket, Building2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  getMenuAccess,
  TIERS,
  TIER_META,
  menuLabels,
  type MenuAccessConfig,
  type Tier,
} from "@/hooks/useMenuAccessControls";
import PricingComparisonTable from "@/components/shared/PricingComparisonTable";

const PLAN_ICON: Record<Tier, typeof Crown> = {
  free: Sparkles,
  beginner: Rocket,
  advanced: Crown,
  enterprise: Building2,
};

const PricingSection = () => {
  const [menuAccess, setMenuAccess] = useState<MenuAccessConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMenuAccess("student").then((cfg) => {
      setMenuAccess(cfg);
      setLoading(false);
    });
  }, []);

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Choose the Plan That <span className="text-gradient-primary">Fits You</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free and upgrade anytime. Plans auto-sync with your admin's feature configuration.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {TIERS.map((t, i) => {
            const Icon = PLAN_ICON[t];
            const meta = TIER_META[t];
            const enabledCount = Object.values(menuAccess).filter((perTier) => perTier[t]).length;
            const totalCount = Object.keys(menuAccess).length;
            return (
              <motion.div
                key={t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-card rounded-xl p-6 border shadow-card hover:shadow-elevated transition-all flex flex-col ${
                  t === "advanced" ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
                }`}
              >
                {t === "advanced" && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-primary text-[10px] font-medium text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                  <h3 className={`font-display font-bold text-lg ${meta.color}`}>{meta.label}</h3>
                </div>
                <p className="text-2xl font-display font-bold text-card-foreground">{meta.price}</p>
                <p className="text-xs text-muted-foreground mb-4">{meta.tagline}</p>
                <p className="text-xs text-muted-foreground mb-4 inline-flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  {loading ? "—" : `${enabledCount} of ${totalCount} features`}
                </p>
                <Link to="/student-login" className="mt-auto">
                  <Button
                    variant={t === "advanced" ? "default" : "outline"}
                    className={`w-full ${t === "advanced" ? "bg-gradient-primary border-0 text-primary-foreground" : ""}`}
                  >
                    {t === "free" ? "Get Started" : t === "enterprise" ? "Contact Sales" : "Choose Plan"}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-xl border border-border shadow-card p-6"
        >
          <h3 className="font-display font-semibold text-lg text-card-foreground mb-4 text-center">
            Full Feature Comparison
          </h3>
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
          ) : (
            <PricingComparisonTable menuAccess={menuAccess} labels={menuLabels("student")} />
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
