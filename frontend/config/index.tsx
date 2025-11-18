import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia } from '@reown/appkit/networks'
import type { CustomRpcUrlMap } from '@reown/appkit-common'

// Get projectId from environment variable with a safe fallback for build-time envs
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && process.env.NODE_ENV !== 'production') {
  console.warn('[Config] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set - using placeholder projectId')
}

// Define networks - using Sepolia testnet and mainnet
const networks = [sepolia]

// Optional: provide custom RPC URLs to avoid rate limits on public endpoints
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
const customRpcUrls: CustomRpcUrlMap = {}

const sepoliaRpcCandidates = [
  sepoliaRpcUrl,
  'https://rpc.sepolia.org'
].filter(Boolean) as string[]

if (sepoliaRpcCandidates.length > 0) {
  const uniqueUrls = Array.from(new Set(sepoliaRpcCandidates))
  customRpcUrls[`eip155:${sepolia.id}`] = uniqueUrls.map(url => ({ url }))
}

if (process.env.NODE_ENV !== 'production') {
  console.log('[Config] Using custom RPC URLs', customRpcUrls)
}

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  customRpcUrls: Object.keys(customRpcUrls).length > 0 ? customRpcUrls : undefined
})

export const config = wagmiAdapter.wagmiConfig
export const appKitCustomRpcUrls = Object.keys(customRpcUrls).length > 0 ? customRpcUrls : undefined

if (process.env.NODE_ENV !== 'production') {
  console.log('[Config] Wagmi chains', config.chains.map(chain => ({
    id: chain.id,
    name: chain.name,
    rpcUrls: chain.rpcUrls
  })))
}
