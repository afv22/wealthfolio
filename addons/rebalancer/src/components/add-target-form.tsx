import { Button, Icons, Input } from "@wealthfolio/ui";
import React from "react";
import type { AllocationTarget, HoldingOption } from "../types";

interface AddTargetFormProps {
  existingTargets: AllocationTarget[];
  existingHoldings: HoldingOption[];
  onAddTarget: (assetClass: string, target: number) => void;
}

export default ({ existingTargets, existingHoldings, onAddTarget }: AddTargetFormProps) => {
  const [newAssetClass, setNewAssetClass] = React.useState("");
  const [newTarget, setNewTarget] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

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

  const handleAddTarget = () => {
    const targetValue = parseFloat(newTarget);

    if (!newAssetClass.trim() || isNaN(targetValue) || targetValue < 0 || targetValue > 100) {
      return;
    }

    // Round to one decimal place
    const roundedValue = Math.floor(targetValue * 10) / 10;

    onAddTarget(newAssetClass, roundedValue);

    // Reset form
    setNewAssetClass("");
    setNewTarget("");
    setShowDropdown(false);
  };

  const handleSelectHolding = (holding: string) => {
    setNewAssetClass(holding);
    setShowDropdown(false);
  };

  const handleCustomInput = () => {
    setShowDropdown(false);
  };

  // Filter holdings based on search input
  const filteredHoldings = React.useMemo(() => {
    const searchTerm = newAssetClass.toLowerCase().trim();

    // Filter out already added holdings
    const available = existingHoldings.filter(
      (h) => !existingTargets.some((t) => t.assetClass === h.name),
    );

    // If no search term, return all available
    if (!searchTerm) return available;

    // Filter by name or symbol containing the search term
    return available.filter((h) => {
      const nameMatch = h.name.toLowerCase().includes(searchTerm);
      const symbolMatch = h.symbol?.toLowerCase().includes(searchTerm);
      return nameMatch || symbolMatch;
    });
  }, [existingHoldings, existingTargets, newAssetClass]);

  return (
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
                            <span className="text-muted-foreground text-xs">{holding.symbol}</span>
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
  );
};
