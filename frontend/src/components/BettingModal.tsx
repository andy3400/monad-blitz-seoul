import React, { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useAccount,
} from 'wagmi';
import { ROUND_ABI } from '../hooks/useRound';
import type { TokenInfo } from '../config/contracts';

// Token images
import btcImg from '../assets/token/btc.png';
import dogeImg from '../assets/token/doge.png';
import ethImg from '../assets/token/eth.png';
import linkImg from '../assets/token/link.png';
import pepeImg from '../assets/token/pepe.png';
import solImg from '../assets/token/sol.png';

// Token image mapping function
const getTokenImage = (symbol: string) => {
  const tokenImages: Record<string, string> = {
    BTC: btcImg,
    DOGE: dogeImg,
    ETH: ethImg,
    LINK: linkImg,
    PEPE: pepeImg,
    SOL: solImg,
  };
  return tokenImages[symbol.toUpperCase()] || null;
};

interface BettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenInfo | null;
  onBet: (amount: string) => void;
  userCurrentBet?: string;
  roundAddress?: string;
  totalPool?: string;
}

const BettingModal: React.FC<BettingModalProps> = ({
  isOpen,
  onClose,
  token,
  onBet,
  userCurrentBet,
  roundAddress,
  totalPool,
}) => {
  const [betAmount, setBetAmount] = useState('');
  const { address } = useAccount();

  const { writeContract, data: hash, error, isPending } = useWriteContract();

  // Get user's ETH balance
  const { data: balance } = useBalance({
    address: address,
    query: { enabled: !!address && isOpen },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // 트랜잭션이 확인되면 모달 닫기 - 항상 호출
  React.useEffect(() => {
    if (isConfirmed && isOpen && token) {
      onBet(betAmount); // 부모 컴포넌트에 알림 (데이터 새로고침용)
      setBetAmount('');
      onClose();
    }
  }, [isConfirmed, betAmount, onBet, onClose, isOpen, token]);

  // 조건부 렌더링
  if (!isOpen || !token) return null;

  // Check if user has sufficient balance
  const hasInsufficientBalance =
    balance &&
    betAmount &&
    parseFloat(betAmount) > parseFloat(formatEther(balance.value));

  const handleBet = async () => {
    if (
      !betAmount ||
      parseFloat(betAmount) <= 0 ||
      !roundAddress ||
      hasInsufficientBalance
    )
      return;

    try {
      await writeContract({
        address: roundAddress as `0x${string}`,
        abi: ROUND_ABI,
        functionName: 'bet',
        args: [token.address as `0x${string}`],
        value: parseEther(betAmount),
      });
    } catch (err) {
      console.error('Betting failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative premium-glass p-8 max-w-lg w-full mx-4 animate-[scale-in_0.2s_ease-out] origin-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 flex items-center justify-center">
              {getTokenImage(token.symbol) ? (
                <img
                  src={getTokenImage(token.symbol)!}
                  alt={token.symbol}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/30 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30 shadow-lg">
                  {token.symbol[0]}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{token.symbol}</h3>
              <p className="text-white/70">{token.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 text-center border border-white/10 rounded-lg">
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">
              Start Price
            </div>
            <div className="text-lg font-semibold text-white">
              $
              {token.initialPrice
                ? token.initialPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })
                : 'N/A'}
            </div>
          </div>
          <div className="p-4 text-center border border-white/10 rounded-lg">
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">
              Total Bets
            </div>
            <div className="text-lg font-semibold text-white">
              {token.totalBets || '0'} MON
            </div>
          </div>
        </div>

        {/* Current User Bet */}
        {userCurrentBet && parseFloat(userCurrentBet) > 0 && (
          <div className="p-4 mb-6 border border-purple-500/20 rounded-lg bg-purple-500/5">
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">
                Your Current Position
              </div>
              <div className="text-xl font-semibold text-white">
                {parseFloat(userCurrentBet).toFixed(4)} MON
              </div>
            </div>
          </div>
        )}

        {/* Betting Form */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-white/60">
                Bet Amount
              </label>
              {balance && (
                <div className="text-sm text-white/40">
                  Balance:{' '}
                  <span className="font-medium text-white">
                    {parseFloat(formatEther(balance.value)).toFixed(4)} MON
                  </span>
                </div>
              )}
            </div>
            <input
              type="number"
              placeholder="0.01"
              step="0.001"
              min="0"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {['0.01', '0.05', '0.1'].map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className="btn-secondary text-sm py-2"
              >
                {amount}
              </button>
            ))}
            {balance && (
              <button
                onClick={() => {
                  // Reserve small amount for gas fees (0.001 ETH)
                  const maxAmount = Math.max(
                    0,
                    parseFloat(formatEther(balance.value)) - 0.001
                  );
                  setBetAmount(maxAmount.toFixed(4));
                }}
                className="btn-secondary text-sm py-2"
              >
                Max
              </button>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {totalPool &&
              token.totalBets &&
              betAmount &&
              parseFloat(betAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60">Expected Multiplier</span>
                  <span className="text-purple-400 font-semibold">
                    {(() => {
                      const currentTokenBets = parseFloat(token.totalBets);
                      const userBet = parseFloat(betAmount);
                      const currentUserBet = userCurrentBet
                        ? parseFloat(userCurrentBet)
                        : 0;
                      const totalPoolAmount = parseFloat(totalPool);

                      // 새로운 베팅 후 해당 토큰의 총 베팅액
                      const newTokenTotal = currentTokenBets + userBet;
                      // 새로운 베팅 후 전체 풀
                      const newTotalPool = totalPoolAmount + userBet;

                      // 예상 배당률 = 전체 풀 / 해당 토큰 베팅액
                      const expectedMultiplier = newTotalPool / newTokenTotal;

                      return expectedMultiplier.toFixed(2) + 'x';
                    })()}
                  </span>
                </div>
              )}
            {totalPool &&
              token.totalBets &&
              betAmount &&
              parseFloat(betAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60">Expected Return</span>
                  <span className="text-purple-300">
                    {(() => {
                      const currentTokenBets = parseFloat(token.totalBets);
                      const userBet = parseFloat(betAmount);
                      const currentUserBet = userCurrentBet
                        ? parseFloat(userCurrentBet)
                        : 0;
                      const totalPoolAmount = parseFloat(totalPool);

                      const newTokenTotal = currentTokenBets + userBet;
                      const newTotalPool = totalPoolAmount + userBet;
                      const totalUserBet = currentUserBet + userBet;

                      // 사용자의 지분 = (기존 베팅 + 새 베팅) / 토큰 총 베팅
                      const userShare = totalUserBet / newTokenTotal;
                      // 예상 수익 = 전체 풀 * 사용자 지분
                      const expectedReturn = newTotalPool * userShare;

                      return expectedReturn.toFixed(4) + ' MON';
                    })()}
                  </span>
                </div>
              )}
          </div>

          {/* Balance warning */}
          {hasInsufficientBalance && (
            <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                Insufficient balance. Current:{' '}
                {balance
                  ? parseFloat(formatEther(balance.value)).toFixed(4)
                  : '0'}{' '}
                MON
              </p>
            </div>
          )}

          <button
            onClick={handleBet}
            disabled={
              !betAmount ||
              parseFloat(betAmount) <= 0 ||
              isPending ||
              isConfirming ||
              hasInsufficientBalance
            }
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-r-2 border-white border-l-transparent border-b-transparent"></div>
                <span>Confirming...</span>
              </div>
            ) : isConfirming ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-r-2 border-white border-l-transparent border-b-transparent"></div>
                <span>Processing...</span>
              </div>
            ) : userCurrentBet && parseFloat(userCurrentBet) > 0 ? (
              'Add to Position'
            ) : (
              'Place Bet'
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                Error: {(error as any)?.shortMessage || error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BettingModal;
