"""
Predict Engine - Market Analysis and Probability Estimation

This module provides the core intelligence for analyzing prediction markets,
calculating sentiment scores, and estimating probabilities for the market-predictor skill.
"""

import os
import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Literal
from dataclasses import dataclass, field

import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type definitions
Category = Literal["politics", "pop-culture", "economy", "crypto-tech", "sports"]
SentimentSource = Literal["twitter", "news", "reddit", "web"]


@dataclass
class SentimentResult:
    """Results from sentiment analysis."""
    score: float  # -1.0 (bearish) to 1.0 (bullish)
    confidence: float  # 0.0 to 1.0
    sources_analyzed: int
    key_signals: list[str] = field(default_factory=list)
    raw_data: dict = field(default_factory=dict)


@dataclass
class EVResult:
    """Expected Value calculation results."""
    expected_value: float
    edge: float  # Your edge over market odds
    kelly_fraction: float  # Optimal bet sizing
    recommendation: str  # "strong_yes", "lean_yes", "neutral", "lean_no", "strong_no"


@dataclass
class Market:
    """Representation of a prediction market."""
    slug: str
    title: str
    description: str
    category: str
    outcomes: list[str]
    end_date: datetime
    image: Optional[str] = None
    resolved_outcome: Optional[str] = None
    
    @classmethod
    def from_api_response(cls, data: dict) -> "Market":
        """Create Market from API response data."""
        return cls(
            slug=data["slug"],
            title=data["title"],
            description=data.get("description", ""),
            category=data.get("category", "unknown"),
            outcomes=data.get("outcomes", ["Yes", "No"]),
            end_date=datetime.fromisoformat(data["endDate"].replace("Z", "+00:00")),
            image=data.get("image"),
            resolved_outcome=data.get("resolvedOutcome")
        )


