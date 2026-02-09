use crate::{
    errors::Errors,
    states::{Market, Status},
};
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FEE COLLECTOR ACCOUNTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Market Creator's USDC ATA (receives 50% of fees)
    #[account(mut, 
   constraint = fee_collector_colletral_ata.mint == collateral_mint.key() @ Errors::InvalidMarketFeeCollectorAta,
    )]
    pub fee_collector_colletral_ata: InterfaceAccount<'info, TokenAccount>,

    // Protocol Treasury's USDC ATA (receives 50% of fees)
    /// CHECK: This is the protocol's fee collector account (treasury)
    pub protocol_fee_collector: UncheckedAccount<'info>,

    #[account(mut,
        constraint = protocol_fee_collector_ata.mint == collateral_mint.key() @ Errors::InvalidProtocolFeeCollector,
    )]
    pub protocol_fee_collector_ata: InterfaceAccount<'info, TokenAccount>,

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

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  SECURITY: COLLATERAL WHITELIST
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Why? Without a whitelist, anyone can create a market with a fake "USDC" token
        // they control, trick users into depositing real USDC, then drain the vault.
        //
        // Whitelisted tokens:
        // - USDC Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        // - USDC Devnet:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (Devnet faucet)
        // - Add more trusted tokens as needed (USDT, SOL-wrapped, etc.)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // USDC on Mainnet-Beta
        const USDC_MAINNET: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        // USDC on Devnet (from Solana token faucet)
        const USDC_DEVNET: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

        let usdc_mainnet = USDC_MAINNET.parse::<Pubkey>().unwrap();
        let usdc_devnet = USDC_DEVNET.parse::<Pubkey>().unwrap();

        let collateral_key = self.collateral_mint.key();

        // Check if collateral_mint is in the whitelist
        require!(
            collateral_key == usdc_mainnet || collateral_key == usdc_devnet,
            Errors::CollateralNotWhitelisted
        );

        msg!("✅ Collateral mint validated: {}", collateral_key);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // VALIDATION: Duration, Fee, Resolver
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        require!(duration_time >= 3600, Errors::DurationTooShort);
        require!(duration_time <= 2592000, Errors::DurationTooLong);
        require_gte!(1000, fee, Errors::FeeIsTooHigh);
        self.market.fee = fee;
        self.market.authority = self.market_creator.key();

        require!(resolver != Pubkey::default(), Errors::InvalidResolver);
        self.market.resolver = resolver;
        self.market.market_vault = self.market_vault.key();

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 💰 FEE COLLECTORS: Protocol (50%) + Market Creator (50%)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Market creator gets rewarded for creating popular markets
        self.market.fee_collector = self.market_creator.key();
        self.market.fee_collector_ata = self.fee_collector_colletral_ata.key();

        // Protocol treasury funds platform development
        self.market.protocol_fee_collector = self.protocol_fee_collector.key();
        self.market.protocol_fee_collector_ata = self.protocol_fee_collector_ata.key();

        msg!("💰 Fee split: 50% protocol, 50% market creator");
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        self.market.status = Status::Open;
        self.market.yes_mint = self.yes_mint.key();
        self.market.no_mint = self.no_mint.key();
        self.market.collateral_mint = self.collateral_mint.key();
        let clock = Clock::get()?;
        self.market.resolution_time = clock.unix_timestamp;
        self.market.market_close_timestamp = self.market.resolution_time + duration_time;
        // Validate question length
        require!(question.len() >= 10, Errors::QuestionTooShort);
        require!(question.len() <= 100, Errors::QuestionTooLong);
        self.market.question = question;
        Ok(())
    }
}
