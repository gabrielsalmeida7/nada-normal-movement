import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Address } from "@/types/address";

export function useAddresses(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["addresses", userId],
    queryFn: async () => {
      if (!supabase || !userId) return [];
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Address[];
    },
    enabled: !!supabase && !!userId,
  });

  const insertMutation = useMutation({
    mutationFn: async (addr: Omit<Address, "id" | "created_at" | "updated_at">) => {
      if (!supabase) throw new Error("Supabase não configurado");
      const { data, error } = await supabase.from("addresses").insert(addr).select().single();
      if (error) throw error;
      return data as Address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    insertAddress: insertMutation.mutateAsync,
    isInserting: insertMutation.isPending,
  };
}
