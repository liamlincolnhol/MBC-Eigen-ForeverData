/**
 * CoinGecko API integration for ETH/USD price
 * Free API - no key required
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface CoinGeckoPriceResponse {
  ethereum: {
    usd: number;
  };
}

let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Fetch current ETH/USD price from CoinGecko
 * Cached for 1 minute to avoid rate limits
 */
export async function getEthPrice(): Promise<number> {
  const now = Date.now();

  // Return cached price if still fresh
  if (cachedPrice && (now - cachedPrice.timestamp) < CACHE_DURATION) {
    return cachedPrice.price;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }

    const data: CoinGeckoPriceResponse = await response.json();
    const price = data.ethereum.usd;

    // Update cache
    cachedPrice = { price, timestamp: now };

    return price;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    // Return fallback price if API fails
    return 2400; // Reasonable fallback
  }
}

/**
 * Convert ETH amount to USD
 */
export async function ethToUsd(ethAmount: number): Promise<number> {
  const ethPrice = await getEthPrice();
  return ethAmount * ethPrice;
}

/**
 * Format USD amount with $ and commas
 */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
