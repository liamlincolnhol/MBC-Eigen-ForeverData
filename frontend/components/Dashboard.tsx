import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, AlertCircle, Loader2, ExternalLink, Copy, RefreshCcw } from 'lucide-react';
import { useAccount } from 'wagmi';
import FileBalanceCard from './FileBalanceCard';
import TopUpModal from './TopUpModal';

interface FileData {
  fileId: string;
  fileName: string;
  fileSize?: number;
  createdAt: string;
  expiry: string;
  status: 'active' | 'expiring_soon' | 'expired';
  days_remaining: number;
  blobId?: string;
  blobKey?: string;
  payerAddress?: string;
}

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.foreverdata.live';

export default function Dashboard({ isOpen, onClose }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topUpTarget, setTopUpTarget] = useState<{ file: FileData; balance: bigint; owner: string | null } | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/files?walletAddress=${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data: FileData[] = await response.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isOpen && isConnected && address) {
      void fetchFiles();
    }
    if (isOpen && (!isConnected || !address)) {
      setFiles([]);
    }
  }, [isOpen, isConnected, address, fetchFiles]);

  const openFileUrl = (fileId: string) => `${API_BASE_URL}/f/${fileId}`;

  const handleView = (fileId: string) => {
    window.open(openFileUrl(fileId), '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (fileId: string) => {
    window.open(openFileUrl(fileId), '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async (fileId: string) => {
    try {
      await navigator.clipboard.writeText(openFileUrl(fileId));
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 w-full sm:w-3/5 lg:w-1/2 h-full bg-white rounded-l-2xl shadow-2xl z-50 transition-all duration-500 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">ForeverData</span>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>My Files</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-gray-100 text-xs text-gray-500">
          {shortAddress ? (
            <span className="font-mono">Connected: {shortAddress}</span>
          ) : (
            <span>Connect a wallet to view your uploads</span>
          )}
          <button
            onClick={() => fetchFiles()}
            disabled={!isConnected || loading || !address}
            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCcw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4">
          {!isConnected ? (
            <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <p>Connect your wallet to see the files funded by this address.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p>Loading your files...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <p>No uploads found for this wallet yet.</p>
              <p className="text-xs mt-2">
                Payment records sync automatically once your on-chain deposit is detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {files.map((file) => (
                  <FileBalanceCard
                    key={file.fileId}
                    fileId={file.fileId}
                    fileName={file.fileName}
                    fileSize={file.fileSize ?? 0}
                    createdAt={file.createdAt}
                    permanentLink={openFileUrl(file.fileId)}
                    ownerAddress={file.payerAddress}
                    onTopUp={(balance, owner) => setTopUpTarget({ file, balance, owner })}
                    onView={() => handleView(file.fileId)}
                    onDownload={() => handleDownload(file.fileId)}
                  />
                ))}
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Pro tips</p>
                <ul className="space-y-1">
                  <li>• Use the copy button to share a permanent file link.</li>
                  <li>• Top up funds before expiry to keep storage active.</li>
                  <li>• Deposits are tied to your wallet; switch addresses to see other files.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {files.length > 0 && isConnected && (
          <div className="px-6 pb-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {files.map((file) => (
                <div key={`${file.fileId}-actions`} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-gray-500">#{file.fileId.slice(0, 6)}</span>
                    <span className="text-xs text-gray-700 truncate max-w-[120px]">{file.fileName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyLink(file.fileId)}
                      className="p-2 rounded-md border border-gray-200 hover:bg-white transition"
                      title="Copy link"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleView(file.fileId)}
                      className="p-2 rounded-md border border-gray-200 hover:bg-white transition"
                      title="Open link"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {topUpTarget && (
        <TopUpModal
          isOpen={Boolean(topUpTarget)}
          onClose={() => {
            setTopUpTarget(null);
            void fetchFiles();
          }}
          fileId={topUpTarget.file.fileId}
          fileName={topUpTarget.file.fileName}
          fileSize={topUpTarget.file.fileSize ?? 0}
          currentBalance={topUpTarget.balance}
          fileOwner={topUpTarget.owner ?? topUpTarget.file.payerAddress ?? ''}
        />
      )}
    </>
  );
}
