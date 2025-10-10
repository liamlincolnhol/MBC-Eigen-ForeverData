interface EigenDAConfig {
  proxyUrl: string;
  timeout: number;
  mode: 'memstore' | 'testnet' | 'mainnet';
}

export const eigenDAConfig: EigenDAConfig = {
  proxyUrl: process.env.EIGENDA_PROXY_URL || 'http://localhost:3100',
  timeout: process.env.EIGENDA_TIMEOUT 
    ? parseInt(process.env.EIGENDA_TIMEOUT) 
    : (process.env.NODE_ENV === 'production' ? 20 * 60 * 1000 : 5000), // 20 min for real, 5s for memstore
  mode: (process.env.EIGENDA_MODE as 'memstore' | 'testnet' | 'mainnet') || 'memstore'
};

// Utility function to log configuration on startup
export function logEigenDAConfig() {
  console.log(`EigenDA Configuration:`);
  console.log(`  Mode: ${eigenDAConfig.mode}`);
  console.log(`  Proxy URL: ${eigenDAConfig.proxyUrl}`);
  console.log(`  Timeout: ${eigenDAConfig.timeout}ms`);
}