import { useReadContract, useReadContracts } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../config/contracts'

const ROUND_FACTORY_ABI = [
  {
    "inputs": [],
    "name": "getSupportedTokens",
    "outputs": [
      {
        "components": [
          {"name": "tokenAddress", "type": "address"},
          {"name": "symbol", "type": "string"},
          {"name": "name", "type": "string"},
          {"name": "currentPrice", "type": "uint256"},
          {"name": "isActive", "type": "bool"}
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentRoundInfo",
    "outputs": [
      {"name": "roundAddress", "type": "address"},
      {"name": "roundName", "type": "string"},
      {"name": "isActive", "type": "bool"},
      {"name": "tokenCount", "type": "uint256"},
      {"name": "totalPrizePool", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "canCreateNewRound",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentActiveRound",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPreviousRound",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function useRoundFactory() {
  const { data: supportedTokens, isLoading: tokensLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.ROUND_FACTORY as `0x${string}`,
    abi: ROUND_FACTORY_ABI,
    functionName: 'getSupportedTokens',
  })

  const { data: currentRoundInfo, isLoading: roundInfoLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.ROUND_FACTORY as `0x${string}`,
    abi: ROUND_FACTORY_ABI,
    functionName: 'getCurrentRoundInfo',
  })

  const { data: currentActiveRound } = useReadContract({
    address: CONTRACT_ADDRESSES.ROUND_FACTORY as `0x${string}`,
    abi: ROUND_FACTORY_ABI,
    functionName: 'currentActiveRound',
  })

  const { data: previousRound } = useReadContract({
    address: CONTRACT_ADDRESSES.ROUND_FACTORY as `0x${string}`,
    abi: ROUND_FACTORY_ABI,
    functionName: 'getPreviousRound',
  })

  return {
    supportedTokens: supportedTokens as Array<{
      tokenAddress: string
      symbol: string
      name: string
      currentPrice: bigint
      isActive: boolean
    }> | undefined,
    currentRoundInfo: currentRoundInfo as [string, string, boolean, bigint, bigint] | undefined,
    currentActiveRound: currentActiveRound as string | undefined,
    previousRound: previousRound as string | undefined,
    isLoading: tokensLoading || roundInfoLoading,
  }
}