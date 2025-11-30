import { Button, Card, CardContent, CardHeader, CardTitle, Icons, Input } from "@wealthfolio/ui";
import React from "react";
import type { AllocationTarget, HoldingOption } from "../types";

interface TargetManagerProps {
  targets: AllocationTarget[];
  existingHoldings: HoldingOption[];
  onSave: (targets: AllocationTarget[]) => void;
  isSaving?: boolean;
}

export default ({ targets, existingHoldings, onSave, isSaving = false }: TargetManagerProps) => {
  const [editedTargets, setEditedTargets] = React.useState<AllocationTarget[]>(targets);
  const [newAssetClass, setNewAssetClass] = React.useState("");
  const [newTarget, setNewTarget] = React.useState("");
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
  const isValid = Math.abs(totalTarget - 100) < 0.1; // Allow for floating point precision

  const handleAddTarget = () => {
    const targetValue = parseFloat(newTarget);

    if (!newAssetClass.trim() || isNaN(targetValue) || targetValue < 0 || targetValue > 100) {
      return;
    }

    // Round to one decimal place
    const roundedValue = Math.floor(targetValue * 10) / 10;

    // Check if asset class already exists
    const existingIndex = editedTargets.findIndex((t) => t.assetClass === newAssetClass);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...editedTargets];
      updated[existingIndex] = { assetClass: newAssetClass, target: roundedValue };
      setEditedTargets(updated);
    } else {
      // Add new
      setEditedTargets([...editedTargets, { assetClass: newAssetClass, target: roundedValue }]);
    }

    // Reset form
    setNewAssetClass("");
    setNewTarget("");
    setShowDropdown(false);
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

  const handleSelectHolding = (holding: string) => {
    setNewAssetClass(holding);
    setShowDropdown(false);
  };

  const handleCustomInput = () => {
    setShowDropdown(false);
  };

  const handleReset = () => {
    setEditedTargets([]);
    onSave([]);
  };

  // Filter holdings based on search input
  const filteredHoldings = React.useMemo(() => {
    const searchTerm = newAssetClass.toLowerCase().trim();

    // Filter out already added holdings
    const available = existingHoldings.filter(
      (h) => !editedTargets.some((t) => t.assetClass === h.name),
    );

    // If no search term, return all available
    if (!searchTerm) return available;

    // Filter by name or symbol containing the search term
    return available.filter((h) => {
      const nameMatch = h.name.toLowerCase().includes(searchTerm);
      const symbolMatch = h.symbol?.toLowerCase().includes(searchTerm);
      return nameMatch || symbolMatch;
    });
  }, [existingHoldings, editedTargets, newAssetClass]);

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
                  placeholder="Select or enter asset class"
                  value={newAssetClass}
                  onChange={(e) => {
                    setNewAssetClass(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={() => setShowDropdown(!showDropdown)}>
                  <Icons.ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Dropdown menu */}
              {showDropdown && (
                <div className="bg-background absolute z-10 mt-1 w-full rounded-md border shadow-lg">
                  <div className="max-h-48 overflow-y-auto">
                    {filteredHoldings.length > 0 ? (
                      <>
                        {filteredHoldings.map((holding) => (
                          <button
                            key={holding.name}
                            className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                            onClick={() => handleSelectHolding(holding.name)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{holding.name}</span>
                              {holding.symbol && (
                                <span className="text-muted-foreground text-xs">
                                  {holding.symbol}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                        {newAssetClass.trim() && (
                          <div className="border-t">
                            <button
                              className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                              onClick={handleCustomInput}
                            >
                              <span className="font-medium">+ Add "{newAssetClass}" as custom</span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      newAssetClass.trim() && (
                        <button
                          className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                          onClick={handleCustomInput}
                        >
                          <span className="font-medium">+ Add "{newAssetClass}" as custom</span>
                        </button>
                      )
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
};
