import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

export const createMarketSchema = z.object({
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(100, 'Question must not exceed 100 characters')
    .refine((val) => val.trim().length >= 10, 'Question cannot be only whitespace'),
  
  endDate: z.coerce
    .date()
    .refine((date) => date > new Date(), { message: "End date must be in the future" })
    .refine((date) => date.getTime() - Date.now() >= 3600 * 1000, { message: "Duration must be at least 1 hour" })
    .refine((date) => date.getTime() - Date.now() <= 31536000 * 1000, { message: "Duration must not exceed 1 year" }),
  
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
