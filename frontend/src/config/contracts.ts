export const CONTRACT_ADDRESSES = {
  ROUND_FACTORY: import.meta.env.VITE_ROUND_FACTORY_ADDRESS, // 배포 후 업데이트 필요
} as const

export type TokenInfo = {
  address: string
  symbol: string
  name: string
  logo: string
  color: string
  initialPrice?: number
  currentPrice?: number
  change?: number
  totalBets?: string
}