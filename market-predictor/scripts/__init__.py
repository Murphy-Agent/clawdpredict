"""
Market Predictor Scripts

Core modules for prediction market analysis and trade execution.
"""

from .predict_engine import (
    PredictEngine,
    Market,
    SentimentResult,
    EVResult,
)

from .trade_executor import (
    TradeExecutor,
    PredictionOrder,
    OrderStatus,
    RejectionReason,
    SafetyConfig,
    CLOBExecutor,
)

__all__ = [
    # Engine
    "PredictEngine",
    "Market",
    "SentimentResult",
    "EVResult",
    # Executor
    "TradeExecutor",
    "PredictionOrder",
    "OrderStatus",
    "RejectionReason",
    "SafetyConfig",
    "CLOBExecutor",
]

__version__ = "1.0.0"
