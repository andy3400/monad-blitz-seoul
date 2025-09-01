import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

export const monadTestnet = defineChain({
  id: 41454,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
})

export const config = getDefaultConfig({
  appName: 'Monad Blitz',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains: [monadTestnet],
  ssr: false,
})