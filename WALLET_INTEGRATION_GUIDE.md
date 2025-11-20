# Wallet Overhaul Integration Guide

## Overview

This guide provides step-by-step instructions to integrate all the wallet overhaul components into your existing application. All new components have been created using **Reown AppKit** (formerly WalletConnect) - you just need to wire them up!

---

## 📦 Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- `@reown/appkit@^1.0.0`
- `@reown/appkit-adapter-wagmi@^1.0.0`
- `@tanstack/react-query@^5.0.0`
- `viem@^2.0.0`
- `wagmi@^2.0.0`

---

## 🔑 Step 2: Get Reown Project ID

1. Go to https://dashboard.reown.com
2. Sign up or log in
3. Create a new project (name it "ForeverData")
4. Copy your Project ID

Add to `frontend/.env.local`:
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=be8ead4bf94405f16dde4fedcfa5db09
```

✅ **Already configured with your Project ID!**

---

## 🗄️ Step 3: Run Database Migration

```bash
cd backend
sqlite3 fileInfo.db < migrations/add-wallet-index.sql
```

This adds an index on `payerAddress` for fast wallet-based filtering.

---

## 🎨 Step 4: Update Components

### 4.1 Update Dashboard Component

**File:** `frontend/components/Dashboard.tsx`

Replace the current file list rendering with the new `FileBalanceCard` components:

```typescript
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import FileBalanceCard from './FileBalanceCard';
import TopUpModal from './TopUpModal';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState([]);
  const [topUpFile, setTopUpFile] = useState(null);

  // Fetch files filtered by wallet
  useEffect(() => {
    if (isConnected && address) {
      fetch(`${API_URL}/api/files?walletAddress=${address}`)
        .then(res => res.json())
        .then(setFiles)
        .catch(console.error);
    }
  }, [address, isConnected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Your Files ({files.length})
        </h2>
      </div>

      {/* File Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <FileBalanceCard
            key={file.fileId}
            fileId={file.fileId}
            fileName={file.fileName}
            fileSize={file.fileSize}
            createdAt={file.createdAt}
            onTopUp={() => setTopUpFile(file)}
            onView={() => router.push(`/file/${file.fileId}`)}
            onDownload={() => {/* existing download logic */}}
          />
        ))}
      </div>

      {/* Top-Up Modal */}
      {topUpFile && (
        <TopUpModal
          isOpen={!!topUpFile}
          onClose={() => setTopUpFile(null)}
          fileId={topUpFile.fileId}
          fileName={topUpFile.fileName}
          fileSize={topUpFile.fileSize}
          currentBalance={topUpFile.balance || 0n} // Fetch from contract
          fileOwner={topUpFile.payerAddress}
        />
      )}
    </div>
  );
}
```

### 4.2 Update UploadForm Component

**File:** `frontend/components/UploadForm.tsx`

Replace the old `WalletConnect` import:

```typescript
// OLD:
// import WalletConnect from './WalletConnect';

// NEW:
import WalletConnect from './WalletConnectNew';
```

Update the wallet component usage to show balance:

```typescript
<WalletConnect
  onConnect={handleWalletConnect}
  showBalance={true}  // Show ETH balance
/>
```

Replace `PaymentModal` import:

```typescript
// OLD:
// import PaymentModal from './PaymentModal';

// NEW:
import PaymentModal from './PaymentModalNew';
import PaymentBreakdown from './PaymentBreakdown';
```

Add duration selector to upload form (optional for Phase 6):

```typescript
const [selectedDuration, setSelectedDuration] = useState(30);

