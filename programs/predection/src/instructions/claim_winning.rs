use crate::errors::Errors;
use crate::states::{Market, Status};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

#[derive(Accounts)]
#[instruction(outcome: bool)]
pub struct ClaimWinning<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, seeds=[b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],bump)]
    pub market: Account<'info, Market>,

    #[account(mut,associated_token::mint = collateral_mint,
        associated_token::authority = market,
        associated_token::token_program = token_program,
        constraint=market_vault.key() == market.market_vault @ Errors::InvalidVault )]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = collateral_mint.key() == market.collateral_mint @ Errors::InvalidMint)]
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = signer)]
    pub user_collateral_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, seeds = [b"yes_mint", market.key().as_ref()],         bump, constraint=market.yes_mint == yes_mint.key() @ Errors::InvalidMint)]
    pub yes_mint: InterfaceAccount<'info, Mint>,

    #[account(mut,seeds = [b"no_mint", market.key().as_ref()],
        bump, constraint=market.no_mint == no_mint.key() @ Errors::InvalidMint)]
    pub no_mint: InterfaceAccount<'info, Mint>,

    #[account(mut,  associated_token::mint = yes_mint,
        associated_token::authority = signer,)]
    pub yes_mint_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,  associated_token::mint = no_mint,
        associated_token::authority = signer,)]
    pub no_mint_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> ClaimWinning<'info> {
    pub fn claim_winning(&mut self, _yes_bump: u8, _no_bump: u8) -> Result<()> {
        require!(
            matches!(self.market.status, Status::Resolved),
            Errors::MarketIsSettled
        );

        let user_yes_token_amount = self.yes_mint_ata.amount;
        let user_no_token_amount = self.no_mint_ata.amount;

        let seeds = &[
            b"market",
            self.market.authority.as_ref(),
            &self.market.market_id.to_le_bytes(),
            &[self.market.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        if self.market.option == Some(true) {
            let ctx_burn_acc = Burn {
                mint: self.yes_mint.to_account_info(),
                from: self.yes_mint_ata.to_account_info(),
                authority: self.signer.to_account_info(),
            };

            let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), ctx_burn_acc);
            token_interface::burn(cpi_ctx, user_yes_token_amount)?;

            let ctx_acc = TransferChecked {
                mint: self.collateral_mint.to_account_info(),
                from: self.market_vault.to_account_info(),
                to: self.user_collateral_ata.to_account_info(),
                authority: self.market.to_account_info(),
            };

            let ctx = CpiContext::new(self.token_program.to_account_info(), ctx_acc)
                .with_signer(signer_seeds);

            token_interface::transfer_checked(
                ctx,
                user_yes_token_amount,
                self.collateral_mint.decimals,
            )?;
        } else if self.market.option == Some(false) {
            let ctx_burn_acc = Burn {
                mint: self.no_mint.to_account_info(),
                from: self.no_mint_ata.to_account_info(),
                authority: self.signer.to_account_info(),
            };

            let ctx_burn = CpiContext::new(self.token_program.to_account_info(), ctx_burn_acc);

            token_interface::burn(ctx_burn, self.no_mint_ata.amount)?;

            let ctx_acc = TransferChecked {
                mint: self.collateral_mint.to_account_info(),
                from: self.market_vault.to_account_info(),
                to: self.user_collateral_ata.to_account_info(),
                authority: self.market.to_account_info(),
            };

            let ctx = CpiContext::new(self.token_program.to_account_info(), ctx_acc)
                .with_signer(signer_seeds);

            token_interface::transfer_checked(
                ctx,
                user_no_token_amount,
                self.collateral_mint.decimals,
            )?;
        }

        Ok(())
    }
}
