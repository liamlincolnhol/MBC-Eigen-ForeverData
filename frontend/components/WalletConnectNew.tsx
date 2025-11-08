import React from 'react';
import { useAccount, useBalance, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Wallet, LogOut, AlertTriangle } from 'lucide-react';
import { formatEther } from 'viem';
import { sepolia } from '@reown/appkit/networks';

interface WalletConnectProps {
  onConnect: (address: string) => void;
  showBalance?: boolean;
}

export default function WalletConnect({ onConnect, showBalance = false }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: Boolean(address)
    }
  });

  // Call onConnect when wallet connects
  React.useEffect(() => {
    if (isConnected && address) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  const targetChainId = sepolia.id;
  const needsNetworkSwitch = Boolean(isConnected && chainId && chainId !== targetChainId);

  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-medium text-white shadow-[rgba(15,23,42,0.65)_0px_25px_80px_-30px] transition-all duration-200 hover:border-white/35 hover:bg-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/25 via-indigo-500/20 to-purple-500/25 opacity-70 blur-2xl" />
        <Wallet className="w-5 h-5 relative z-10 text-sky-100" />
        <span className="relative z-10">Connect wallet</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white shadow-[rgba(3,7,18,0.55)_0px_25px_70px_-25px] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <Wallet className="w-5 h-5 text-sky-100" />
          </div>
          <div className="flex flex-col text-sm leading-tight">
            <span className="font-semibold text-white">
              {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            {showBalance && balanceData && (
              <span className="text-white/70">
                {parseFloat(formatEther(balanceData.value)).toFixed(4)} ETH
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => disconnect()}
          className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/70 transition-all hover:border-white/40 hover:text-white"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect</span>
        </button>
      </div>

      {needsNetworkSwitch && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
          <div className="flex items-center gap-2 font-medium tracking-wide uppercase text-[11px] text-amber-200">
            <AlertTriangle className="w-4 h-4" />
            Wrong network
          </div>
          <p className="mt-1 text-[13px] text-amber-50">
            Please switch to Sepolia before uploading.
          </p>
          <button
            className="mt-2 inline-flex items-center rounded-lg border border-amber-200/40 px-3 py-1.5 text-[12px] font-semibold text-amber-100 transition hover:border-amber-200 hover:text-white disabled:opacity-60"
            onClick={() => switchChain?.({ chainId: targetChainId })}
            disabled={isSwitching || !switchChain}
          >
            {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
          </button>
          {switchError && (
            <p className="mt-1 text-[11px] text-amber-200/80">
              {switchError.message || 'Open your wallet to approve the switch.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
