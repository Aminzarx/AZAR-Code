import { useCallback, useEffect, useState } from 'react'
import type { ContractWithDetails } from '../types'
import { useContractService } from './useContractService'

type UseContractDetailResult = {
  contract: ContractWithDetails | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useContractDetail(id: string): UseContractDetailResult {
  const service = useContractService()
  const [contract, setContract] = useState<ContractWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!service) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)

    service
      .getContract(id)
      .then((result) => {
        if (!cancelled) {
          setContract(result)
          setIsLoading(false)
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError : new Error('خطای نامشخص'))
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [service, id, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { contract, isLoading, error, refetch }
}
