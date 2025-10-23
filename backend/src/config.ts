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

export const eigenDAConfig: EigenDAConfig = {
  proxyUrl: process.env.EIGENDA_PROXY_URL || 'http://localhost:3100',
  timeout: 20 * 60 * 1000,
  mode: (process.env.EIGENDA_MODE as 'memstore' | 'testnet' | 'mainnet') || 'testnet'
};

// Utility function to log configuration on startup
export function logEigenDAConfig() {
  console.log(`EigenDA Configuration:`);
  console.log(`  Mode: ${eigenDAConfig.mode}`);
  console.log(`  Proxy URL: ${eigenDAConfig.proxyUrl}`);
  console.log(`  Timeout: ${eigenDAConfig.timeout}ms`);
}