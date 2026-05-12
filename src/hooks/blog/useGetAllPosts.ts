import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useGetAllPosts() {
  return useQuery({
    queryKey: ['posts', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
