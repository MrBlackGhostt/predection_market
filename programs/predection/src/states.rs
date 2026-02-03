use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum Status {
    NotSetteled,
    Setteled,
    Resolved,
}

#[derive(InitSpace)]
#[account]
pub struct Market {
    pub market_id: u64,
    pub authority: Pubkey,
    pub resolver: Pubkey,
    pub resolution_time: u64,
    pub option: Option<bool>,
    pub status: Option<Status>,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub market_clode_timestamp: i64,
    #[max_len(100)]
    pub question: String,
    pub fee_collector: Pubkey,
    pub fee: u64,
    pub bump: u8,
}
