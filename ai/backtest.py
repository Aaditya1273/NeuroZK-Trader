"""
NeuroZK-Trader Backtesting CLI

Simulates strategy performance using the trained classifier over historical OKX candles.
Outputs Sharpe ratio, win/loss %, and saves an equity curve plot.

Usage examples:
  python -m ai.backtest --inst BTC-USDT --bar 1m --horizon 5 --thrLong 0.55 --thrShort 0.45 --limit 2000 \
      --initial 10000 --feeBps 5 --slipBps 2 --plotOut backtest_equity.png

Requires a previously trained model saved by ai/core.py train_pipeline.
"""
from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from .core import (
    OKXConfig,
    CacheConfig,
    FileCache,
    OKXClient,
    ModelConfig,
    PriceMoveClassifier,
    FeatureBuilder,
    _bar_to_steps,
)


def _bar_to_minutes(bar: str) -> int:
    bar = bar.strip()
    unit = bar[-1].lower()
    try:
        val = int(bar[:-1])
    except Exception:
        val = 1
    if unit == "m":
        return max(1, val)
    if unit == "h":
        return max(1, 60 * val)
    if unit == "d":
        return max(1, 60 * 24 * val)
    return 1


def _annualization_factor(bar: str) -> float:
    mins = _bar_to_minutes(bar)
    periods_per_year = (365 * 24 * 60) / mins
    return float(np.sqrt(periods_per_year))


@dataclass
class BacktestConfig:
    inst: str = "BTC-USDT"
    bar: str = "1m"
    horizon: int = 5
    limit: int = 2000
    thr_long: float = 0.55
    thr_short: float = 0.45
    initial: float = 10_000.0
    fee_bps: float = 5.0
    slip_bps: float = 2.0
    plot_out: Optional[Path] = None


async def _load_data(inst: str, bar: str, limit: int) -> pd.DataFrame:
    okx_cfg = OKXConfig()
    cache = FileCache(CacheConfig(ttl_seconds=120))
    client = OKXClient(okx_cfg, cache)
    df = await client.fetch_candles(inst, bar=bar, limit=limit)
    return df


def _signals_from_probs(probs: np.ndarray, thr_long: float, thr_short: float) -> np.ndarray:
    # 1 = long, -1 = short, 0 = flat
    sig = np.zeros_like(probs)
    sig[probs > thr_long] = 1
    sig[probs < thr_short] = -1
    return sig


def _trade_stats_from_series(equity: pd.Series, positions: pd.Series) -> Tuple[int, float]:
    # Approximate trade segmentation by position changes
    pos = positions.fillna(0).astype(int)
    changes = pos.diff().fillna(0) != 0
    # Define trade start indices when entering non-zero from zero
    starts = (pos.shift(1).fillna(0) == 0) & (pos != 0)
    ends = (pos != 0) & ((pos.shift(-1).fillna(0) == 0))

    start_idx = list(equity.index[starts])
    end_idx = list(equity.index[ends])
    # Align lengths
    n = min(len(start_idx), len(end_idx))
    wins = 0
    for i in range(n):
        if equity.loc[end_idx[i]] > equity.loc[start_idx[i]]:
            wins += 1
    total = n if n > 0 else 1
    win_rate = 100.0 * wins / total
    return n, win_rate


