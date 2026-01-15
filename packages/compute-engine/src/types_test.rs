#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ts_export() {
        // This test is only here to trigger ts-rs type generation
        // When you run `cargo test`, ts-rs will generate .ts files
        assert!(true);
    }

    #[test]
    fn test_market_state_default() {
        let state = MarketState {
            timestamp: 0,
            macro_state: MacroState {
                pct_stocks_above_vwap: 0.5,
                pct_stocks_above_ema20: 0.5,
                weighted_return_top10: 0.0,
                advance_decline_ratio: 1.0,
                breadth_momentum_5m: 0.0,
                breadth_volatility: 0.0,
            },
            micro_state: MicroState {
                fut_price_vs_vwap: 0.0,
                fut_range_position: 0.5,
                fut_return_1m: 0.0,
                fut_return_5m: 0.0,
                fut_atr_percent: 0.0,
                fut_volume_zscore: 0.0,
                fut_oi_change: 0.0,
            },
            volatility_state: VolatilityState {
                atm_iv: 0.0,
                atm_iv_change: 0.0,
                iv_skew: 0.0,
                gamma_atm: 0.0,
                vega_atm: 0.0,
                theta_atm: 0.0,
                pcr_oi: 1.0,
                pcr_volume: 1.0,
                max_pain_distance: 0.0,
                india_vix: 0.0,
                realized_vol_5m: 0.0,
                vol_expansion_ratio: 1.0,
            },
            execution_state: ExecutionState {
                fut_bid_ask_spread: 0.0,
                fut_bid_ask_spread_bps: 0.0,
                fut_lob_imbalance: 0.0,
                fut_lob_depth: 0.0,
                option_bid_ask_spread: None,
                option_bid_ask_spread_pct: None,
                option_lob_imbalance: None,
            },
            portfolio_state: PortfolioState::default(),
            minutes_from_open: 0,
            minutes_to_close: 0,
            day_of_week: 0,
        };

        assert_eq!(state.timestamp, 0);
    }
}
