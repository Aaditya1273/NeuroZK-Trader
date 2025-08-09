"""
AI Trading Core for NeuroZK-Trader

Features:
- Async data fetching from OKX REST API (orderbook + historical candles)
- Lightweight on-disk caching with TTL
- Feature engineering for short-term price move prediction
- XGBoost (fallback to sklearn) model training and persistence

Notes:
- OKX DEX endpoints may differ from centralized OKX REST v5. Base URL is configurable.
- Default endpoints use OKX REST v5 public market data (no API key needed).
"""
from __future__ import annotations

import asyncio
import aiohttp
import hashlib
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib

# Try XGBoost; fallback to sklearn if unavailable
try:
    from xgboost import XGBClassifier  # type: ignore
    XGB_AVAILABLE = True
except Exception:
    from sklearn.ensemble import GradientBoostingClassifier  # type: ignore
    XGB_AVAILABLE = False


# ===================== Config =====================
@dataclass
class OKXConfig:
    base_url: str = "https://www.okx.com"
    # For OKX DEX, override base_url accordingly (e.g., aggregator endpoints)
    timeout: int = 15
    retries: int = 3
    backoff: float = 0.7


@dataclass
class CacheConfig:
    root_dir: Path = Path(".cache/okx")
    ttl_seconds: int = 60  # default 1 minute


@dataclass
class ModelConfig:
    horizon_minutes: int = 5
    bar: str = "1m"  # 1m candles
    test_size: float = 0.2
    random_state: int = 42
    model_dir: Path = Path("models")


# ===================== Caching =====================
class FileCache:
    def __init__(self, cfg: CacheConfig):
        self.cfg = cfg
        self.cfg.root_dir.mkdir(parents=True, exist_ok=True)

    def _key_to_path(self, key: str) -> Path:
        h = hashlib.sha256(key.encode()).hexdigest()
        return self.cfg.root_dir / f"{h}.json"

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        p = self._key_to_path(key)
        if not p.exists():
            return None
        try:
            with p.open("r", encoding="utf-8") as f:
                data = json.load(f)
            ts = data.get("_ts", 0)
            if (time.time() - ts) > self.cfg.ttl_seconds:
                return None
            return data.get("payload")
        except Exception:
            return None

    def set(self, key: str, payload: Dict[str, Any]) -> None:
        p = self._key_to_path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("w", encoding="utf-8") as f:
            json.dump({"_ts": time.time(), "payload": payload}, f)


