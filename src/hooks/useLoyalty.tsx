import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LoyaltyPoints {
  id: string;
  email: string;
  points_balance: number;
  lifetime_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  created_at: string;
  updated_at: string;
}

interface PointsTransaction {
  id: string;
  loyalty_id: string;
  order_id: string | null;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'bonus' | 'expire';
  description: string | null;
  created_at: string;
}

export const useLoyalty = (email?: string) => {
  const queryClient = useQueryClient();

  const loyaltyQuery = useQuery({
    queryKey: ['loyalty', email],
    queryFn: async () => {
      if (!email) return null;
      
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data as LoyaltyPoints | null;
    },
    enabled: !!email,
  });

  const transactionsQuery = useQuery({
    queryKey: ['loyalty-transactions', loyaltyQuery.data?.id],
    queryFn: async () => {
      if (!loyaltyQuery.data?.id) return [];
      
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('loyalty_id', loyaltyQuery.data.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PointsTransaction[];
    },
    enabled: !!loyaltyQuery.data?.id,
  });

  const awardPointsMutation = useMutation({
    mutationFn: async ({ email, orderId, orderTotal }: { email: string; orderId: string; orderTotal: number }) => {
      const { data, error } = await supabase.rpc('award_loyalty_points', {
        p_email: email,
        p_order_id: orderId,
        p_order_total: orderTotal,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
    },
  });

  return {
    loyalty: loyaltyQuery.data,
    isLoading: loyaltyQuery.isLoading,
    transactions: transactionsQuery.data || [],
    transactionsLoading: transactionsQuery.isLoading,
    awardPoints: awardPointsMutation.mutateAsync,
    isAwarding: awardPointsMutation.isPending,
  };
};

export const getTierColor = (tier: string) => {
  switch (tier) {
    case 'platinum':
      return 'bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900';
    case 'gold':
      return 'bg-gradient-to-r from-yellow-500 to-amber-400 text-yellow-900';
    case 'silver':
      return 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-900';
    default:
      return 'bg-gradient-to-r from-orange-600 to-orange-500 text-white';
  }
};

export const getTierNextThreshold = (tier: string, lifetimePoints: number) => {
  switch (tier) {
    case 'bronze':
      return { next: 'Silver', points: 1000 - lifetimePoints, threshold: 1000 };
    case 'silver':
      return { next: 'Gold', points: 5000 - lifetimePoints, threshold: 5000 };
    case 'gold':
      return { next: 'Platinum', points: 10000 - lifetimePoints, threshold: 10000 };
    default:
      return null;
  }
};
