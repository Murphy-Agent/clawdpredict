"""
Trade Executor - Prediction Submission and Order Management

This module handles the execution of predictions through the Clawdict API,
including safety checks, validation, and order management.
"""

import os
import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum

import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OrderStatus(Enum):
    """Status of a prediction order."""
    PENDING = "pending"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    DRY_RUN = "dry_run"
    FAILED = "failed"


class RejectionReason(Enum):
    """Reasons why a prediction might be rejected."""
    LOW_CONFIDENCE = "confidence_below_threshold"
    MARKET_RESOLVED = "market_already_resolved"
    MARKET_NOT_FOUND = "market_not_found"
    INVALID_PROBABILITY = "probability_out_of_range"
    RATIONALE_TOO_LONG = "rationale_exceeds_limit"
    RATIONALE_TOO_SHORT = "rationale_too_short"
    BUDGET_EXCEEDED = "daily_budget_exceeded"
    AUTH_FAILED = "authentication_failed"
    RATE_LIMITED = "rate_limit_exceeded"


@dataclass
class PredictionOrder:
    """Represents a prediction order."""
    market_slug: str
    p_yes: float
    rationale: str
    status: OrderStatus = OrderStatus.PENDING
    prediction_id: Optional[str] = None
    rejection_reason: Optional[RejectionReason] = None
    timestamp: datetime = field(default_factory=datetime.now)
    response_data: dict = field(default_factory=dict)


@dataclass
class SafetyConfig:
    """Configuration for safety checks."""
    min_confidence_threshold: float = 0.6
    max_daily_predictions: int = 50
    min_rationale_length: int = 50
    max_rationale_length: int = 800
    min_probability: float = 0.01
    max_probability: float = 0.99
    require_sentiment_analysis: bool = False
    dry_run_mode: bool = False


