use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

use instructions::*;

declare_id!("xU2NJKXuSyyrGC8ntDjUG6ESH1YB6CNtivV8MTG9YGV");

#[program]
pub mod predection {
    use super::*;

    pub fn initialize(
        ctx: Context<CreateMarket>,
        resolver: Pubkey,
        market_id: u64,
        question: String,
        duration_time: i64,
        fee: u64,
    ) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let bump = ctx.bumps.market;
        ctx.accounts
            .create_market(resolver, market_id, question, duration_time, fee, bump)
    }

    pub fn buy_share(
        ctx: Context<BuyShare>,
        amount: u64,
        market_id: u64,
        is_yes: bool,
    ) -> Result<()> {
        ctx.accounts.buy_share(amount, is_yes)
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        ctx.accounts.resolve_market(outcome)
    }

    pub fn claim_winning(ctx: Context<ClaimWinning>) -> Result<()> {
        let yes_bump = ctx.bumps.yes_mint;
        let no_bump = ctx.bumps.no_mint;
        ctx.accounts.claim_winning(yes_bump, no_bump)?;
        Ok(())
    }
}
