import {useAccount, useReadContracts} from 'wagmi'

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

export const ROUND_ABI = [
  {
    "inputs": [{"name": "tokenAddress", "type": "address"}],
    "name": "bet",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
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
  },
  {
    "inputs": [{"name": "", "type": "uint256"}],
    "name": "bets",
    "outputs": [
      {"name": "tokenAddress", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "bettor", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBetsCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function useRound(roundAddress?: string) {
  const { address: userAddress } = useAccount()

  // Batch all contract calls using useReadContracts
  const contracts = roundAddress ? [
    {
      address: roundAddress as `0x${string}`,
      abi: ROUND_ABI,
      functionName: 'getRegisteredTokens',
    },
    {
      address: roundAddress as `0x${string}`,
      abi: ROUND_ABI,
      functionName: 'getRoundStats',
    },
    {
      address: roundAddress as `0x${string}`,
      abi: ROUND_ABI,
      functionName: 'getTimeInfo',
    },
    {
      address: roundAddress as `0x${string}`,
      abi: ROUND_ABI,
      functionName: 'getAllTokenTotalBets',
    },
    {
      address: roundAddress as `0x${string}`,
      abi: ROUND_ABI,
      functionName: 'getBetsCount',
    },
    // User-specific calls only if user is connected
    ...(userAddress ? [{
      address: roundAddress as `0x${string}`,
      abi: ROUND_ABI,
      functionName: 'getUserTotalBets',
      args: [userAddress as `0x${string}`],
    }] : [])
  ] : []

  const { 
    data: batchResults, 
    refetch: refetchAll,
    isLoading 
  } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: !!roundAddress,
    },
    multicallAddress: MULTICALL3_ADDRESS,
  })

  // Extract results from batch
  const registeredTokens = batchResults?.[0]?.result
  const roundStats = batchResults?.[1]?.result
  const timeInfo = batchResults?.[2]?.result
  const tokenBetAmounts = batchResults?.[3]?.result
  const betsCount = batchResults?.[4]?.result
  const userBets = userAddress && batchResults?.[5]?.result

  return {
    registeredTokens: registeredTokens as string[] | undefined,
    roundStats: roundStats as [string, boolean, boolean, bigint, bigint, string] | undefined,
    timeInfo: timeInfo as [bigint, bigint, bigint, bigint, boolean] | undefined,
    tokenBetAmounts: tokenBetAmounts as [string[], bigint[]] | undefined,
    userBets: userBets as [string[], bigint[]] | undefined,
    betsCount: betsCount as bigint | undefined,
    isLoading,
    refetchAll,
  }
}