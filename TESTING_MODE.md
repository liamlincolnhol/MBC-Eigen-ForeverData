# Testing Mode Configuration

This document explains how to toggle payment and wallet requirements for testing purposes.

## Overview

The application supports a "testing mode" that bypasses wallet connection and payment verification, making it easier to test file upload functionality without requiring actual cryptocurrency transactions.

## How to Enable/Disable Testing Mode

### Frontend (Next.js)

Edit `frontend/.env.local`:

```bash
# Enable testing mode (skip wallet & payment checks)
NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=true

# Disable testing mode (require wallet & payment)
NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=false
```

**Note**: After changing this variable, you must restart the Next.js development server:
```bash
cd frontend
npm run dev
```

### Backend (Node.js)

Edit `backend/.env`:

```bash
# Enable testing mode (skip payment verification)
SKIP_PAYMENT_VERIFICATION=true

# Disable testing mode (require payment verification)
SKIP_PAYMENT_VERIFICATION=false
```

**Note**: After changing this variable, you must restart the backend server:
```bash
cd backend
npm run dev
```

## Testing Mode Behavior

When testing mode is **enabled** (`true`):

### Frontend
- ✅ Wallet connection component is hidden
- ✅ Wallet connection check is bypassed
- ✅ Payment modal is skipped
- ✅ Files upload immediately after selection
- ✅ Yellow banner shows "Testing Mode" indicator

### Backend
- ✅ Payment verification is skipped
- ✅ All uploads are accepted regardless of payment status
- ✅ Console logs show "TESTING MODE" warnings

When testing mode is **disabled** (`false` or removed):

### Frontend
- ❌ Wallet connection required
- ❌ Payment modal shown before upload
- ❌ User must complete payment flow

### Backend
- ❌ Payment verification enforced
- ❌ Uploads rejected if payment is missing or insufficient

## Production Deployment

⚠️ **IMPORTANT**: Before deploying to production, ensure testing mode is disabled:

1. Set `NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=false` in production environment
2. Set `SKIP_PAYMENT_VERIFICATION=false` in production environment
3. Or remove these variables entirely (default behavior requires payment)

## Quick Toggle for Local Development

**Enable testing mode:**
```bash
# Frontend
echo "NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=true" >> frontend/.env.local

# Backend
echo "SKIP_PAYMENT_VERIFICATION=true" >> backend/.env
```

**Disable testing mode:**
```bash
# Frontend
sed -i '' 's/NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=true/NEXT_PUBLIC_SKIP_PAYMENT_CHECKS=false/' frontend/.env.local

# Backend
sed -i '' 's/SKIP_PAYMENT_VERIFICATION=true/SKIP_PAYMENT_VERIFICATION=false/' backend/.env
```

## Security Considerations

- Testing mode should **NEVER** be enabled in production
- These environment variables provide a convenient toggle without code changes
- The yellow banner on the frontend clearly indicates when testing mode is active
- Backend logs warn when payment verification is skipped

## Troubleshooting

**Changes not taking effect?**
- Restart both frontend and backend servers after changing environment variables
- Clear browser cache if needed
- Check that the `.env` files are in the correct locations

**Still seeing wallet requirement?**
- Verify the environment variable is set to exactly `true` (lowercase)
- Check that you're editing the correct `.env` file (`.env.local` for frontend, `.env` for backend)
- Restart the development servers

**Testing chunked uploads:**
- Testing mode works for both single-file and chunked uploads
- Upload files > 16 MB to test chunking behavior
- Progress indicator shows chunk progress even in testing mode
