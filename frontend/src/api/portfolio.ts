import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PortfolioRow } from '@/types'

// Progress follows tasks, so always refetch on visit.
export function usePortfolio() {
  return useQuery<PortfolioRow[]>({
    queryKey: ['portfolio'],
    queryFn: () => api.get('/api/v1/portfolio').then((r) => r.data),
    staleTime: 0,
  })
}
