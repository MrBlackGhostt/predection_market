use crate::errors::Errors;
use crate::states::{Market, Status};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(outcome: bool)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
}

impl<'info> ResolveMarket<'info> {
    pub fn resolve_market(&mut self, outcome: bool) -> Result<()> {
        let clock = Clock::get()?;

        // Check market is still Open
        require!(
            matches!(self.market.status, Status::Open),
            Errors::InvalidMarketStatus
        );

        // Check resolver is the market authority
        require!(
            self.resolver.key() == self.market.authority,
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
