import { ConnectButton } from '@rainbow-me/rainbowkit'

export const CustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated')

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="relative px-8 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-md border border-purple-500/20 text-white font-medium hover:from-purple-500/20 hover:to-purple-600/20 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden group"
                  >
                    <span className="relative z-10">Connect Wallet</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-6 py-2.5 rounded-full bg-purple-500/10 backdrop-blur-md border border-purple-500/30 text-purple-400 font-medium hover:bg-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex gap-3">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    type="button"
                  >
                    {chain.hasIcon && (
                      <div
                        className="w-5 h-5 rounded-full overflow-hidden"
                        style={{
                          background: chain.iconBackground,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-5 h-5"
                          />
                        )}
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">
                      {chain.name}
                    </span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="relative flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div className="relative flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-110 transition-transform"></div>
                      <span className="text-white font-medium">
                        {account.displayName}
                      </span>
                    </div>
                    {account.displayBalance && (
                      <span className="relative text-white/60 text-sm font-medium border-l border-white/20 pl-3">
                        {account.displayBalance}
                      </span>
                    )}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}