# ===================== Client =====================
class OKXClient:
    def __init__(self, okx_cfg: OKXConfig, cache: FileCache):
        self.cfg = okx_cfg
        self.cache = cache

    async def _fetch(self, session: aiohttp.ClientSession, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.cfg.base_url}{path}"
        key = f"{url}?{json.dumps(params, sort_keys=True)}"
        cached = self.cache.get(key)
        if cached is not None:
            return cached

        attempt = 0
        while True:
            try:
                async with session.get(url, params=params, timeout=self.cfg.timeout) as resp:
                    resp.raise_for_status()
                    data = await resp.json()
                    # OKX wraps data under 'data'
                    self.cache.set(key, data)
                    return data
            except Exception:
                attempt += 1
                if attempt > self.cfg.retries:
                    raise
                await asyncio.sleep(self.cfg.backoff * attempt)

    async def fetch_orderbook(self, inst_id: str, depth: int = 50) -> Dict[str, Any]:
        """Orderbook snapshot. OKX path: /api/v5/market/books"""
        async with aiohttp.ClientSession() as session:
            return await self._fetch(session, "/api/v5/market/books", {"instId": inst_id, "sz": depth})

    async def fetch_candles(self, inst_id: str, bar: str = "1m", limit: int = 300) -> pd.DataFrame:
        """Historical candles. OKX path: /api/v5/market/candles
        Returns DataFrame with time ascending.
        """
        async with aiohttp.ClientSession() as session:
            raw = await self._fetch(session, "/api/v5/market/candles", {"instId": inst_id, "bar": bar, "limit": limit})
        data = raw.get("data", [])
        # Each row: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
        cols = ["ts", "open", "high", "low", "close", "vol", "volCcy", "volCcyQuote", "confirm"]
        df = pd.DataFrame(data, columns=cols)
        # Convert types and sort ascending by time
        for col in ["open", "high", "low", "close", "vol"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df["ts"] = pd.to_datetime(pd.to_numeric(df["ts"]))
        df = df.sort_values("ts").reset_index(drop=True)
        return df


# ===================== Feature Engineering =====================
class FeatureBuilder:
    @staticmethod
    def build_from_candles(df: pd.DataFrame, horizon_steps: int = 5) -> Tuple[pd.DataFrame, pd.Series]:
        """Create features and classification labels from candle data.
        Label: 1 if future close/last close - 1 >= 0, else 0 (direction), over horizon_steps.
        """
        feat = pd.DataFrame(index=df.index)
        close = df["close"].astype(float)
        feat["ret_1"] = close.pct_change(1).fillna(0)
        feat["ret_3"] = close.pct_change(3).fillna(0)
        feat["ret_5"] = close.pct_change(5).fillna(0)
        feat["ma_5"] = close.rolling(5).mean().fillna(method="bfill")
        feat["ma_10"] = close.rolling(10).mean().fillna(method="bfill")
        feat["ma_ratio"] = (feat["ma_5"] / (feat["ma_10"] + 1e-9) - 1).fillna(0)
        feat["vol"] = df["vol"].astype(float).fillna(0)
        feat["vol_ma_10"] = feat["vol"].rolling(10).mean().fillna(method="bfill")
        feat["vol_ratio"] = (feat["vol"] / (feat["vol_ma_10"] + 1e-9)).fillna(0)
        # Volatility proxy
        feat["hl_range"] = (df["high"] - df["low"]).astype(float) / (close + 1e-9)

        # Future return label over horizon
        future = close.shift(-horizon_steps)
        y = ((future / close) - 1.0).fillna(0.0)
        # Directional label (up >= 0)
        y_cls = (y >= 0.0).astype(int)

        # Drop last horizon rows with incomplete label
        valid_idx = ~future.isna()
        return feat[valid_idx], y_cls[valid_idx]


# ===================== Model =====================
class PriceMoveClassifier:
    def __init__(self, model_cfg: ModelConfig):
        self.cfg = model_cfg
        self.scaler = StandardScaler()
        if XGB_AVAILABLE:
            self.model = XGBClassifier(
                n_estimators=300,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.9,
                colsample_bytree=0.9,
                reg_lambda=1.0,
                random_state=self.cfg.random_state,
                tree_method="hist",
                n_jobs=2,
            )
        else:
            self.model = GradientBoostingClassifier(random_state=self.cfg.random_state)

    def model_path(self, inst_id: str) -> Path:
        self.cfg.model_dir.mkdir(parents=True, exist_ok=True)
        safe = inst_id.replace("/", "-")
        return self.cfg.model_dir / f"xgb_price_move_{safe}_{self.cfg.bar}_{self.cfg.horizon_minutes}m.joblib"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        X_train, X_test, y_train, y_test = train_test_split(
            X.values, y.values, test_size=self.cfg.test_size, random_state=self.cfg.random_state, stratify=y.values
        )
        X_train_s = self.scaler.fit_transform(X_train)
        X_test_s = self.scaler.transform(X_test)
        self.model.fit(X_train_s, y_train)
        preds = self.model.predict(X_test_s)
        report = classification_report(y_test, preds, output_dict=True)
        return report

    def save(self, path: Path) -> None:
        joblib.dump({"model": self.model, "scaler": self.scaler, "cfg": self.cfg.__dict__}, path)

    def load(self, path: Path) -> None:
        obj = joblib.load(path)
        self.model = obj["model"]
        self.scaler = obj["scaler"]
        # cfg remains

    def predict_latest(self, X_latest: pd.DataFrame) -> np.ndarray:
        Xs = self.scaler.transform(X_latest.values)
        return self.model.predict_proba(Xs)[:, 1] if hasattr(self.model, "predict_proba") else self.model.predict(Xs)


# ===================== Pipeline =====================
async def train_pipeline(inst_id: str, okx_cfg: Optional[OKXConfig] = None, cache_ttl: int = 120, model_cfg: Optional[ModelConfig] = None) -> Dict[str, Any]:
    okx_cfg = okx_cfg or OKXConfig()
    cache = FileCache(CacheConfig(ttl_seconds=cache_ttl))
    client = OKXClient(okx_cfg, cache)
    model_cfg = model_cfg or ModelConfig()

    # 1) Fetch historical candles
    df = await client.fetch_candles(inst_id, bar=model_cfg.bar, limit=1000)

    # 2) Build features/labels
    horizon_steps = _bar_to_steps(model_cfg.bar, model_cfg.horizon_minutes)
    X, y = FeatureBuilder.build_from_candles(df, horizon_steps=horizon_steps)

    # 3) Train model
    model = PriceMoveClassifier(model_cfg)
    report = model.fit(X, y)

    # 4) Persist
    path = model.model_path(inst_id)
    model.save(path)

    return {"report": report, "model_path": str(path), "samples": int(len(y))}


def _bar_to_steps(bar: str, horizon_min: int) -> int:
    # support 1m, 5m, 15m, 1H, etc. For simplicity handle minutes
    unit = bar[-1].lower()
    try:
        val = int(bar[:-1])
    except Exception:
        val = 1
    if unit == "m":
        step = max(1, horizon_min // val)
    elif unit == "h":
        step = max(1, (horizon_min // 60) // max(1, val))
    else:
        step = max(1, horizon_min)
    return step


async def predict_pipeline(inst_id: str, okx_cfg: Optional[OKXConfig] = None, cache_ttl: int = 60, model_cfg: Optional[ModelConfig] = None) -> Dict[str, Any]:
    okx_cfg = okx_cfg or OKXConfig()
    cache = FileCache(CacheConfig(ttl_seconds=cache_ttl))
    client = OKXClient(okx_cfg, cache)
    model_cfg = model_cfg or ModelConfig()

    # Load model
    model = PriceMoveClassifier(model_cfg)
    path = model.model_path(inst_id)
    if not path.exists():
        raise FileNotFoundError(f"Model not found at {path}. Train first.")
    model.load(path)

    # Get latest candles and compute latest features row
    df = await client.fetch_candles(inst_id, bar=model_cfg.bar, limit=200)
    horizon_steps = _bar_to_steps(model_cfg.bar, model_cfg.horizon_minutes)
    X, y = FeatureBuilder.build_from_candles(df, horizon_steps=horizon_steps)
    X_latest = X.tail(1)
    prob_up = float(model.predict_latest(X_latest)[-1])
    return {"inst": inst_id, "prob_up": prob_up, "bar": model_cfg.bar, "horizon_m": model_cfg.horizon_minutes}


# ===================== CLI Helper =====================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="NeuroZK AI Trading Core")
    parser.add_argument("action", choices=["train", "predict"], help="train or predict")
    parser.add_argument("--inst", dest="inst", default="BTC-USDT", help="OKX instrument id, e.g., BTC-USDT")
    parser.add_argument("--bar", dest="bar", default="1m", help="Candle bar (e.g., 1m, 5m)")
    parser.add_argument("--horizon", dest="horizon", type=int, default=5, help="Horizon in minutes")
    args = parser.parse_args()

    async def _run():
        mc = ModelConfig(horizon_minutes=args.horizon, bar=args.bar)
        if args.action == "train":
            out = await train_pipeline(args.inst, model_cfg=mc)
            print(json.dumps(out, indent=2))
        else:
            out = await predict_pipeline(args.inst, model_cfg=mc)
            print(json.dumps(out, indent=2))

    asyncio.run(_run())
