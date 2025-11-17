'use client'

import { wagmiAdapter, projectId, appKitCustomRpcUrls } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { sepolia } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && process.env.NODE_ENV !== 'production') {
  console.warn('[Context] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set - using placeholder projectId')
}

// Set up metadata
const metadata = {
  name: 'ForeverData',
  description: 'Permanent decentralized file storage powered by EigenDA',
  url: 'https://foreverdata.live',
  icons: ['https://foreverdata.live/icon.png']
}

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [sepolia],
  defaultNetwork: sepolia,
  metadata: metadata,
  customRpcUrls: appKitCustomRpcUrls,
  enableNetworkSwitch: false,
  enableReconnect: false,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