def run_backtest(df: pd.DataFrame, model: PriceMoveClassifier, cfg: BacktestConfig) -> dict:
    # Build features on full set
    steps = _bar_to_steps(cfg.bar, cfg.horizon)
    X, y = FeatureBuilder.build_from_candles(df, horizon_steps=steps)

    # Align returns to features index using close-to-close returns
    prices = df["close"].astype(float)
    ret = prices.pct_change().reindex(X.index).fillna(0.0).values

    # Model probabilities
    Xs = model.scaler.transform(X.values)
    if hasattr(model.model, "predict_proba"):
        probs = model.model.predict_proba(Xs)[:, 1]
    else:
        preds = model.model.predict(Xs)
        probs = preds.astype(float)

    # Signals and strategy returns
    sig = _signals_from_probs(probs, cfg.thr_long, cfg.thr_short)
    sig_shift = np.roll(sig, 1)
    sig_shift[0] = 0

    # Per-period strategy return
    strat_ret = sig_shift * ret

    # Costs on position changes
    turnover = np.abs(sig - sig_shift)
    cost_bps = (cfg.fee_bps + cfg.slip_bps) / 10_000.0
    strat_ret -= turnover * cost_bps

    # Equity curve
    equity = pd.Series(cfg.initial * np.cumprod(1.0 + strat_ret), index=X.index)

    # Sharpe
    ann_factor = _annualization_factor(cfg.bar)
    mean_r = float(np.mean(strat_ret))
    std_r = float(np.std(strat_ret) + 1e-12)
    sharpe = (mean_r / std_r) * ann_factor if std_r > 0 else 0.0

    # Win/loss per trade (approximate)
    positions = pd.Series(sig, index=X.index)
    trades, win_rate = _trade_stats_from_series(equity, positions)

    return {
        "samples": int(len(X)),
        "trades": int(trades),
        "sharpe": float(sharpe),
        "win_rate_pct": float(win_rate),
        "final_equity": float(equity.iloc[-1]) if len(equity) else cfg.initial,
        "equity": equity,
        "positions": positions,
    }


def save_equity_plot(equity: pd.Series, title: str, out: Path) -> None:
    plt.figure(figsize=(10, 5))
    plt.plot(equity.index, equity.values, label="Equity")
    plt.title(title)
    plt.xlabel("Index")
    plt.ylabel("Equity")
    plt.grid(True, alpha=0.3)
    plt.legend()
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(out)
    plt.close()


async def main_async(args) -> None:
    cfg = BacktestConfig(
        inst=args.inst,
        bar=args.bar,
        horizon=args.horizon,
        limit=args.limit,
        thr_long=args.thrLong,
        thr_short=args.thrShort,
        initial=args.initial,
        fee_bps=args.feeBps,
        slip_bps=args.slipBps,
        plot_out=Path(args.plotOut) if args.plotOut else None,
    )

    # Load data
    df = await _load_data(cfg.inst, cfg.bar, cfg.limit)

    # Load trained model
    model_cfg = ModelConfig(horizon_minutes=cfg.horizon, bar=cfg.bar)
    model = PriceMoveClassifier(model_cfg)
    path = model.model_path(cfg.inst)
    if not path.exists():
        raise FileNotFoundError(f"Model not found at {path}. Train first via ai/core.py.")
    model.load(path)

    # Run backtest
    res = run_backtest(df, model, cfg)

    # Print summary
    print(
        {
            "instrument": cfg.inst,
            "bar": cfg.bar,
            "horizon_m": cfg.horizon,
            "samples": res["samples"],
            "trades": res["trades"],
            "sharpe": round(res["sharpe"], 4),
            "win_rate_pct": round(res["win_rate_pct"], 2),
            "final_equity": round(res["final_equity"], 2),
        }
    )

    # Save plot
    if cfg.plot_out:
        title = f"Equity Curve - {cfg.inst} {cfg.bar} (h={cfg.horizon}m)"
        save_equity_plot(res["equity"], title, cfg.plot_out)
        print(f"Saved equity plot to {cfg.plot_out}")


def main():
    p = argparse.ArgumentParser(description="NeuroZK-Trader Backtesting CLI")
    p.add_argument("--inst", default="BTC-USDT", help="Instrument, e.g., BTC-USDT")
    p.add_argument("--bar", default="1m", help="Candle bar, e.g., 1m, 5m, 1H")
    p.add_argument("--horizon", type=int, default=5, help="Horizon (minutes)")
    p.add_argument("--limit", type=int, default=2000, help="Max candles to fetch")
    p.add_argument("--thrLong", type=float, default=0.55, help="Long threshold for prob_up")
    p.add_argument("--thrShort", type=float, default=0.45, help="Short threshold for prob_up")
    p.add_argument("--initial", type=float, default=10000.0, help="Initial equity")
    p.add_argument("--feeBps", type=float, default=5.0, help="Fee in bps per trade event")
    p.add_argument("--slipBps", type=float, default=2.0, help="Slippage in bps per trade event")
    p.add_argument("--plotOut", default="backtests/equity.png", help="Path to save equity curve PNG")
    args = p.parse_args()

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
