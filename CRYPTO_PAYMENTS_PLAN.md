# Crypto Payments Implementation Plan

The implementation of the crypto-only payment structure represents the crucial step necessary to move the ForeverData service from the basic MVP state (upload and status tracking) to the **core functional goal** of perpetual storage.

This structure, which relies on crypto deposits and smart contract interaction, was specifically noted as a **MUST NOT HAVE** for the MVP, making it the primary focus for the next development phase.

Here is a plan for implementing the necessary crypto-only payment structure, incorporating the required functionalities and mechanisms detailed in the project goals:

## Phase 1: Smart Contract Development and Deployment

The foundation of the perpetual storage mechanism is the smart contract itself, which acts as the escrow and ledger for file longevity.

| Goal | Implementation Focus | Source Reference |
| :--- | :--- | :--- |
| **Contract Mechanism** | Deploy a **single smart contract** responsible for holding the cryptocurrency balance associated with each file. | |
| **Core Functions** | Implement functions to handle **deposits/withdrawals**. | |
| **Deduction Logic** | Integrate the logic for **per-refresh deductions**. The service must deduct the estimated cost (posting + bandwidth margin) from this balance when a file refresh occurs. | |
| **Payment Standard** | Ensure the contract only accepts **crypto** payments (explicitly **excluding fiat/Stripe**). | |

### Smart Contract Architecture

```solidity
contract ForeverDataPayments {
    mapping(string => uint256) public fileBalances;
    mapping(string => address) public fileOwners;
    
    event Deposit(string fileId, uint256 amount, address depositor);
    event Deduction(string fileId, uint256 amount);
    event Withdrawal(string fileId, uint256 amount, address owner);
    
    function deposit(string memory fileId) external payable;
    function deductRefreshCost(string memory fileId, uint256 cost) external;
    function withdraw(string memory fileId, uint256 amount) external;
    function getBalance(string memory fileId) external view returns (uint256);
}
```

## Phase 2: Backend API and Cost Calculation Expansion

The backend must be expanded to interface with the smart contract and handle all payment calculations, which are currently missing from the MVP API contract.

| Goal | Implementation Focus | Source Reference |
| :--- | :--- | :--- |
| **Wallet Integration** | Establish a secure connection mechanism for the backend to interact with the deployed smart contract (e.g., initiating transactions for deductions). | |
| **Cost Calculation API** | Create new API endpoints that can perform two-way calculations: 1. Convert desired **target duration (days) → required crypto deposit**. 2. Convert a deposited **crypto balance → estimated remaining duration (days)**. | |
| **Metadata Update** | The `FileMetadata` (currently returned by `GET /api/file/:fileId`) must be updated to include the file's current **crypto balance** and **remaining days**. | |
| **Deduction Trigger** | Integrate the cost deduction logic into the existing Refresh Job to automatically reduce the file's balance on the smart contract when a re-upload occurs. | |

### New API Endpoints

```typescript
// Cost calculation endpoints
GET /api/calculate/days-to-funds?days=90
GET /api/calculate/funds-to-days?amount=0.01

// Smart contract interaction endpoints  
POST /api/payments/deposit
POST /api/payments/withdraw
GET /api/payments/balance/:fileId

// Enhanced file metadata
GET /api/metadata/:fileId // Now includes balance and crypto status
```

### Database Schema Updates

```sql
-- Add crypto payment fields to files table
ALTER TABLE files ADD COLUMN contract_address TEXT;
ALTER TABLE files ADD COLUMN crypto_balance DECIMAL(18,8) DEFAULT 0;
ALTER TABLE files ADD COLUMN last_balance_check TIMESTAMP;
ALTER TABLE files ADD COLUMN payment_required BOOLEAN DEFAULT false;
```

## Phase 3: Frontend Payment and Management UI

This phase involves integrating the crypto wallet and building the necessary user interfaces to allow users to pay, monitor funds, and top up.

### 3.1 Wallet Connectivity

The fundamental requirement to interact with a crypto-only system is linking the user's wallet.

*   Implement **wallet connectivity** (e.g., connecting a MetaMask or WalletConnect instance).

```typescript
// New wallet integration components
components/WalletConnect.tsx
components/PaymentModal.tsx
components/BalanceDisplay.tsx
components/TopUpButton.tsx
```

### 3.2 Deposit Interface (The "Upload & Pay" Flow)

The upload flow needs to be extended to allow the user to deposit funds immediately after selecting a file.

