use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum Status {
    Open,
    Resolved,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum MarketOption {
    True,
    False,
}

#[derive(InitSpace)]
#[account]
pub struct Market {
    pub market_id: u64,
    pub authority: Pubkey,
    pub resolver: Pubkey,
    pub resolution_time: i64,
    pub option: Option<bool>,
    pub status: Status,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub market_vault: Pubkey,
    pub collateral_mint: Pubkey,
    pub total_yes_mint_supply: u64,
    pub total_no_mint_supply: u64,
    pub market_close_timestamp: i64,
    #[max_len(100)]
    pub question: String,
    pub fee_collector: Pubkey,
    pub fee_collector_ata: Pubkey,
    pub fee: u64,
    pub bump: u8,
}
