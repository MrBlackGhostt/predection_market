use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::errors::Errors;
use crate::states::{Market, Status};

#[derive(Accounts)]
#[instruction(amount: u64, is_yes: bool)]
pub struct SellShare<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()], bump)]
    pub market: Box<Account<'info, Market>>,

    #[account(mut, associated_token::mint = collateral_mint,
        associated_token::authority = market,
        associated_token::token_program = token_program,
        constraint = market_vault.key() == market.market_vault @ Errors::InvalidVault
    )]
    pub market_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, constraint = collateral_mint.key() == market.collateral_mint @ Errors::InvalidMint)]
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = signer
    )]
    pub user_collateral_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, 
        seeds=[b"yes_mint", market.key().as_ref()], 
        bump
    )]
    pub yes_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, 
        seeds=[b"no_mint", market.key().as_ref()], 
        bump
    )]
    pub no_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut,
        associated_token::mint = yes_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program
    )]
    pub yes_mint_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut,
        associated_token::mint = no_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program
    )]
    pub no_mint_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> SellShare<'info> {
    pub fn sell_share(&mut self, amount: u64, is_yes: bool) -> Result<()> {
        require!(
            matches!(self.market.status, Status::Open),
            Errors::InvalidMarketStatus
        );

        let seeds = &[
            b"market",
            self.market.authority.as_ref(),
            &self.market.market_id.to_le_bytes(),
            &[self.market.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        if is_yes {
            // Burn YES tokens
            let burn_ctx = CpiContext::new(
                self.token_program.to_account_info(),
                Burn {
                    mint: self.yes_mint.to_account_info(),
                    from: self.yes_mint_ata.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            );
            token_interface::burn(burn_ctx, amount)?;
        } else {
            // Burn NO tokens
            let burn_ctx = CpiContext::new(
                self.token_program.to_account_info(),
                Burn {
                    mint: self.no_mint.to_account_info(),
                    from: self.no_mint_ata.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            );
            token_interface::burn(burn_ctx, amount)?;
        }

        // Transfer USDC from vault to user
        let transfer_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            TransferChecked {
                mint: self.collateral_mint.to_account_info(),
                from: self.market_vault.to_account_info(),
                to: self.user_collateral_ata.to_account_info(),
                authority: self.market.to_account_info(),
            },
            signer_seeds,
        );

        token_interface::transfer_checked(transfer_ctx, amount, self.collateral_mint.decimals)?;

        Ok(())
    }
}
