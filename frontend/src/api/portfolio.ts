import type { PortfolioRow } from '@/types'
import { ApiResource, useResourceList } from './base'

// One row per active project in the Space (read-only).
export const portfolioApi = new ApiResource<PortfolioRow, never, never>('/api/v1/portfolio', null, 'portfolio')

// Progress follows tasks, so always refetch on visit.
export const usePortfolio = () => useResourceList(portfolioApi, { staleTime: 0 })
