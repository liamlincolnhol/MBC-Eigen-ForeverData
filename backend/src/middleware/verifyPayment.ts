import { Request, Response, NextFunction } from 'express';
import { calculateRequiredPayment, verifyPayment } from '../utils/payments.js';
import { PaymentDetails } from '../types/payments.js';

export async function verifyPaymentMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const fileId = req.params.fileId;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    try {
        // Calculate required payment based on file size
        const payment = calculateRequiredPayment(file.size);

        // Check if payment exists and is sufficient
        const isValid = await verifyPayment(fileId, payment.requiredAmount);

        if (!isValid) {
            return res.status(402).json({
                error: 'Payment required',
                details: {
                    requiredAmount: payment.requiredAmount.toString(),
                    estimatedDuration: payment.estimatedDuration,
                    breakdown: {
                        storageCost: payment.breakdown.storageCost.toString(),
                        gasCost: payment.breakdown.gasCost.toString()
                    }
                }
            });
        }

        // Add payment info to request for later use
        req.paymentDetails = payment;
        next();
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
}

// Types
declare global {
    namespace Express {
        interface Request {
            paymentDetails?: any;
        }
    }
}
