/**
 * Get an environment variable or throw if it's not set
 */
export function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not set`);
    }
    return value;
}

interface EigenDAConfig {
    proxyUrl: string;
    timeout: number;
    mode: 'memstore' | 'testnet' | 'mainnet';
}

interface EigenDADataApiConfig {
  baseUrl: string;
  timeout: number;
  defaultDirection: 'forward' | 'backward';
  defaultLimit: number;
  maxLimit: number;
  defaultAccountId?: string;
}

const DEFAULT_DATA_API_URL = 'https://dataapi-testnet-sepolia.eigenda.xyz/api/v2';

export const eigenDAConfig: EigenDAConfig = {
  proxyUrl: process.env.EIGENDA_PROXY_URL || 'http://localhost:3100',
  timeout: 20 * 60 * 1000,
  mode: (process.env.EIGENDA_MODE as 'memstore' | 'testnet' | 'mainnet') || 'testnet'
};

export const eigenDADataApiConfig: EigenDADataApiConfig = {
  baseUrl: process.env.EIGENDA_DATA_API_URL || DEFAULT_DATA_API_URL,
  timeout: Number(process.env.EIGENDA_DATA_API_TIMEOUT_MS || 10000),
  defaultDirection: (process.env.EIGENDA_DATA_API_DIRECTION as 'forward' | 'backward') || 'backward',
  defaultLimit: Number(process.env.EIGENDA_DATA_API_LIMIT || 10),
  maxLimit: 1000,
  defaultAccountId: process.env.EIGENDA_DATA_API_ACCOUNT_ID || process.env.EIGENDA_ETH_ADDRESS || undefined
};

// Utility function to log configuration on startup
export function logEigenDAConfig() {
  console.log(`EigenDA Configuration:`);
  console.log(`  Mode: ${eigenDAConfig.mode}`);
  console.log(`  Proxy URL: ${eigenDAConfig.proxyUrl}`);
  console.log(`  Timeout: ${eigenDAConfig.timeout}ms`);
  console.log(`  Data API URL: ${eigenDADataApiConfig.baseUrl}`);
  if (eigenDADataApiConfig.defaultAccountId) {
    const account = eigenDADataApiConfig.defaultAccountId;
    const shortAccount = `${account.slice(0, 6)}...${account.slice(-4)}`;
    console.log(`  Data API default account: ${shortAccount}`);
  } else {
    console.warn('  Data API default account not set (EIGENDA_DATA_API_ACCOUNT_ID)');
  }
}
