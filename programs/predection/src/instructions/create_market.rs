use crate::states::{Market, MarketOption, Status};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(market_id: u64, question: String)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub market_creator: Signer<'info>,

    #[account(
        init,
        payer = market_creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_creator.key().as_ref(), &market_id.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// External mint (USDC or any SPL token)  
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = market_creator,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"yes_mint", market.key().as_ref()],
        bump
    )]
    pub yes_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = market_creator,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"no_mint", market.key().as_ref()],
        bump
    )]
    pub no_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = market_creator,
        associated_token::mint = collateral_mint,
        associated_token::authority = market,
        associated_token::token_program = token_program
    )]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateMarket<'info> {
    pub fn create_market(
        &mut self,
        resolver: Pubkey,
        market_id: u64,
        question: String,
        duration_time: i64,
        fee: u64,
        bump: u8,
    ) -> Result<()> {
        self.market.market_id = market_id;
        self.market.bump = bump;
        self.market.fee = fee;
        self.market.authority = self.market_creator.key();
        self.market.resolver = resolver;
        self.market.market_vault = self.market_vault.key();
        self.market.fee_collector = self.market_creator.key();
        self.market.status = Status::Open;
        self.market.yes_mint = self.yes_mint.key();
        self.market.no_mint = self.no_mint.key();
        self.market.collateral_mint = self.collateral_mint.key();
        let clock = Clock::get()?;
        self.market.resolution_time = clock.unix_timestamp;
        self.market.market_close_timestamp = self.market.resolution_time + duration_time;
        self.market.question = question;
        Ok(())
    }
}
