export interface DeploymentInfo {
    ForeverDataPayments: {
        address: string;
        network: string;
        timestamp: string;
    };
}

export interface PaymentDetails {
    requiredAmount: bigint;
    estimatedDuration: number;
    breakdown: {
        storageCost: bigint;
        gasCost: bigint;
    };
}

export interface PaymentVerification {
    isValid: boolean;
    details?: PaymentDetails;
    error?: string;
}

export interface FilePayment {
    fileId: string;
    payerAddress: string;
    amount: string;  // Wei amount as string
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: string;
}
