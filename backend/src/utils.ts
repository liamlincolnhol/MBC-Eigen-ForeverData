export function calculateExpiry(days: number = 30): string {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + safeDays);
  
  // Format as SQLite datetime: YYYY-MM-DD HH:MM:SS
  const year = expiry.getFullYear();
  const month = String(expiry.getMonth() + 1).padStart(2, '0');
  const day = String(expiry.getDate()).padStart(2, '0');
  const hours = String(expiry.getHours()).padStart(2, '0');
  const minutes = String(expiry.getMinutes()).padStart(2, '0');
  const seconds = String(expiry.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getRemainingDays(expiry: string): number {
  const expiryDate = new Date(expiry);
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isExpired(expiry: string): boolean {
  return getRemainingDays(expiry) <= 0;
}