class TradeExecutor:
    """
    Handles prediction execution with safety checks and validation.
    
    Features:
    - Pre-submission validation
    - Confidence threshold enforcement
    - Daily budget tracking
    - Dry run mode for testing
    - Comprehensive error handling
    """
    
    def __init__(
        self,
        agent_token: Optional[str] = None,
        api_base: str = "https://clawdpredict.com/api",
        safety_config: Optional[SafetyConfig] = None
    ):
        """
        Initialize the TradeExecutor.
        
        Args:
            agent_token: Clawdpredict API authentication token
            api_base: Base URL for the Clawdpredict API
            safety_config: Safety configuration (uses defaults if not provided)
        """
        self.agent_token = agent_token or os.getenv("CLAWDPREDICT_AGENT_TOKEN")
        self.api_base = api_base.rstrip("/")
        self.safety = safety_config or SafetyConfig()
        
        # Load safety config from environment
        self._load_env_config()
        
        # Track daily predictions
        self._daily_predictions: list[PredictionOrder] = []
        self._last_reset_date: datetime = datetime.now().date()
        
        if not self.agent_token:
            logger.warning("No agent token provided. API calls will fail.")
    
    def _load_env_config(self):
        """Load configuration from environment variables."""
        if os.getenv("PREDICTION_DRY_RUN", "").lower() == "true":
            self.safety.dry_run_mode = True
            logger.info("Dry run mode enabled via environment")
        
        if threshold := os.getenv("MIN_CONFIDENCE_THRESHOLD"):
            try:
                self.safety.min_confidence_threshold = float(threshold)
            except ValueError:
                pass
    
    @property
    def headers(self) -> dict:
        """Get headers for API requests."""
        return {
            "X-Agent-Token": self.agent_token,
            "Content-Type": "application/json"
        }
    
    def _reset_daily_counter_if_needed(self):
        """Reset daily prediction counter if it's a new day."""
        today = datetime.now().date()
        if today > self._last_reset_date:
            self._daily_predictions = []
            self._last_reset_date = today
            logger.info("Daily prediction counter reset")
    
    # =========================================================================
    # Validation
    # =========================================================================
    
    def validate_prediction(
        self,
        market_slug: str,
        p_yes: float,
        rationale: str,
        confidence: Optional[float] = None
    ) -> tuple[bool, Optional[RejectionReason], str]:
        """
        Validate a prediction before submission.
        
        Args:
            market_slug: Market identifier
            p_yes: Probability of YES outcome
            rationale: Explanation for the prediction
            confidence: Optional confidence level for threshold check
            
        Returns:
            Tuple of (is_valid, rejection_reason, message)
        """
        # Check probability range
        if not (self.safety.min_probability <= p_yes <= self.safety.max_probability):
            return (
                False,
                RejectionReason.INVALID_PROBABILITY,
                f"Probability must be between {self.safety.min_probability} and {self.safety.max_probability}"
            )
        
        # Check rationale length
        if len(rationale) < self.safety.min_rationale_length:
            return (
                False,
                RejectionReason.RATIONALE_TOO_SHORT,
                f"Rationale must be at least {self.safety.min_rationale_length} characters"
            )
        
        if len(rationale) > self.safety.max_rationale_length:
            return (
                False,
                RejectionReason.RATIONALE_TOO_LONG,
                f"Rationale must not exceed {self.safety.max_rationale_length} characters"
            )
        
        # Check confidence threshold
        if confidence is not None and confidence < self.safety.min_confidence_threshold:
            return (
                False,
                RejectionReason.LOW_CONFIDENCE,
                f"Confidence {confidence:.2%} below threshold {self.safety.min_confidence_threshold:.2%}"
            )
        
        # Check daily budget
        self._reset_daily_counter_if_needed()
        if len(self._daily_predictions) >= self.safety.max_daily_predictions:
            return (
                False,
                RejectionReason.BUDGET_EXCEEDED,
                f"Daily prediction limit ({self.safety.max_daily_predictions}) reached"
            )
        
        # Check market slug format
        if not market_slug or not isinstance(market_slug, str):
            return (
                False,
                RejectionReason.MARKET_NOT_FOUND,
                "Invalid market slug"
            )
        
        return (True, None, "Validation passed")
    
    # =========================================================================
    # Prediction Execution
    # =========================================================================
    
    def execute_prediction(
        self,
        market_slug: str,
        p_yes: float,
        rationale: str,
        confidence_threshold: Optional[float] = None,
        confidence: Optional[float] = None,
        dry_run: Optional[bool] = None
    ) -> PredictionOrder:
        """
        Execute a prediction submission.
        
        Args:
            market_slug: Market identifier
            p_yes: Probability of YES outcome (0.0 to 1.0)
            rationale: Explanation for the prediction (max 800 chars)
            confidence_threshold: Override default confidence threshold
            confidence: Your confidence in this prediction
            dry_run: Override dry run mode setting
            
        Returns:
            PredictionOrder with submission status and details
        """
        # Create order object
        order = PredictionOrder(
            market_slug=market_slug,
            p_yes=p_yes,
            rationale=rationale
        )
        
        # Determine if this is a dry run
        is_dry_run = dry_run if dry_run is not None else self.safety.dry_run_mode
        
        # Use custom threshold if provided
        original_threshold = self.safety.min_confidence_threshold
        if confidence_threshold is not None:
            self.safety.min_confidence_threshold = confidence_threshold
        
        try:
            # Validate
            is_valid, rejection_reason, message = self.validate_prediction(
                market_slug=market_slug,
                p_yes=p_yes,
                rationale=rationale,
                confidence=confidence
            )
            
            if not is_valid:
                order.status = OrderStatus.REJECTED
                order.rejection_reason = rejection_reason
                order.response_data = {"message": message}
                logger.warning(f"Prediction rejected: {message}")
                return order
            
            # Dry run mode
            if is_dry_run:
                order.status = OrderStatus.DRY_RUN
                order.response_data = {
                    "message": "Dry run - prediction not submitted",
                    "would_submit": {
                        "slug": market_slug,
                        "pYes": p_yes,
                        "rationale": rationale
                    }
                }
                logger.info(f"Dry run for {market_slug}: p_yes={p_yes:.2%}")
                return order
            
            # Submit to API
            return self._submit_prediction(order)
            
        finally:
            # Restore original threshold
            self.safety.min_confidence_threshold = original_threshold
    
    def _submit_prediction(self, order: PredictionOrder) -> PredictionOrder:
        """Submit prediction to the Clawdict API."""
        try:
            response = requests.post(
                f"{self.api_base}/predictions",
                headers=self.headers,
                json={
                    "slug": order.market_slug,
                    "pYes": order.p_yes,
                    "rationale": order.rationale
                },
                timeout=30
            )
            
            # Handle different response codes
            if response.status_code == 201:
                data = response.json()
                order.status = OrderStatus.SUBMITTED
                order.prediction_id = data.get("id")
                order.response_data = data
                
                # Track for daily limit
                self._daily_predictions.append(order)
                
                logger.info(
                    f"Prediction submitted: {order.prediction_id} | "
                    f"{order.market_slug} | p_yes={order.p_yes:.2%}"
                )
                
            elif response.status_code == 400:
                order.status = OrderStatus.REJECTED
                order.rejection_reason = RejectionReason.INVALID_PROBABILITY
                order.response_data = response.json()
                
            elif response.status_code == 401:
                order.status = OrderStatus.REJECTED
                order.rejection_reason = RejectionReason.AUTH_FAILED
                order.response_data = {"error": "Authentication failed"}
                
            elif response.status_code == 404:
                order.status = OrderStatus.REJECTED
                order.rejection_reason = RejectionReason.MARKET_NOT_FOUND
                order.response_data = response.json()
                
            elif response.status_code == 409:
                order.status = OrderStatus.REJECTED
                order.rejection_reason = RejectionReason.MARKET_RESOLVED
                order.response_data = response.json()
                
            elif response.status_code == 429:
                order.status = OrderStatus.REJECTED
                order.rejection_reason = RejectionReason.RATE_LIMITED
                order.response_data = {"error": "Rate limit exceeded"}
                
            else:
                order.status = OrderStatus.FAILED
                order.response_data = {
                    "status_code": response.status_code,
                    "error": response.text
                }
            
            return order
            
        except requests.RequestException as e:
            order.status = OrderStatus.FAILED
            order.response_data = {"error": str(e)}
            logger.error(f"Request failed: {e}")
            return order
    
    # =========================================================================
    # Batch Operations
    # =========================================================================
    
    def execute_batch(
        self,
        predictions: list[dict],
        stop_on_failure: bool = False
    ) -> list[PredictionOrder]:
        """
        Execute multiple predictions in batch.
        
        Args:
            predictions: List of prediction dicts with keys:
                         market_slug, p_yes, rationale, confidence (optional)
            stop_on_failure: Stop processing if any prediction fails
            
        Returns:
            List of PredictionOrder results
        """
        results = []
        
        for pred in predictions:
            order = self.execute_prediction(
                market_slug=pred["market_slug"],
                p_yes=pred["p_yes"],
                rationale=pred["rationale"],
                confidence=pred.get("confidence")
            )
            results.append(order)
            
            if stop_on_failure and order.status in [OrderStatus.REJECTED, OrderStatus.FAILED]:
                logger.warning(f"Batch stopped at {pred['market_slug']} due to failure")
                break
        
        return results
    
    # =========================================================================
    # Profile Management
    # =========================================================================
    
    def update_evm_address(self, evm_address: Optional[str]) -> dict:
        """
        Update or remove the EVM address on the agent profile.
        
        Args:
            evm_address: Ethereum address (0x + 40 hex chars) or None to remove
            
        Returns:
            API response data
        """
        try:
            response = requests.patch(
                f"{self.api_base}/agents/profile",
                headers=self.headers,
                json={"evmAddress": evm_address},
                timeout=30
            )
            response.raise_for_status()
            
            logger.info(f"EVM address updated: {evm_address or 'removed'}")
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to update EVM address: {e}")
            raise
    
    # =========================================================================
    # Status & Reporting
    # =========================================================================
    
    def get_daily_stats(self) -> dict:
        """Get statistics for today's predictions."""
        self._reset_daily_counter_if_needed()
        
        submitted = [o for o in self._daily_predictions if o.status == OrderStatus.SUBMITTED]
        rejected = [o for o in self._daily_predictions if o.status == OrderStatus.REJECTED]
        
        return {
            "date": str(self._last_reset_date),
            "total_attempts": len(self._daily_predictions),
            "submitted": len(submitted),
            "rejected": len(rejected),
            "remaining_budget": self.safety.max_daily_predictions - len(self._daily_predictions),
            "predictions": [
                {
                    "market": o.market_slug,
                    "p_yes": o.p_yes,
                    "status": o.status.value,
                    "prediction_id": o.prediction_id
                }
                for o in self._daily_predictions
            ]
        }
    
    def get_order_history(self, limit: int = 50) -> list[dict]:
        """Get recent prediction order history."""
        orders = sorted(
            self._daily_predictions,
            key=lambda o: o.timestamp,
            reverse=True
        )[:limit]
        
        return [
            {
                "market_slug": o.market_slug,
                "p_yes": o.p_yes,
                "status": o.status.value,
                "prediction_id": o.prediction_id,
                "rejection_reason": o.rejection_reason.value if o.rejection_reason else None,
                "timestamp": o.timestamp.isoformat()
            }
            for o in orders
        ]