| Feature | Implementation Details | Source Reference |
| :--- | :--- | :--- |
| **Crypto Deposit Interface** | Create a dedicated UI screen or modal for depositing crypto (not fiat/cards). | |
| **Funding Flexibility** | Implement two input modes for the user: 1. **"Add Funds":** User enters crypto amount, the UI calls the backend calculation API to display the resultant **estimated storage duration**. 2. **"Target Duration":** User selects a target duration (e.g., 90 days), the UI calls the backend calculation API to display the **required crypto deposit**. | |
| **Optional Calculator** | Implement a simple utility calculator to convert **"funds → days"** and **"days → funds"**. | |
| **Payment Confirmation** | Implement the front-end logic to trigger the smart contract deposit via the connected wallet after the user confirms the funding amount. | |

### 3.3 Dashboard Management Updates

The existing Dashboard Page (`pages/file/[fileId].tsx`) must be enhanced to display financial status and allow for top-ups.

| Feature | Implementation Details | Source Reference |
| :--- | :--- | :--- |
| **Balance Display** | Update the dashboard (likely within the `StatusCard` component, which currently handles time left) to display the file's **remaining days and balance**. | |
| **Low Funds Warning** | Implement conditional logic to display a clear UI warning, such as **"add more to avoid expiry,"** when the file's funds run low. | |
| **Top-Up Functionality** | Add a prominent **"Top Up Funds"** action button that allows users to deposit additional crypto into the file's smart contract balance to extend availability. | |

## Phase 4: Integration with Existing Systems

### 4.1 Refresh Job Integration

Update the existing refresh job to:
- Check smart contract balance before refresh
- Deduct estimated costs from contract
- Skip refresh if insufficient funds
- Update database with new balance

```typescript
// Enhanced refresh job logic
async function refreshFile(fileId: string) {
    const balance = await getContractBalance(fileId);
    const estimatedCost = await calculateRefreshCost(fileId);
    
    if (balance < estimatedCost) {
        await markFileAsPaymentRequired(fileId);
        return;
    }
    
    await deductFromContract(fileId, estimatedCost);
    await performRefresh(fileId);
    await updateBalanceInDB(fileId, balance - estimatedCost);
}
```

### 4.2 Dashboard Component Updates

Enhance the existing Dashboard component to show:
- Crypto balance for each file
- Days remaining based on current balance
- Payment status indicators
- Quick top-up actions

```typescript
interface FileData {
    // Existing fields...
    fileId: string;
    fileName: string;
    status: 'active' | 'expiring_soon' | 'expired';
    
    // New crypto payment fields
    cryptoBalance: number;
    estimatedDaysRemaining: number;
    paymentRequired: boolean;
    contractAddress: string;
}
```

## Implementation Timeline

### Week 1-2: Smart Contract Development
- [ ] Design and implement ForeverDataPayments contract
- [ ] Deploy to testnet
- [ ] Write comprehensive tests
- [ ] Security audit

### Week 3-4: Backend Integration
- [ ] Add Web3 integration to backend
- [ ] Implement cost calculation APIs
- [ ] Update database schema
- [ ] Integrate with refresh job

### Week 5-6: Frontend Wallet Integration
- [ ] Implement wallet connectivity
- [ ] Create payment modals and UI
- [ ] Build cost calculator component
- [ ] Update upload flow

### Week 7-8: Dashboard and Management
- [ ] Enhance dashboard with payment info
- [ ] Implement top-up functionality
- [ ] Add low balance warnings
- [ ] Create payment history tracking

### Week 9-10: Testing and Deployment
- [ ] End-to-end testing
- [ ] Deploy smart contract to mainnet
- [ ] Production deployment
- [ ] User acceptance testing

## Success Criteria

Completing these phases will fulfill the project goal: "Upload a file, **deposit crypto**, get a stable link" and enable the system to automatically **see remaining days and balance**.

The deliverables include:
- **Working public demo** where users can upload files, deposit crypto, and get stable links
- **Automatic refresh system** that keeps files alive beyond 14 days using deposited funds
- **Smart contract** handling all deposits, withdrawals, and per-refresh deductions
- **User interface** showing remaining days, balance, and clear funding prompts

## Technical Considerations

### Security
- Smart contract security audits
- Private key management for backend wallet
- Input validation for all payment operations

### Cost Optimization
- Gas-efficient smart contract design
- Batch operations where possible
- Reasonable refresh cost calculations

### User Experience
- Clear payment flow with progress indicators
- Simple cost calculator
- Intuitive balance and time remaining displays
- Mobile-responsive payment interface

### Scalability
- Contract design supporting thousands of files
- Efficient database queries for payment data
- Caching strategies for balance information