use anchor_lang::prelude::*;

#[error_code]
pub enum Errors {
    #[msg("Error")]
    ErrorCheck,
    #[msg("The amount you enter is invalid")]
    ErrorInvalidAmount,
    #[msg("The vault is invalid")]
    InvalidVault,
    #[msg("The mint is invalid for the market")]
    InvalidMint,
    #[msg("The market creator is invalid")]
    InvalidMarketAuthority,
    #[msg("The market fee Collector is invalid")]
    InvalidMarketFeeCollector,

    #[msg("The market resolver is invalid")]
    InvalidMarketResolver,
    #[msg("Error in Calculating")]
    ErrorInCalculating,
    #[msg("Market is not open for trading")]
    InvalidMarketStatus,

    #[msg("The fee Collector ata mint is not match")]
    InvalidMarketFeeCollectorAta,

    #[msg("Market already finished")]
    MarketFinished,
    #[msg("Market betting period has not ended yet")]
    MarketNotClosed,
    #[msg("Market is already setteled")]
    MarketIsSettled,
    #[msg("Do not have the token holding")]
    TokenAmountIsZero,
    #[msg("Can Resolve one side market")]
    CannotResolveOnesideMarket,
    #[msg("Fee is invalid max fee will be 10")]
    FeeIsTooHigh,
    #[msg("The Resolver is Invalid ")]
    InvalidResolver,
    #[msg("The Question is too Short")]
    QuestionTooShort,
    #[msg("The Question is too long")]
    QuestionTooLong,
    #[msg("The Duration Too Short")]
    DurationTooShort,
    #[msg("The Duration Too Long")]
    DurationTooLong,
    #[msg("Collateral token not whitelisted. Only USDC is accepted.")]
    CollateralNotWhitelisted,
    #[msg("Protocol fee collector is invalid")]
    InvalidProtocolFeeCollector,
}
