import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!supabase || !userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, cpf, phone, avatar_url, created_at, updated_at")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!supabase && !!userId,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
