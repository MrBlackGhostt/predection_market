use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

use crate::errors::Errors;
use crate::states::{Market, Status};

#[derive(Accounts)]
#[instruction( is_yes:bool)]
pub struct BuyShare<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    //predection-market
    #[account(seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],bump)]
    pub market: Account<'info, Market>,

    #[account(mut, constraint = market_vault.key() == market.market_vault @ Errors::InvalidVault)]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = collateral_mint.key() == market.collateral_mint @ Errors::InvalidMint)]
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    //user collateral_mint_ata:
    pub user_collateral_mint_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, 
    seeds=[b"yes_mint",market.key().as_ref()], 
        bump
    )]
    pub yes_mint: InterfaceAccount<'info, Mint>,

    //no mint
    #[account(mut, 
    seeds=[b"no_mint",market.key().as_ref()], 
        bump
    )]
    pub no_mint: InterfaceAccount<'info, Mint>,

    #[account(init_if_needed,
        payer= signer,
         associated_token::mint = yes_mint,
    associated_token::authority = signer,
    associated_token::token_program = token_program
    )]
    pub yes_mint_ata: InterfaceAccount<'info, TokenAccount>,

    //no_mint_ata
    #[account(init_if_needed,
        payer=signer,
         associated_token::mint = no_mint,
    associated_token::authority = signer,
    associated_token::token_program = token_program
    )]
    pub no_mint_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> BuyShare<'info> {
    pub fn buy_share(&mut self, amount: u64, is_yes: bool,  ) -> Result<()> {
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
        let net_amount = amount
            .checked_sub(fee_amount)
            .ok_or(Errors::ErrorInvalidAmount)?;

        // Transfer full amount to market vault
        let ctx_acc = TransferChecked {
            mint: self.collateral_mint.to_account_info(),
            from: self.user_collateral_mint_ata.to_account_info(),
            to: self.market_vault.to_account_info(),
            authority: self.signer.to_account_info(),
        };

        let ctx = CpiContext::new(self.token_program.to_account_info(), ctx_acc);

        token_interface::transfer_checked(ctx, amount, self.collateral_mint.decimals)?;

        // Transfer fee to fee collector (if fee > 0)
        if fee_amount > 0 {
            // Note: In production, you'd transfer from vault to fee_collector
            // For now, we'll track it in the market account
            msg!("Fee collected: {} ({} BPS)", fee_amount, self.market.fee);
        }

        //mint the yes & no token accoringly

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

            token_interface::mint_to(ctx, amount)?;
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

            token_interface::mint_to(ctx, amount)?;
        }
        Ok(())
    }
}
