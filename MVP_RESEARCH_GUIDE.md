# MVP Crypto Payments Research Guide - EigenDA Focus

## Goal
Research the minimal technical requirements to implement basic crypto payments for EigenDA file storage - users deposit crypto, files stay alive beyond 14 days through automatic deductions.

## Current State
- Files upload to EigenDA via proxy
- Auto-refresh every 14 days (currently free)
- Need to add: crypto deposits → pay for refreshes

## Core Research Questions (MVP Only)

### 1. EigenDA Cost Structure
**Essential Info Needed:**
- What does it cost to store/refresh a blob on EigenDA v2? (exact numbers)
- How are these costs paid currently? (gas fees, tokens, etc.)
- Can we programmatically estimate costs for X number of refreshes?

### 2. Simple Payment Smart Contract
**Research Focus:**
- Basic escrow pattern: deposit ETH → hold for fileId → deduct on refresh
- OpenZeppelin SafeMath and ReentrancyGuard (security basics)
- One function each: `deposit(fileId)`, `deduct(fileId, amount)`, `getBalance(fileId)`

### 3. Backend Integration (Minimal)
**Key Questions:**
- How to connect Node.js backend to smart contract? (ethers.js basics)
- How to securely store one private key for automated deductions?
- How to call contract.deduct() from existing refresh job?

### 4. Frontend Wallet Connection (Basic)
**Research Scope:**
- Simplest wallet connection for Next.js (MetaMask only for MVP)
- One payment modal: connect wallet → enter ETH amount → send to contract
- Display current balance from contract

### 5. Cost Calculation (Simple)
**Need to Answer:**
- How to estimate: "X ETH = Y refresh cycles = Z days of storage"
- Fixed pricing model (no dynamic oracles for MVP)
- Simple math: `totalCost = refreshCost * numberOfRefreshes`

## What NOT to Research (Save for Later)
- ❌ Multi-chain support
- ❌ Multiple tokens (USDC, DAI)
- ❌ Complex price oracles
- ❌ Upgradeable contracts
- ❌ Layer 2 optimization
- ❌ Batch operations
- ❌ Advanced security audits
- ❌ Mobile wallet support beyond MetaMask
- ❌ Complex UX flows

## MVP Success Criteria
1. User uploads file
2. User deposits 0.01 ETH via MetaMask
3. File automatically refreshes using deposited funds
4. User sees remaining balance and estimated days left
5. System works for 30+ days without manual intervention

## Research Deliverables
For each area, provide:
1. **Simplest working example** (code snippet preferred)
2. **One recommended tool/library** (not comparisons)
3. **MVP-specific gotchas** (what breaks in simple implementations)
4. **Cost estimates** (gas fees, development time)

## Timeline
Target: Working MVP in 2-3 weeks, not months.
Focus on "good enough" solutions that can be improved later.