class PredictEngine:
    """
    Core engine for prediction market analysis.
    
    Handles:
    - Fetching and caching market data
    - Sentiment analysis via web search
    - Probability estimation
    - Expected value calculations
    - Heartbeat polling for continuous monitoring
    """
    
    def __init__(
        self,
        agent_token: Optional[str] = None,
        api_base: str = "https://clawdpredict.com/api",
        cache_ttl_seconds: int = 300
    ):
        """
        Initialize the PredictEngine.
        
        Args:
            agent_token: Clawdpredict API authentication token
            api_base: Base URL for the Clawdpredict API
            cache_ttl_seconds: How long to cache market data (default 5 minutes)
        """
        self.agent_token = agent_token or os.getenv("CLAWDPREDICT_AGENT_TOKEN")
        self.api_base = api_base.rstrip("/")
        self.cache_ttl = cache_ttl_seconds
        
        # Cache storage
        self._market_cache: dict = {}
        self._cache_timestamp: Optional[datetime] = None
        
        # Heartbeat state
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._heartbeat_running = False
        
        if not self.agent_token:
            logger.warning("No agent token provided. API calls will fail.")
    
    @property
    def headers(self) -> dict:
        """Get headers for API requests."""
        return {
            "X-Agent-Token": self.agent_token,
            "Content-Type": "application/json"
        }
    
    def _is_cache_valid(self) -> bool:
        """Check if the market cache is still valid."""
        if not self._cache_timestamp:
            return False
        return (datetime.now() - self._cache_timestamp).seconds < self.cache_ttl
    
    # =========================================================================
    # Market Data Functions
    # =========================================================================
    
    def fetch_active_markets(
        self,
        category: Optional[Category] = None,
        limit: int = 100,
        force_refresh: bool = False
    ) -> list[Market]:
        """
        Fetch active prediction markets from Clawdict.
        
        Args:
            category: Filter by category (optional)
            limit: Maximum number of markets to return
            force_refresh: Bypass cache and fetch fresh data
            
        Returns:
            List of Market objects
        """
        # Check cache first
        if not force_refresh and self._is_cache_valid():
            markets = self._market_cache.get("markets", [])
        else:
            # Fetch from API
            try:
                response = requests.get(
                    f"{self.api_base}/markets/top",
                    headers=self.headers,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                self._market_cache = data
                self._cache_timestamp = datetime.now()
                markets = data.get("markets", [])
                
                logger.info(f"Fetched {len(markets)} markets from API")
                
            except requests.RequestException as e:
                logger.error(f"Failed to fetch markets: {e}")
                raise
        
        # Convert to Market objects
        market_objects = [Market.from_api_response(m) for m in markets]
        
        # Filter by category if specified
        if category:
            market_objects = [m for m in market_objects if m.category == category]
        
        # Filter out resolved markets
        market_objects = [m for m in market_objects if m.resolved_outcome is None]
        
        return market_objects[:limit]
    
    def get_market_details(self, slug: str) -> Market:
        """
        Get detailed information about a specific market.
        
        Args:
            slug: Market identifier
            
        Returns:
            Market object with full details
        """
        try:
            response = requests.get(
                f"{self.api_base}/markets/{slug}",
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            return Market.from_api_response(response.json())
            
        except requests.RequestException as e:
            logger.error(f"Failed to get market {slug}: {e}")
            raise
    
    # =========================================================================
    # Sentiment Analysis
    # =========================================================================
    
    def get_sentiment_score(
        self,
        market_slug: str,
        sources: Optional[list[SentimentSource]] = None,
        search_queries: Optional[list[str]] = None
    ) -> SentimentResult:
        """
        Analyze sentiment for a market using web search and news data.
        
        This function is designed to work with OpenClaw's web search capabilities.
        In production, it would call the agent's web search tools to gather data.
        
        Args:
            market_slug: The market to analyze
            sources: Which sources to search (default: all)
            search_queries: Custom search queries (auto-generated if not provided)
            
        Returns:
            SentimentResult with score, confidence, and signals
        """
        sources = sources or ["twitter", "news", "web"]
        
        # Get market details for context
        try:
            market = self.get_market_details(market_slug)
        except Exception:
            logger.warning(f"Could not fetch market details for {market_slug}")
            market = None
        
        # Generate search queries if not provided
        if not search_queries and market:
            search_queries = self._generate_search_queries(market)
        elif not search_queries:
            search_queries = [market_slug.replace("-", " ")]
        
        # Placeholder for actual sentiment analysis
        # In production, this would:
        # 1. Use OpenClaw's WebSearch tool to gather data
        # 2. Process results through sentiment classification
        # 3. Aggregate scores across sources
        
        logger.info(f"Analyzing sentiment for {market_slug}")
        logger.info(f"Search queries: {search_queries}")
        logger.info(f"Sources: {sources}")
        
        # Mock sentiment analysis - replace with actual implementation
        # This structure shows what the real implementation should return
        return SentimentResult(
            score=0.0,  # Neutral placeholder
            confidence=0.5,
            sources_analyzed=0,
            key_signals=[
                "PLACEHOLDER: Implement actual web search integration",
                "Use OpenClaw WebSearch tool for real sentiment data"
            ],
            raw_data={
                "queries_used": search_queries,
                "sources_requested": sources,
                "note": "Integrate with agent's web search capabilities"
            }
        )
    
    def _generate_search_queries(self, market: Market) -> list[str]:
        """Generate search queries based on market details."""
        queries = []
        
        # Extract key terms from title
        title_clean = market.title.replace("?", "").strip()
        queries.append(f"{title_clean} news {datetime.now().year}")
        queries.append(f"{title_clean} prediction analysis")
        
        # Category-specific queries
        if market.category == "politics":
            queries.append(f"{title_clean} polling data")
        elif market.category == "crypto-tech":
            queries.append(f"{title_clean} price prediction")
        elif market.category == "sports":
            queries.append(f"{title_clean} odds betting")
        
        return queries[:5]  # Limit to 5 queries
    
    # =========================================================================
    # Probability Estimation
    # =========================================================================
    
    def estimate_probability(
        self,
        market: Market,
        sentiment: Optional[SentimentResult] = None,
        base_rate: float = 0.5,
        sentiment_weight: float = 0.3
    ) -> float:
        """
        Estimate the probability of YES outcome for a market.
        
        This combines:
        - Base rate (prior probability)
        - Sentiment signals
        - Category-specific adjustments
        
        Args:
            market: The market to estimate
            sentiment: Sentiment analysis results (optional)
            base_rate: Starting probability estimate
            sentiment_weight: How much sentiment affects the estimate
            
        Returns:
            Probability estimate (0.0 to 1.0)
        """
        probability = base_rate
        
        # Adjust based on sentiment
        if sentiment and sentiment.confidence > 0.3:
            sentiment_adjustment = sentiment.score * sentiment_weight
            probability += sentiment_adjustment
        
        # Category-specific adjustments
        category_adjustments = {
            "politics": 0.0,  # Political markets tend to be well-calibrated
            "crypto-tech": -0.05,  # Crypto predictions often overestimate
            "sports": 0.0,  # Sports have good data
            "pop-culture": 0.05,  # Pop culture often underestimates hype
            "economy": 0.0
        }
        
        probability += category_adjustments.get(market.category, 0.0)
        
        # Time-based adjustment (markets closer to resolution have more certainty)
        days_to_resolution = (market.end_date - datetime.now(market.end_date.tzinfo)).days
        if days_to_resolution < 7:
            # Closer to resolution - be more confident in direction
            if probability > 0.5:
                probability = min(0.95, probability + 0.05)
            else:
                probability = max(0.05, probability - 0.05)
        
        # Clamp to valid range
        return max(0.01, min(0.99, probability))
    
    # =========================================================================
    # Expected Value Calculation
    # =========================================================================
    
    def calculate_ev(
        self,
        p_win: float,
        market_odds: float = 0.5,
        stake: float = 100
    ) -> EVResult:
        """
        Calculate Expected Value for a prediction.
        
        Formula: EV = (P_win × Profit) - (P_loss × Stake)
        
        For prediction markets:
        - If you predict YES at p_win and market is at market_odds
        - Your edge = p_win - market_odds
        
        Args:
            p_win: Your estimated probability of winning
            market_odds: Current market probability (for edge calculation)
            stake: Notional stake for EV calculation
            
        Returns:
            EVResult with expected value, edge, and Kelly fraction
        """
        p_loss = 1 - p_win
        
        # Calculate edge (your advantage over the market)
        edge = p_win - market_odds
        
        # Simple EV calculation
        # If correct: you gain based on your accuracy improvement
        # If wrong: you lose credibility (Brier score impact)
        profit_if_win = stake * (1 - market_odds)  # Simplified
        loss_if_lose = stake * market_odds
        
        expected_value = (p_win * profit_if_win) - (p_loss * loss_if_lose)
        
        # Kelly Criterion for optimal bet sizing
        # Kelly = (bp - q) / b
        # where b = odds, p = win probability, q = loss probability
        if edge > 0 and market_odds > 0:
            b = (1 - market_odds) / market_odds  # Convert to decimal odds
            kelly = (b * p_win - p_loss) / b
            kelly_fraction = max(0, min(1, kelly))
        else:
            kelly_fraction = 0
        
        # Generate recommendation
        if edge > 0.15:
            recommendation = "strong_yes"
        elif edge > 0.05:
            recommendation = "lean_yes"
        elif edge > -0.05:
            recommendation = "neutral"
        elif edge > -0.15:
            recommendation = "lean_no"
        else:
            recommendation = "strong_no"
        
        return EVResult(
            expected_value=expected_value,
            edge=edge,
            kelly_fraction=kelly_fraction,
            recommendation=recommendation
        )
    
    # =========================================================================
    # Heartbeat Mechanism
    # =========================================================================
    
    def start_heartbeat(
        self,
        interval_minutes: int = 15,
        categories: Optional[list[Category]] = None,
        auto_predict: bool = False,
        min_edge: float = 0.05,
        callback: Optional[callable] = None
    ):
        """
        Start the heartbeat polling mechanism.
        
        The heartbeat continuously monitors markets for opportunities:
        1. Polls /api/markets/top at the specified interval
        2. Runs sentiment analysis on promising markets
        3. Alerts or auto-predicts when opportunities arise
        
        Args:
            interval_minutes: How often to poll (default 15 minutes)
            categories: Which categories to monitor (None = all)
            auto_predict: Whether to automatically submit predictions
            min_edge: Minimum edge required to trigger alerts/predictions
            callback: Function to call when opportunities found
        """
        if self._heartbeat_running:
            logger.warning("Heartbeat already running")
            return
        
        self._heartbeat_running = True
        
        def heartbeat_loop():
            logger.info(f"Starting heartbeat with {interval_minutes}min interval")
            
            while self._heartbeat_running:
                try:
                    self._heartbeat_tick(
                        categories=categories,
                        auto_predict=auto_predict,
                        min_edge=min_edge,
                        callback=callback
                    )
                except Exception as e:
                    logger.error(f"Heartbeat tick failed: {e}")
                
                # Sleep for interval
                for _ in range(interval_minutes * 60):
                    if not self._heartbeat_running:
                        break
                    time.sleep(1)
            
            logger.info("Heartbeat stopped")
        
        self._heartbeat_thread = threading.Thread(target=heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
    
    def stop_heartbeat(self):
        """Stop the heartbeat polling mechanism."""
        self._heartbeat_running = False
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=5)
            self._heartbeat_thread = None
    
    def _heartbeat_tick(
        self,
        categories: Optional[list[Category]],
        auto_predict: bool,
        min_edge: float,
        callback: Optional[callable]
    ):
        """Execute a single heartbeat tick."""
        logger.info(f"Heartbeat tick at {datetime.now()}")
        
        # Fetch markets
        markets = self.fetch_active_markets(force_refresh=True)
        
        # Filter by categories if specified
        if categories:
            markets = [m for m in markets if m.category in categories]
        
        opportunities = []
        
        for market in markets[:20]:  # Limit to top 20 for efficiency
            try:
                # Run quick sentiment check
                sentiment = self.get_sentiment_score(market.slug)
                
                # Estimate probability
                ai_prob = self.estimate_probability(market, sentiment)
                
                # Calculate EV (using 0.5 as baseline since we don't have market prices)
                ev = self.calculate_ev(ai_prob, market_odds=0.5)
                
                # Check if opportunity meets threshold
                if abs(ev.edge) >= min_edge:
                    opportunity = {
                        "market": market,
                        "sentiment": sentiment,
                        "ai_probability": ai_prob,
                        "ev": ev,
                        "timestamp": datetime.now()
                    }
                    opportunities.append(opportunity)
                    
                    logger.info(
                        f"Opportunity found: {market.slug} | "
                        f"AI Prob: {ai_prob:.2%} | Edge: {ev.edge:.2%}"
                    )
            
            except Exception as e:
                logger.warning(f"Failed to analyze {market.slug}: {e}")
                continue
        
        # Handle opportunities
        if opportunities and callback:
            callback(opportunities)
        
        if auto_predict and opportunities:
            logger.warning("Auto-predict is enabled but requires TradeExecutor integration")
        
        return opportunities
    
    # =========================================================================
    # Leaderboard
    # =========================================================================
    
    def get_leaderboard(self, limit: int = 20) -> list[dict]:
        """
        Fetch the agent leaderboard.
        
        Args:
            limit: Number of agents to return
            
        Returns:
            List of agent rankings with Brier scores
        """
        try:
            response = requests.get(
                f"{self.api_base}/leaderboard",
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            return data.get("agents", [])[:limit]
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch leaderboard: {e}")
            raise


# =========================================================================
# Standalone Usage Example
# =========================================================================

if __name__ == "__main__":
    # Example usage
    token = os.getenv("CLAWDPREDICT_AGENT_TOKEN")
    
    if not token:
        print("Please set CLAWDPREDICT_AGENT_TOKEN environment variable")
        exit(1)
    
    engine = PredictEngine(agent_token=token)
    
    # Fetch markets
    print("Fetching active markets...")
    markets = engine.fetch_active_markets(limit=5)
    
    for market in markets:
        print(f"\n{market.title}")
        print(f"  Category: {market.category}")
        print(f"  Ends: {market.end_date}")
        
        # Analyze
        sentiment = engine.get_sentiment_score(market.slug)
        ai_prob = engine.estimate_probability(market, sentiment)
        ev = engine.calculate_ev(ai_prob)
        
        print(f"  AI Probability: {ai_prob:.2%}")
        print(f"  Recommendation: {ev.recommendation}")
