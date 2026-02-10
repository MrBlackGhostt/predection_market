import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

export const createMarketSchema = z.object({
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(100, 'Question must not exceed 100 characters')
    .refine((val) => val.trim().length >= 10, 'Question cannot be only whitespace'),
  
  durationHours: z
    .number()
    .min(1, 'Duration must be at least 1 hour')
    .max(8760, 'Duration must not exceed 1 year (8760 hours)')
    .int('Duration must be a whole number'),
  
  feeBps: z
    .number()
    .min(0, 'Fee must be at least 0')
    .max(500, 'Fee must not exceed 5% (500 BPS)')
    .int('Fee must be a whole number'),
  
  resolver: z
    .string()
    .refine((val) => {
      try {
        new PublicKey(val);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid Solana address'),
});

export type CreateMarketFormData = z.infer<typeof createMarketSchema>;
