import { Button, Card, CardContent, CardHeader, CardTitle, Icons, Input } from "@wealthfolio/ui";
import React from "react";
import type { AllocationTarget } from "../hooks/use-allocation-targets";

interface TargetManagerProps {
  targets: AllocationTarget[];
  existingHoldings: string[];
  onSave: (targets: AllocationTarget[]) => void;
  isSaving?: boolean;
}

export function TargetManager({
  targets,
  existingHoldings,
  onSave,
  isSaving = false,
}: TargetManagerProps) {
  const [editedTargets, setEditedTargets] = React.useState<AllocationTarget[]>(targets);
  const [newAssetClass, setNewAssetClass] = React.useState("");
  const [newTarget, setNewTarget] = React.useState("");
  const [isCustom, setIsCustom] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync with prop changes
  React.useEffect(() => {
    setEditedTargets(targets);
  }, [targets]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalTarget = editedTargets.reduce((sum, t) => sum + t.target, 0);
  const isValid = Math.abs(totalTarget - 100) < 0.01; // Allow for floating point precision

  const handleAddTarget = () => {
    const assetClass = isCustom ? newAssetClass : newAssetClass;
    const targetValue = parseFloat(newTarget);

    if (!assetClass.trim() || isNaN(targetValue) || targetValue < 0 || targetValue > 100) {
      return;
    }

    // Check if asset class already exists
    const existingIndex = editedTargets.findIndex((t) => t.assetClass === assetClass);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...editedTargets];
      updated[existingIndex] = { assetClass, target: targetValue };
      setEditedTargets(updated);
    } else {
      // Add new
      setEditedTargets([...editedTargets, { assetClass, target: targetValue }]);
    }

    // Reset form
    setNewAssetClass("");
    setNewTarget("");
    setIsCustom(false);
    setShowDropdown(false);
  };

  const handleRemoveTarget = (assetClass: string) => {
    setEditedTargets(editedTargets.filter((t) => t.assetClass !== assetClass));
  };

  const handleUpdateTarget = (assetClass: string, value: string) => {
    const targetValue = parseFloat(value);
    if (isNaN(targetValue)) return;

    const updated = editedTargets.map((t) =>
      t.assetClass === assetClass ? { ...t, target: targetValue } : t,
    );
    setEditedTargets(updated);
  };

  const handleSave = () => {
    if (isValid) {
      onSave(editedTargets);
    }
  };

  const handleSelectHolding = (holding: string) => {
    setNewAssetClass(holding);
    setIsCustom(false);
    setShowDropdown(false);
  };

  const handleCustomInput = () => {
    setIsCustom(true);
    setShowDropdown(false);
  };

  const handleReset = () => {
    setEditedTargets([]);
    onSave([]);
  };

  // Filter out already added holdings
  const availableHoldings = existingHoldings.filter(
    (h) => !editedTargets.some((t) => t.assetClass === h),
  );

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
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-sm font-semibold">Add Target</h4>

          <div className="space-y-2">
            {/* Asset class selector */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-2">
                <Input
                  placeholder={
                    isCustom ? "Enter custom asset class" : "Select or enter asset class"
                  }
                  value={newAssetClass}
                  onChange={(e) => setNewAssetClass(e.target.value)}
                  onFocus={() => !isCustom && setShowDropdown(true)}
                  className="flex-1"
                />
                {!isCustom && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <Icons.ChevronDown className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Dropdown menu */}
              {showDropdown && !isCustom && (
                <div className="bg-background absolute z-10 mt-1 w-full rounded-md border shadow-lg">
                  <div className="max-h-48 overflow-y-auto">
                    {availableHoldings.length > 0 ? (
                      <>
                        {availableHoldings.map((holding) => (
                          <button
                            key={holding}
                            className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                            onClick={() => handleSelectHolding(holding)}
                          >
                            {holding}
                          </button>
                        ))}
                        <div className="border-t">
                          <button
                            className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                            onClick={handleCustomInput}
                          >
                            <span className="font-medium">+ Enter custom asset class</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                        onClick={handleCustomInput}
                      >
                        <span className="font-medium">+ Enter custom asset class</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Target percentage input */}
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Target %"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddTarget} disabled={!newAssetClass.trim() || !newTarget}>
                <Icons.Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

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
}