// Before file upload UI:
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Storage Duration
  </label>
  <div className="grid grid-cols-4 gap-2">
    {[7, 14, 30, 90].map((days) => (
      <button
        key={days}
        onClick={() => setSelectedDuration(days)}
        className={`px-3 py-2 rounded-lg text-sm font-medium ${
          selectedDuration === days
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {days} days
      </button>
    ))}
  </div>
</div>

// When calculating payment, pass duration:
const payment = calculateChunkedPayment(file.size, selectedDuration);
```

### 4.3 Update Payment Modal Usage

When showing the payment modal, optionally include the `PaymentBreakdown` component:

```typescript
<PaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  file={selectedFile}
  fileId={generatedFileId}
  paymentData={paymentData}
  onPaymentSuccess={handlePaymentSuccess}
/>

// OR integrate PaymentBreakdown directly in your upload flow before payment:
{selectedFile && paymentData && (
  <PaymentBreakdown
    fileSize={selectedFile.size}
    paymentData={paymentData}
  />
)}
```

### 4.4 Add Balance Display to Header/Nav

**File:** `frontend/components/Header.tsx` or your nav component

```typescript
import WalletConnect from './components/WalletConnectNew';

// In your header:
<header className="flex items-center justify-between p-4">
  <div className="logo">ForeverData</div>

  <WalletConnect
    onConnect={(address) => console.log('Connected:', address)}
    showBalance={true}  // Show ETH balance in header
  />
</header>
```

---

## 🧪 Step 5: Test the Integration

### 5.1 Frontend Testing

```bash
cd frontend
npm run dev
```

Test checklist:
- [ ] Wallet connect modal appears with multiple wallet options
- [ ] Can connect with MetaMask
- [ ] Can connect with Coinbase Wallet
- [ ] Can connect with WalletConnect (mobile)
- [ ] ETH balance displays correctly in header
- [ ] Dashboard shows only files from connected wallet
- [ ] File cards show balance and days remaining
- [ ] Warning badges appear for files < 7 days
- [ ] Payment breakdown shows storage + gas + USD
- [ ] Top-up modal opens and calculates correctly
- [ ] Only file owner can top up (others see error)
- [ ] Duration selector updates payment amount

### 5.2 Backend Testing

```bash
cd backend
npm run dev
```

Test API endpoints:
```bash
# Get all files
curl http://localhost:3001/api/files

# Get files by wallet
curl http://localhost:3001/api/files?walletAddress=0x1234...
```

---

## 📁 New Files Created

### Frontend Components
- ✅ `frontend/config/index.tsx` - Reown AppKit wagmi configuration
- ✅ `frontend/context/index.tsx` - Reown AppKit context provider
- ✅ `frontend/lib/coinGecko.ts` - ETH/USD price fetching
- ✅ `frontend/components/WalletConnectNew.tsx` - Multi-wallet support (Reown AppKit)
- ✅ `frontend/components/PaymentModalNew.tsx` - wagmi-based payment
- ✅ `frontend/components/PaymentBreakdown.tsx` - Detailed cost breakdown
- ✅ `frontend/components/FileBalanceCard.tsx` - File card with balance
- ✅ `frontend/components/TopUpModal.tsx` - Top-up functionality

### Backend
- ✅ `backend/src/db.ts` - Added `getFilesByOwner()` function
- ✅ `backend/src/index.ts` - Updated `/api/files` endpoint
- ✅ `backend/migrations/add-wallet-index.sql` - Database migration

### Configuration
- ✅ `frontend/package.json` - Updated dependencies
- ✅ `frontend/.env.example` - Added WalletConnect Project ID
- ✅ `frontend/pages/_app.tsx` - Added Web3 providers

---

## 🎯 Key Features Now Available

### 1. Multi-Wallet Support
- MetaMask, Coinbase, Rainbow, Trust Wallet, and 300+ others
- Mobile wallet support via WalletConnect
- Beautiful connection UI from Web3Modal
- Auto-reconnect on page reload

### 2. Payment Transparency
- Detailed breakdown: Storage cost + Gas fee
- Real-time USD conversion (via CoinGecko API)
- Shows cost per MB and per chunk
- Interactive tooltips explaining each fee
- Clear duration display (7, 14, 30, 90 days)

### 3. File Balance Tracking
- Shows remaining balance for each file
- Calculates days remaining based on file size
- Color-coded warnings:
  - 🟢 Green: > 7 days
  - 🟡 Yellow: 3-7 days (warning)
  - 🔴 Red: < 3 days (critical)
- Fetches live balance from smart contract

### 4. Top-Up Functionality
- Add more funds to existing files
- Choose duration: 7, 14, 30, 90 days or custom
- Real-time cost calculation
- Preview new balance and total days
- **Owner-only restriction** (security)
- USD conversion for transparency

### 5. Wallet-Based Filtering
- Dashboard shows only user's own files
- Fast database query with indexed `payerAddress`
- Case-insensitive wallet matching
- "You have X files" counter

### 6. Wallet Balance Display
- Show ETH balance anywhere with `showBalance` prop
- Real-time updates after transactions
- Clean, compact display

---

## 🔧 Configuration Options

### Web3Modal Customization

Edit `frontend/lib/web3-config.ts`:

```typescript
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,  // Track wallet connections
  enableOnramp: true,     // Show "Buy Crypto" button
  themeMode: 'light',     // 'light' | 'dark' | 'auto'
  themeVariables: {
    '--w3m-accent': '#3b82f6',  // Primary color
  }
});
```

### CoinGecko Cache Duration

Edit `frontend/lib/coinGecko.ts`:

```typescript
const CACHE_DURATION = 60000; // 1 minute (adjust as needed)
```

### Warning Thresholds

Edit `frontend/components/FileBalanceCard.tsx`:

```typescript
const getStatusColor = () => {
  if (daysRemaining < 3) return 'red';     // Critical threshold
  if (daysRemaining < 7) return 'yellow';  // Warning threshold
  return 'green';
};
```

---

## 🐛 Troubleshooting

### "WalletConnect Project ID not found"
**Solution:** Make sure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is in `.env.local` and restart the dev server.

### "Failed to fetch ETH price"
**Solution:** CoinGecko API may be rate-limited. The app will use a fallback price ($2,400). Increase cache duration or implement retry logic.

### "File balance shows 0 ETH"
**Solution:** Ensure the smart contract address in `lib/payment.ts` matches your deployed contract. Check that `getFileBalance()` function exists in the contract.

### "Top-up button disabled"
**Solution:** Only the file owner can top up. Make sure the connected wallet address matches `file.payerAddress`.

### "Dashboard shows all files, not just mine"
**Solution:** Ensure the Dashboard is passing `walletAddress` query parameter: `/api/files?walletAddress=${address}`

### "Wallet won't connect"
**Solution:**
1. Check console for errors
2. Ensure you're on the correct network (Sepolia testnet)
3. Try disconnecting and reconnecting
4. Clear browser cache and cookies

---

## 🚀 Deployment Checklist

### Frontend (Vercel)
- [ ] Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to Vercel environment variables
- [ ] Remove or set `NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=false`
- [ ] Rebuild and redeploy

### Backend (Railway)
- [ ] Run database migration on production DB
- [ ] Ensure `EIGENDA_PROXY_URL` is correct
- [ ] Restart backend service

---

## 📊 Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Wallet Support | MetaMask only | 300+ wallets |
| Payment Transparency | Hidden "black box" | Full breakdown + USD |
| File Balance Visibility | Not shown | Live balance + days remaining |
| Top-Up | Not possible | Easy with duration selector |
| File Filtering | All files shown | Only user's files |
| Wallet Balance | Open MetaMask | Shown in header |
| Duration Choice | Fixed 30 days | 7, 14, 30, 90 days + custom |
| Gas Fee Clarity | No explanation | Interactive tooltip |

---

## 🎉 You're Done!

All wallet overhaul components are now integrated. Users will enjoy:
- ✅ Choice of 300+ wallets
- ✅ Full payment transparency with USD conversion
- ✅ Clear visibility into file balances and expiration
- ✅ Easy top-up before files expire
- ✅ Personal file dashboard filtered by wallet
- ✅ ETH balance always visible

**No more "black box" payments!**
