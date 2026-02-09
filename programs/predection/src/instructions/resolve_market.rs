use crate::errors::Errors;
use crate::states::{Market, Status};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
#[instruction(outcome: bool)]
pub struct ResolveMarket<'info> {
    #[account(mut,
constraint = *resolver.key == market.resolver @ Errors::InvalidMarketResolver
    )
]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut, seeds = [b"yes_mint", market.key().as_ref()],         bump, constraint=market.yes_mint == yes_mint.key() @ Errors::InvalidMint)]
    pub yes_mint: InterfaceAccount<'info, Mint>,

    #[account(mut,seeds = [b"no_mint", market.key().as_ref()],
        bump, constraint=market.no_mint == no_mint.key() @ Errors::InvalidMint)]
    pub no_mint: InterfaceAccount<'info, Mint>,
}

impl<'info> ResolveMarket<'info> {
    pub fn resolve_market(&mut self, outcome: bool) -> Result<()> {
        let clock = Clock::get()?;

        // Check market is still Open
        require!(
            matches!(self.market.status, Status::Open),
            Errors::InvalidMarketStatus
        );

        require!(
            self.yes_mint.supply > 0 && self.no_mint.supply > 0,
            Errors::CannotResolveOnesideMarket
        );

        // Check resolver is the market authority
        require!(
            self.resolver.key() == self.market.resolver,
            Errors::InvalidMarketAuthority
        );

        // Check deadline has passed
        require!(
            clock.unix_timestamp >= self.market.market_close_timestamp,
            Errors::MarketNotClosed
        );

        // Set the outcome
        self.market.option = Some(outcome);
        self.market.status = Status::Resolved;

        msg!("Market resolved! Outcome: {}", outcome);
        msg!("YES tokens: {}", if outcome { "WINNERS" } else { "LOSERS" });
        msg!("NO tokens: {}", if outcome { "LOSERS" } else { "WINNERS" });

        Ok(())
    }
}