# =========================================================================
# CLOB Order Functions (For Direct Polymarket Integration)
# =========================================================================

class CLOBExecutor:
    """
    Placeholder for direct Polymarket CLOB integration.
    
    NOTE: This is for future extension if you want to trade directly
    on Polymarket rather than just predicting through Clawdict.
    
    Polymarket uses:
    - Polygon network for settlements
    - USDC.e for payments
    - Central Limit Order Book (CLOB) for order matching
    """
    
    def __init__(
        self,
        private_key: Optional[str] = None,
        polygon_rpc: str = "https://polygon-rpc.com"
    ):
        """
        Initialize CLOB executor for direct Polymarket trading.
        
        Args:
            private_key: Ethereum private key for signing transactions
            polygon_rpc: Polygon network RPC endpoint
        """
        self.private_key = private_key or os.getenv("POLYGON_PRIVATE_KEY")
        self.polygon_rpc = polygon_rpc
        
        # USDC.e contract on Polygon
        self.usdc_contract = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
        
        logger.warning(
            "CLOBExecutor is a placeholder. Implement with web3.py and "
            "Polymarket's CLOB API for actual trading."
        )
    
    def execute_clob_order(
        self,
        market_id: str,
        side: str,  # "buy" or "sell"
        outcome: str,  # "Yes" or "No"
        amount_usdc: float,
        price: float,
        order_type: str = "limit"  # "limit" or "market"
    ) -> dict:
        """
        Place an order on Polymarket's CLOB.
        
        Args:
            market_id: Polymarket market identifier
            side: "buy" or "sell"
            outcome: "Yes" or "No"
            amount_usdc: Amount in USDC.e
            price: Limit price (ignored for market orders)
            order_type: "limit" or "market"
            
        Returns:
            Order result dict
        """
        # Safety checks
        max_budget = float(os.getenv("MAX_TRADE_BUDGET_USDC", "100"))
        if amount_usdc > max_budget:
            raise ValueError(f"Amount {amount_usdc} exceeds max budget {max_budget}")
        
        # Placeholder - implement with actual Polymarket CLOB API
        logger.warning("CLOB order execution not implemented")
        
        return {
            "status": "not_implemented",
            "message": "Implement with Polymarket CLOB API and web3.py",
            "order": {
                "market_id": market_id,
                "side": side,
                "outcome": outcome,
                "amount_usdc": amount_usdc,
                "price": price,
                "order_type": order_type
            }
        }
    
    def check_balance(self) -> dict:
        """Check USDC.e balance on Polygon."""
        logger.warning("Balance check not implemented")
        return {
            "status": "not_implemented",
            "message": "Implement with web3.py"
        }
    
    def estimate_slippage(
        self,
        market_id: str,
        outcome: str,
        amount_usdc: float
    ) -> float:
        """
        Estimate slippage for a given order size.
        
        Args:
            market_id: Market to check
            outcome: "Yes" or "No"
            amount_usdc: Order size
            
        Returns:
            Estimated slippage as a percentage
        """
        # Placeholder - would need orderbook data
        logger.warning("Slippage estimation not implemented")
        return 0.0


# =========================================================================
# Standalone Usage Example
# =========================================================================

if __name__ == "__main__":
    token = os.getenv("CLAWDPREDICT_AGENT_TOKEN")
    
    if not token:
        print("Please set CLAWDPREDICT_AGENT_TOKEN environment variable")
        exit(1)
    
    # Create executor with custom safety config
    safety = SafetyConfig(
        min_confidence_threshold=0.6,
        max_daily_predictions=10,
        dry_run_mode=True  # Start in dry run mode
    )
    
    executor = TradeExecutor(agent_token=token, safety_config=safety)
    
    # Example prediction (dry run)
    order = executor.execute_prediction(
        market_slug="will-trump-win-2024",
        p_yes=0.72,
        rationale=(
            "Based on analysis of recent polling data from multiple sources, "
            "historical election patterns, and current political sentiment. "
            "The incumbent advantage and economic indicators suggest a moderate "
            "probability of victory."
        ),
        confidence=0.75
    )
    
    print(f"\nOrder Status: {order.status.value}")
    print(f"Response: {order.response_data}")
    
    # Show daily stats
    stats = executor.get_daily_stats()
    print(f"\nDaily Stats: {stats}")
