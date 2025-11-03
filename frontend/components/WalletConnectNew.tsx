import React from 'react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Wallet, LogOut } from 'lucide-react';
import { formatEther } from 'viem';

interface WalletConnectProps {
  onConnect: (address: string) => void;
  showBalance?: boolean;
}

export default function WalletConnect({ onConnect, showBalance = false }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
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

  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Wallet className="w-5 h-5" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
      <div className="flex items-center space-x-3">
        <Wallet className="w-5 h-5 text-green-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-green-800">
            {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
          {showBalance && balanceData && (
            <span className="text-xs text-green-600">
              {parseFloat(formatEther(balanceData.value)).toFixed(4)} ETH
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => disconnect()}
        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
        title="Disconnect"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
