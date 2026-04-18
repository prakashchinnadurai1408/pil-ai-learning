import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { menuLabels, type MenuAccessConfig, type Tier } from "@/hooks/useMenuAccessControls";
import PricingComparisonTable from "@/components/shared/PricingComparisonTable";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  menuAccess: MenuAccessConfig;
  currentTier: Tier;
}

const TrainerUpgradeDialog = ({ open, onOpenChange, menuAccess, currentTier }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-warning" /> Upgrade Your Trainer Plan
        </DialogTitle>
      </DialogHeader>
      <p className="text-xs text-muted-foreground -mt-2">
        Compare what's included in each Trainer tier. Contact your Admin to upgrade.
      </p>
      <PricingComparisonTable
        menuAccess={menuAccess}
        currentTier={currentTier}
        labels={menuLabels("trainer")}
      />
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
          Maybe Later
        </Button>
        <Button
          className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90 gap-2"
          onClick={() => {
            onOpenChange(false);
            toast.info("Contact your administrator to upgrade your trainer subscription.");
          }}
        >
          <Crown className="h-4 w-4" /> Contact Admin to Upgrade
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default TrainerUpgradeDialog;
