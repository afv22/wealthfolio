import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import type { AllocationTarget } from "../types";

const STORAGE_KEY = "rebalancer_targets";

interface UseAllocationTargetsOptions {
  ctx: AddonContext;
  enabled?: boolean;
}

export function useAllocationTargets({ ctx, enabled = true }: UseAllocationTargetsOptions) {
  const queryClient = useQueryClient();

  const query = useQuery<AllocationTarget[]>({
    queryKey: ["allocation-targets"],
    queryFn: async (): Promise<AllocationTarget[]> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
        return [];
      } catch (error) {
        ctx.api.logger.warn(
          "Failed to load allocation targets, using empty: " + (error as Error).message,
        );
        return [];
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: async (targets: AllocationTarget[]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      return targets;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["allocation-targets"], data);
      ctx.api.logger.debug("Allocation targets updated successfully");
    },
    onError: (error) => {
      ctx.api.logger.error("Failed to save allocation targets: " + (error as Error).message);
    },
  });

  return {
    targets: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    updateTargets: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
