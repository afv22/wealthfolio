import { AddonContext } from "@wealthfolio/addon-sdk";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Icons,
} from "@wealthfolio/ui";
import { useMemo, useState } from "react";
import { useAllocationTargets, usePortfolioAllocation } from "../hooks";
import { TargetManager } from "./target-manager";

interface HeaderActionsProps {
  ctx: AddonContext;
}

export const HeaderActions = ({ ctx }: HeaderActionsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: allocations = [] } = usePortfolioAllocation({ ctx });
  const { targets, updateTargets, isUpdating } = useAllocationTargets({ ctx });

  const handleSaveTargets = (newTargets: typeof targets) => {
    updateTargets(newTargets);
    setIsDialogOpen(false);
  };

  const existingHoldings = useMemo(() => {
    return allocations.map((a) => ({
      name: a.assetClass,
      symbol: a.symbol,
    }));
  }, [allocations]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icons.Settings className="mr-2 h-4 w-4" />
          Configure Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Target Allocations</DialogTitle>
        </DialogHeader>
        <TargetManager
          targets={targets}
          existingHoldings={existingHoldings}
          onSave={handleSaveTargets}
          isSaving={isUpdating}
        />
      </DialogContent>
    </Dialog>
  );
};
