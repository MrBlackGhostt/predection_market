use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

use crate::errors::Errors;
use crate::states::{Market, Status};

#[derive(Accounts)]
#[instruction(amount: u64, _market_id: u64, is_yes: bool)]
pub struct BuyShare<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  FEE COLLECTORS (50/50 split)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Market Creator's ATA (receives 50% of fees)
    #[account(mut, 
        constraint = fee_collector_ata.owner == market.fee_collector @ Errors::InvalidMarketFeeCollector,
        constraint = fee_collector_ata.mint == collateral_mint.key() @ Errors::InvalidMint
    )]
    pub fee_collector_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // Protocol Treasury's ATA (receives 50% of fees)
    #[account(mut,
        constraint = protocol_fee_collector_ata.owner == market.protocol_fee_collector @ Errors::InvalidProtocolFeeCollector,
        constraint = protocol_fee_collector_ata.mint == collateral_mint.key() @ Errors::InvalidMint
    )]
    pub protocol_fee_collector_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    //predection-market
    //  OPTIMIZATION: Box reduces stack usage by heap-allocating large structs
    #[account(seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],bump)]
    pub market: Box<Account<'info, Market>>,

    #[account(mut, constraint = market_vault.key() == market.market_vault @ Errors::InvalidVault)]
    pub market_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, constraint = collateral_mint.key() == market.collateral_mint @ Errors::InvalidMint)]
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    // User's USDC ATA (they pay from here)
    #[account(mut,
        constraint = user_collateral_mint_ata.mint == collateral_mint.key() @ Errors::InvalidMint
    )]
    pub user_collateral_mint_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, 
    seeds=[b"yes_mint",market.key().as_ref()], 
        bump
    )]
    pub yes_mint: Box<InterfaceAccount<'info, Mint>>,

    //no mint
    #[account(mut, 
    seeds=[b"no_mint",market.key().as_ref()], 
        bump
    )]
    pub no_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(init_if_needed,
        payer= signer,
         associated_token::mint = yes_mint,
    associated_token::authority = signer,
    associated_token::token_program = token_program
    )]
    pub yes_mint_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    //no_mint_ata
    #[account(init_if_needed,
        payer=signer,
         associated_token::mint = no_mint,
    associated_token::authority = signer,
    associated_token::token_program = token_program
    )]
    pub no_mint_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> BuyShare<'info> {
    pub fn buy_share(&mut self, amount: u64, is_yes: bool) -> Result<()> {
        let signer_bal = self.user_collateral_mint_ata.amount;
        println!("Signer collateral_mint balance:  {}", signer_bal);

        require_gte!(signer_bal, amount, Errors::ErrorInvalidAmount);

        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp < self.market.market_close_timestamp,
            Errors::MarketFinished
        );

        require!(
            matches!(self.market.status, Status::Open),
            Errors::InvalidMarketStatus
        );

        // Calculate fee (fee is in BPS: 100 = 1%)
        let fee_amount = (amount * self.market.fee) / 10000;

        // Transfer full amount to market vault
        let ctx_acc = TransferChecked {
            mint: self.collateral_mint.to_account_info(),
            from: self.user_collateral_mint_ata.to_account_info(),
            to: self.market_vault.to_account_info(),
            authority: self.signer.to_account_info(),
        };

        let ctx = CpiContext::new(self.token_program.to_account_info(), ctx_acc);

        let net_amount = amount
            .checked_sub(fee_amount)
            .ok_or(Errors::ErrorInvalidAmount)?;

        token_interface::transfer_checked(ctx, net_amount, self.collateral_mint.decimals)?;

        if is_yes {
            let mint_acc = MintTo {
                mint: self.yes_mint.to_account_info(),
                to: self.yes_mint_ata.to_account_info(),
                authority: self.market.to_account_info(),
            };
            let market_creator_key = self.market.authority;
            let seeds = &[
                b"market",
                market_creator_key.as_ref(),
                &self.market.market_id.to_le_bytes(),
                &[self.market.bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let ctx = CpiContext::new(self.token_program.to_account_info(), mint_acc)
                .with_signer(signer_seeds);

            token_interface::mint_to(ctx, net_amount)?;
        } else {
            let mint_acc = MintTo {
                mint: self.no_mint.to_account_info(),
                to: self.no_mint_ata.to_account_info(),
                authority: self.market.to_account_info(),
            };
            let market_creator_key = self.market.authority;
            let seeds = &[
                b"market",
                market_creator_key.as_ref(),
                &self.market.market_id.to_le_bytes(),
                &[self.market.bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let ctx = CpiContext::new(self.token_program.to_account_info(), mint_acc)
                .with_signer(signer_seeds);

            token_interface::mint_to(ctx, net_amount)?;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 💰 FEE DISTRIBUTION: 50% Protocol + 50% Market Creator
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // OLD SYSTEM (Centralized):
        //   - 100% of fees went to market creator
        //   - Incentivized scam markets
        //
        // NEW SYSTEM (Decentralized):
        //   - 50% goes to protocol treasury (funds audits, development)
        //   - 50% goes to market creator (rewards quality markets)
        //   - Reduces scam incentive while still rewarding creators
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if fee_amount > 0 {
            // Calculate 50/50 split
            let protocol_fee = fee_amount / 2; // 50% to protocol
            let creator_fee = fee_amount - protocol_fee; // Remaining 50% to creator (handles odd numbers)

            // Transfer 50% to protocol treasury
            let ctx_protocol = TransferChecked {
                mint: self.collateral_mint.to_account_info(),
                from: self.user_collateral_mint_ata.to_account_info(),
                to: self.protocol_fee_collector_ata.to_account_info(),
                authority: self.signer.to_account_info(),
            };
            let ctx = CpiContext::new(self.token_program.to_account_info(), ctx_protocol);
            token_interface::transfer_checked(ctx, protocol_fee, self.collateral_mint.decimals)?;

            // Transfer 50% to market creator
            let ctx_creator = TransferChecked {
                mint: self.collateral_mint.to_account_info(),
                from: self.user_collateral_mint_ata.to_account_info(),
                to: self.fee_collector_ata.to_account_info(),
                authority: self.signer.to_account_info(),
            };
            let ctx = CpiContext::new(self.token_program.to_account_info(), ctx_creator);
            token_interface::transfer_checked(ctx, creator_fee, self.collateral_mint.decimals)?;

            msg!("💰 Fee Distribution:");
            msg!("  Total Fee: {} ({} BPS)", fee_amount, self.market.fee);
            msg!("  Protocol (50%): {}", protocol_fee);
            msg!("  Creator (50%): {}", creator_fee);
        }

        Ok(())
    }
}
