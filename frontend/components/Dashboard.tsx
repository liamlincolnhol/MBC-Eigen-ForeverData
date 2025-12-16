import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, FileText, AlertCircle, Loader2, ExternalLink, Copy, RefreshCcw, Globe2, User } from 'lucide-react';
import { useAccount } from 'wagmi';
import FileBalanceCard from './FileBalanceCard';
import TopUpModal from './TopUpModal';
import type { AccountBlob } from '../types/eigenda';

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

type ViewMode = 'global' | 'mine';

export default function Dashboard({ isOpen, onClose }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const [globalFiles, setGlobalFiles] = useState<FileData[]>([]);
  const [myFiles, setMyFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topUpTarget, setTopUpTarget] = useState<{ file: FileData; balance: bigint; owner: string | null } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const fetchIdRef = useRef(0);

  const fetchFiles = useCallback(async (mode: ViewMode) => {
    if (mode === 'mine' && (!address || !isConnected)) {
      setMyFiles([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = fetchIdRef.current + 1;
    fetchIdRef.current = requestId;

    try {
      setLoading(true);
      setError(null);
      const query = mode === 'mine' ? `?walletAddress=${address}` : '';
      const response = await fetch(`${API_BASE_URL}/api/files${query}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data: FileData[] = await response.json();
      if (mode === 'mine') {
        setMyFiles(data);
      } else {
        setGlobalFiles(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (mode === 'mine') {
        setMyFiles([]);
      } else {
        setGlobalFiles([]);
      }
    } finally {
      if (fetchIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (viewMode === 'global') {
      void fetchFiles('global');
      return;
    }

    if (viewMode === 'mine') {
      if (isConnected && address) {
        void fetchFiles('mine');
      } else {
        setMyFiles([]);
      }
    }
  }, [isOpen, viewMode, isConnected, address, fetchFiles]);

  useEffect(() => {
    if (isOpen && viewMode === 'global') {
      return;
    }
  }, [isOpen, viewMode]);

  useEffect(() => {
    setTopUpTarget(null);
  }, [viewMode]);

  const activeFiles = useMemo(() => (viewMode === 'global' ? globalFiles : myFiles), [viewMode, globalFiles, myFiles]);

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
  const headerTitle = viewMode === 'global' ? 'Global File Feed' : 'My Files';
  const headerSubtitle = viewMode === 'global'
    ? 'Latest uploads across ForeverData'
    : 'Files funded by your connected wallet';

  const handleChangeView = (mode: ViewMode) => {
    if (viewMode === mode) return;
    setError(null);
    setViewMode(mode);
  };

  const refreshDisabled = viewMode === 'mine'
    ? (!isConnected || !address || loading)
    : loading;

  const handleRefreshClick = () => {
    void fetchFiles(viewMode);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 w-full sm:w-[70%] lg:w-[55%] h-full bg-[#050915] text-white rounded-l-[36px] shadow-2xl z-50 transition-all duration-500 ease-out flex flex-col border-l border-white/10 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.4em] text-white/40">ForeverData</span>
            <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-sky-200" />
              <span>{headerTitle}</span>
            </h2>
            <p className="text-sm text-white/50">{headerSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="px-8 pt-4 pb-3 space-y-3 border-b border-white/10 text-xs text-white/60">
          <div className="flex items-center justify-between gap-3">
            {viewMode === 'global' ? (
              <span>Showing recent uploads from the entire network</span>
            ) : shortAddress ? (
              <span className="font-mono">Connected: {shortAddress}</span>
            ) : (
              <span>Connect a wallet to view the files you’ve funded</span>
            )}
            <button
              onClick={handleRefreshClick}
              disabled={refreshDisabled}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
          <div className="inline-flex rounded-full bg-white/10 p-1 text-white/70">
            <button
              onClick={() => handleChangeView('global')}
              className={`flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                viewMode === 'global' ? 'bg-white text-slate-900 shadow' : 'hover:bg-white/10'
              }`}
            >
              <Globe2 className="w-3 h-3" />
              <span>Global feed</span>
            </button>
            <button
              onClick={() => handleChangeView('mine')}
              className={`flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                viewMode === 'mine' ? 'bg-white text-slate-900 shadow' : 'hover:bg-white/10'
              }`}
            >
              <User className="w-3 h-3" />
              <span>My files</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-8 space-y-4">
          {viewMode === 'mine' && !isConnected ? (
            <div className="p-6 text-center text-white/60 bg-white/5 rounded-2xl border border-white/10">
              <p>Connect your wallet to see the files funded by this address.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p>Loading files...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-200 bg-red-500/10 border border-red-500/30 rounded-2xl">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-300" />
              <p>{error}</p>
            </div>
          ) : activeFiles.length === 0 ? (
            <div className="p-6 text-center text-white/60 bg-white/5 rounded-2xl border border-white/10">
              <p>
                {viewMode === 'global'
                  ? 'No uploads have been indexed yet. Try again shortly.'
                  : 'No uploads found for this wallet yet.'}
              </p>
              {viewMode === 'mine' && (
                <p className="text-xs mt-2 text-white/40">
                  Payment records sync automatically once your on-chain deposit is detected.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {activeFiles.map((file) => (
                  <FileBalanceCard
                    key={file.fileId}
                    fileId={file.fileId}
                    fileName={file.fileName}
                    fileSize={file.fileSize ?? 0}
                    createdAt={file.createdAt}
                    permanentLink={openFileUrl(file.fileId)}
                    blobKey={file.blobKey}
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

        {activeFiles.length > 0 && isConnected && (
          <div className="px-6 pb-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {activeFiles.map((file) => (
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
            void fetchFiles(viewMode);
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

const shortenHash = (value?: string, visibleChars = 6) => {
  if (!value) return '—';
  if (value.length <= visibleChars * 2) {
    return value;
  }
  const prefix = value.slice(0, visibleChars);
  const suffix = value.slice(-visibleChars);
  return `${prefix}…${suffix}`;
};

const getBlobLength = (blob: AccountBlob): number | undefined => {
  if (typeof blob.length === 'number') {
    return blob.length;
  }
  if (typeof blob.blobMetadata?.blobSizeBytes === 'number') {
    return blob.blobMetadata.blobSizeBytes;
  }
  return undefined;
};

const formatBlobSize = (blob: AccountBlob) => {
  const length = getBlobLength(blob);
  if (!length || length <= 0) return 'Size unknown';
  const mib = length / (1024 * 1024);
  if (mib >= 1) {
    return `${mib.toFixed(2)} MiB`;
  }
  const kib = length / 1024;
  if (kib >= 1) {
    return `${kib.toFixed(2)} KiB`;
  }
  return `${length} bytes`;
};

const formatStatusLabel = (blob: AccountBlob) => {
  const status = blob.status || blob.blobMetadata?.blobStatus;
  if (!status) return '';
  return status.replace(/_/g, ' ');
};
