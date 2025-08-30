import { useReadContract, useReadContracts } from 'wagmi'
import { useAccount } from 'wagmi'

const ROUND_ABI = [
  {
    "inputs": [],
    "name": "getRegisteredTokens",
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRoundStats",
    "outputs": [
      {"name": "name", "type": "string"},
      {"name": "active", "type": "bool"},
      {"name": "finalized", "type": "bool"},
      {"name": "totalTokens", "type": "uint256"},
      {"name": "totalPool", "type": "uint256"},
      {"name": "winner", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTimeInfo",
    "outputs": [
      {"name": "_startTime", "type": "uint256"},
      {"name": "_endTime", "type": "uint256"},
      {"name": "_duration", "type": "uint256"},
      {"name": "_timeLeft", "type": "uint256"},
      {"name": "_hasEnded", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllTokenTotalBets",
    "outputs": [
      {"name": "tokens", "type": "address[]"},
      {"name": "amounts", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserTotalBets",
    "outputs": [
      {"name": "tokens", "type": "address[]"},
      {"name": "amounts", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenAddress", "type": "address"}],
    "name": "getTokenInfo",
    "outputs": [
      {"name": "initialPrice", "type": "uint256"},
      {"name": "totalBets", "type": "uint256"},
      {"name": "isRegistered", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function useRound(roundAddress?: string) {
  const { address: userAddress } = useAccount()

  const { data: registeredTokens } = useReadContract({
    address: roundAddress as `0x${string}`,
    abi: ROUND_ABI,
    functionName: 'getRegisteredTokens',
    query: { enabled: !!roundAddress }
  })

  const { data: roundStats } = useReadContract({
    address: roundAddress as `0x${string}`,
    abi: ROUND_ABI,
    functionName: 'getRoundStats',
    query: { enabled: !!roundAddress }
  })

  const { data: timeInfo } = useReadContract({
    address: roundAddress as `0x${string}`,
    abi: ROUND_ABI,
    functionName: 'getTimeInfo',
    query: { enabled: !!roundAddress }
  })

  const { data: tokenBetAmounts } = useReadContract({
    address: roundAddress as `0x${string}`,
    abi: ROUND_ABI,
    functionName: 'getAllTokenTotalBets',
    query: { enabled: !!roundAddress }
  })

  const { data: userBets } = useReadContract({
    address: roundAddress as `0x${string}`,
    abi: ROUND_ABI,
    functionName: 'getUserTotalBets',
    args: [userAddress as `0x${string}`],
    query: { enabled: !!roundAddress && !!userAddress }
  })

  return {
    registeredTokens: registeredTokens as string[] | undefined,
    roundStats: roundStats as [string, boolean, boolean, bigint, bigint, string] | undefined,
    timeInfo: timeInfo as [bigint, bigint, bigint, bigint, boolean] | undefined,
    tokenBetAmounts: tokenBetAmounts as [string[], bigint[]] | undefined,
    userBets: userBets as [string[], bigint[]] | undefined,
  }
}