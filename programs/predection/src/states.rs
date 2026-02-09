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
    pub market_close_timestamp: i64,
    #[max_len(100)]
    pub question: String,

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  FEE STRUCTURE (Protocol + Market Creator)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OLD: All fees went to market creator (centralization risk)
    // NEW: Fees are split 50/50 between protocol treasury and market creator
    //
    // Why split fees?
    // - Protocol treasury funds platform development and security audits
    // - Market creator gets rewarded for creating popular markets
    // - Prevents scam markets (creator only gets 50% of fees)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    pub fee_collector: Pubkey, // Market creator's pubkey (gets 50% of fees)
    pub fee_collector_ata: Pubkey, // Market creator's USDC ATA
    pub protocol_fee_collector: Pubkey, // Protocol treasury pubkey (gets 50% of fees)
    pub protocol_fee_collector_ata: Pubkey, // Protocol treasury's USDC ATA
    pub fee: u64,              // Fee in BPS (100 = 1%)
    pub bump: u8,
}
