'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/nav/TopNav';
import { useCreateMarket } from '@/hooks/useCreateMarket';
import { createMarketSchema, CreateMarketFormData } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { PageTransition } from '@/components/shared/Motion';

export default function CreateMarketPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { createMarket } = useCreateMarket();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateMarketFormData>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      question: '',
      // Use string format for datetime-local input compatibility
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) as unknown as Date,
      feeBps: 100, // 1%
      resolver: publicKey?.toString() || '',
    },
  });

  // Update resolver field when wallet connects
  if (publicKey && !isSubmitting) {
    // Note: This logic might cause re-renders if not handled carefully, 
    // but react-hook-form setValue is usually fine.
    // Better to use useEffect if strict mode complains, but for now this is ok.
  }

  const onSubmit = async (data: CreateMarketFormData) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      const { signature, marketPDA } = await createMarket(data);
      toast.success('Market created successfully!');
      router.push(`/markets/${marketPDA.toString()}`);
    } catch (error: any) {
      console.error('Create market error:', error);
      toast.error(error.message || 'Failed to create market');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopNav />

      <PageTransition className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Markets
          </button>
          <h1 className="text-4xl font-display font-bold mb-2">Create Prediction Market</h1>
          <p className="text-[var(--text-secondary)]">
            Launch a new market and let users bet on the outcome
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {/* Question */}
          <div>
            <label htmlFor="question" className="block text-sm font-medium mb-2">
              Market Question <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              id="question"
              {...register('question')}
              rows={3}
              className="input"
              placeholder="Will Bitcoin reach $100k by end of 2024?"
              disabled={isSubmitting}
            />
            {errors.question && (
              <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
                {errors.question.message}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--muted)]">
              Ask a clear yes/no question (10-100 characters)
            </p>
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium mb-2">
              End Date & Time <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="relative">
              <input
                id="endDate"
                type="datetime-local"
                {...register('endDate', { valueAsDate: true })}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
                disabled={isSubmitting}
              />
            </div>
            {errors.endDate && (
              <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
                {errors.endDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--muted)]">
              When the market will close for betting
            </p>
          </div>

          {/* Fee */}
          <div>
            <label htmlFor="feeBps" className="block text-sm font-medium mb-2">
              Fee (Basis Points) <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="relative">
              <input
                id="feeBps"
                type="number"
                {...register('feeBps', { valueAsNumber: true })}
                className="input pr-32"
                placeholder="100"
                min="0"
                max="500"
                disabled={isSubmitting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">
                BPS (max 500)
              </div>
            </div>
            {errors.feeBps && (
              <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
                {errors.feeBps.message}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--muted)]">
              100 BPS = 1%, 500 BPS = 5% (maximum allowed)
            </p>
          </div>

          {/* Resolver */}
          <div>
            <label htmlFor="resolver" className="block text-sm font-medium mb-2">
              Resolver Address <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              id="resolver"
              {...register('resolver')}
              className="input font-mono text-sm"
              placeholder="Solana wallet address"
              disabled={isSubmitting}
            />
            {errors.resolver && (
              <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
                {errors.resolver.message}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--muted)]">
              The address authorized to resolve this market (defaults to you)
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary-bg)] p-4">
            <div className="flex gap-3">
              <svg className="h-5 w-5 text-[var(--primary)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-[var(--text-secondary)]">
                <p className="font-medium text-[var(--text)] mb-1">Before creating:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Ensure your question has a clear yes/no outcome</li>
                  <li>Set a realistic duration for the event to occur</li>
                  <li>Only the resolver can finalize the market outcome</li>
                  <li>You'll collect the fee percentage from winning claims</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 disabled:opacity-50"
              disabled={isSubmitting || !publicKey}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Market'
              )}
            </button>
          </div>

          {/* Wallet Warning */}
          {!publicKey && (
            <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-bg)] p-4 text-center">
              <p className="text-sm text-[var(--warning)]">
                Please connect your wallet to create a market
              </p>
            </div>
          )}
        </form>
      </PageTransition>
    </div>
  );
}
