export function calculateExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14); // 14 days from now
  return expiry.toISOString();
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
