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
    #[msg("Market is not open for trading")]
    InvalidMarketStatus,
    #[msg("Market already finished")]
    MarketFinished,
    #[msg("Market betting period has not ended yet")]
    MarketNotClosed,
    #[msg("Market is already setteled")]
    MarketIsSettled,
}
