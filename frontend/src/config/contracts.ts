export const CHAINLINK_DATAFEEDS = {
  'BTC/USD': '0x2Cd9D7E85494F68F5aF08EF96d6FD5e8F71B4d31',
  'ETH/USD': '0x0c76859E85727683Eeba0C70Bc2e0F5781337818',
  'LINK/USD': '0x4682035965Cd2B88759193ee2660d8A0766e1391',
  'USDC/USD': '0x70BB0758a38ae43418ffcEd9A25273dd4e804D15',
  'USDT/USD': '0x14eE6bE30A91989851Dc23203E41C804D4D71441',
  'SOL/USD': '0x1c2f27C736aC97886F017AbdEedEd81C3C8Af7Be',
  'DOGE/USD': '0x7F1c8B16Ba16AA5a8e720dA162f0d9191f2e6EC5',
  'PEPE/USD': '0x5db2F4591d04CABc9E5C4016e9477A80d383D298',
} as const

export const CONTRACT_ADDRESSES = {
  ROUND_FACTORY: '0x0000000000000000000000000000000000000000', // 배포 후 업데이트 필요
} as const

export const BET_TYPES = [
  { id: 0, name: '강상승', percentage: '+0.02%', color: 'bg-red-500', threshold: 20 },
  { id: 1, name: '중상승', percentage: '+0.015%', color: 'bg-orange-500', threshold: 15 },
  { id: 2, name: '약상승', percentage: '+0.01%', color: 'bg-yellow-500', threshold: 10 },
  { id: 3, name: '약하락', percentage: '-0.01%', color: 'bg-green-500', threshold: -10 },
  { id: 4, name: '중하락', percentage: '-0.015%', color: 'bg-blue-500', threshold: -15 },
  { id: 5, name: '강하락', percentage: '-0.02%', color: 'bg-purple-500', threshold: -20 },
] as const

export type BetType = typeof BET_TYPES[number]