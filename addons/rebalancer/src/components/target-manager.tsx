import { Button, Card, CardContent, CardHeader, CardTitle, Icons, Input } from "@wealthfolio/ui";
import React from "react";
import type { AllocationTarget, HoldingOption } from "../types";
import AddTargetForm from "./add-target-form";

interface TargetManagerProps {
  targets: AllocationTarget[];
  existingHoldings: HoldingOption[];
  onSave: (targets: AllocationTarget[]) => void;
  isSaving?: boolean;
}

export default ({ targets, existingHoldings, onSave, isSaving = false }: TargetManagerProps) => {
  const [editedTargets, setEditedTargets] = React.useState<AllocationTarget[]>(targets);

  // Sync with prop changes
  React.useEffect(() => {
    setEditedTargets(targets);
  }, [targets]);

  const totalTarget = editedTargets.reduce((sum, t) => sum + t.target, 0);
  const isValid = Math.abs(totalTarget - 100) < 0.1; // Allow for floating point precision

  const handleAddTarget = (assetClass: string, target: number) => {
    // Check if asset class already exists
    const existingIndex = editedTargets.findIndex((t) => t.assetClass === assetClass);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...editedTargets];
      updated[existingIndex] = { assetClass, target };
      setEditedTargets(updated);
    } else {
      // Add new
      setEditedTargets([...editedTargets, { assetClass, target }]);
    }
  };

  const handleRemoveTarget = (assetClass: string) => {
    setEditedTargets(editedTargets.filter((t) => t.assetClass !== assetClass));
  };

  const handleUpdateTarget = (assetClass: string, value: string) => {
    const targetValue = parseFloat(value);
    if (isNaN(targetValue)) return;

    // Round to one decimal place
    const roundedValue = Math.round(targetValue * 10) / 10;

    const updated = editedTargets.map((t) =>
      t.assetClass === assetClass ? { ...t, target: roundedValue } : t,
    );
    setEditedTargets(updated);
  };

  const handleSave = () => {
    if (isValid) {
      onSave(editedTargets);
    }
  };

  const handleReset = () => {
    setEditedTargets([]);
    onSave([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Target Allocation</CardTitle>
          {editedTargets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isSaving}>
              <Icons.Eraser className="mr-1 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing targets */}
        <div className="space-y-2">
          {editedTargets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No targets set. Add your first target allocation below.
            </p>
          ) : (
            editedTargets.map((target) => (
              <div key={target.assetClass} className="flex items-center gap-2">
                <div className="flex-1 text-sm font-medium">{target.assetClass}</div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={target.target}
                  onChange={(e) => handleUpdateTarget(target.assetClass, e.target.value)}
                  className="w-24 text-right"
                />
                <span className="text-sm">%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTarget(target.assetClass)}
                  className="h-8 w-8 p-0"
                >
                  <Icons.Close className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Total with validation */}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="font-semibold">Total</span>
          <span className={`font-semibold ${isValid ? "text-green-600" : "text-destructive"}`}>
            {totalTarget.toFixed(1)}%
          </span>
        </div>

        {!isValid && editedTargets.length > 0 && (
          <p className="text-destructive text-sm">
            Total must equal 100% to save. Currently {totalTarget > 100 ? "over" : "under"} by{" "}
            {Math.abs(totalTarget - 100).toFixed(1)}%
          </p>
        )}

        {/* Add new target */}
        <AddTargetForm
          existingTargets={editedTargets}
          existingHoldings={existingHoldings}
          onAddTarget={handleAddTarget}
        />

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="w-full"
          variant="default"
        >
          {isSaving ? "Saving..." : "Save Targets"}
        </Button>
      </CardContent>
    </Card>
  );
};
