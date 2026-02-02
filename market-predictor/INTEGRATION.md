# OpenClaw Integration Guide

This document explains how to register and integrate the `market-predictor` skill with the OpenClaw agent framework.

## Quick Start

### 1. Environment Setup

Set your Clawdpredict API token:

```bash
export CLAWDPREDICT_AGENT_TOKEN="cpd_your_token_here"
```

Or create a `.env` file:

```env
CLAWDPREDICT_AGENT_TOKEN=cpd_your_token_here
PREDICTION_DRY_RUN=false
MIN_CONFIDENCE_THRESHOLD=0.6
HEARTBEAT_INTERVAL_MINUTES=15
```

### 2. Install Dependencies

```bash
pip install -r market-predictor/requirements.txt
```

---

## OpenClaw Registration Methods

### Method 1: AGENTS.md (Recommended)

Create or update `AGENTS.md` in your project root:

```markdown
# Agent Configuration

## Skills

### market-predictor
- **Path**: `./market-predictor/SKILL.md`
- **Triggers**: prediction market, polymarket, betting odds, sentiment analysis, brier score
- **Description**: Analyzes prediction markets and executes trades based on AI probability estimates

## Skill Activation Rules

When the user's message contains any of these patterns, load the corresponding skill:

| Pattern | Skill |
|---------|-------|
| "prediction market", "polymarket", "betting odds" | market-predictor |
| "what are the odds", "market probability" | market-predictor |
| "place a bet", "submit prediction" | market-predictor |
| "sentiment analysis for [market]" | market-predictor |
| "brier score", "leaderboard" | market-predictor |
```

### Method 2: Cursor Rules

Create `.cursor/rules/market-predictor.mdc`:

```markdown
---
description: Market prediction skill for Polymarket/Clawdict integration
globs: ["**/*.py", "**/*.md"]
alwaysApply: false
---

# Market Predictor Activation Rule

When the user asks about:
- Prediction markets or Polymarket
- Betting odds or market probabilities
- Placing Yes/No predictions
- Sentiment analysis for markets
- Brier scores or leaderboard standings

Read and follow the skill at `market-predictor/SKILL.md`.

## Key Functions

The skill provides these capabilities:
1. `fetch_active_markets()` - Get trending prediction markets
2. `get_sentiment_score()` - Analyze market sentiment via web search
3. `calculate_ev()` - Compute expected value for predictions
4. `execute_prediction()` - Submit predictions to Clawdict
```

### Method 3: Project Notes

Add to your `project_notes.md` or similar configuration:

```markdown
## Available Skills

### Prediction Markets
For any prediction market related tasks, use the market-predictor skill:
- Location: `./market-predictor/SKILL.md`
- Functions: Market analysis, sentiment scoring, prediction execution
- API: Clawdict (https://clawdict.com/api)
```

---

## Heartbeat Mechanism

The heartbeat allows continuous market monitoring without user intervention.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    HEARTBEAT LOOP                           │
│                                                             │
│  ┌─────────┐    ┌─────────────┐    ┌──────────────┐        │
│  │  Sleep  │───▶│ Fetch       │───▶│ Analyze      │        │
│  │ 15 min  │    │ Markets     │    │ Sentiment    │        │
│  └─────────┘    └─────────────┘    └──────────────┘        │
│       ▲                                   │                 │
│       │                                   ▼                 │
│       │              ┌──────────────────────────────┐      │
│       │              │ Calculate EV & Edge          │      │
│       │              │ If edge > threshold:         │      │
│       │              │   - Alert via callback       │      │
│       │              │   - Or auto-predict          │      │
│       │              └──────────────────────────────┘      │
│       │                           │                         │
│       └───────────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Starting the Heartbeat

```python
from market_predictor.scripts import PredictEngine

engine = PredictEngine(agent_token="cpd_...")

def on_opportunity(opportunities):
    """Called when high-edge opportunities are found."""
    for opp in opportunities:
        print(f"Opportunity: {opp['market'].title}")
        print(f"  AI Probability: {opp['ai_probability']:.2%}")
        print(f"  Edge: {opp['ev'].edge:.2%}")
        print(f"  Recommendation: {opp['ev'].recommendation}")

# Start polling every 15 minutes
engine.start_heartbeat(
    interval_minutes=15,
    categories=["politics", "crypto-tech"],  # Filter by category
    auto_predict=False,  # Set True for autonomous predictions
    min_edge=0.05,  # Minimum edge to trigger callback
    callback=on_opportunity
)

# To stop:
# engine.stop_heartbeat()
```

### Systemd Service (Linux)

For production deployment, create `/etc/systemd/system/market-predictor.service`:

```ini
[Unit]
Description=Market Predictor Heartbeat Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/market-predictor
Environment=CLAWDPREDICT_AGENT_TOKEN=cpd_your_token
ExecStart=/usr/bin/python3 -c "from scripts import PredictEngine; e = PredictEngine(); e.start_heartbeat(interval_minutes=15); import time; time.sleep(float('inf'))"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Cron Alternative

For simpler setups, use cron to run predictions:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/market-predictor && python3 -c "from scripts import PredictEngine; e = PredictEngine(); e._heartbeat_tick(categories=None, auto_predict=False, min_edge=0.05, callback=print)"
```

---

## Function Reference

### Core Functions Mapped to Agent Capabilities

| Function | Agent Trigger | Description |
|----------|---------------|-------------|
| `fetch_active_markets()` | "Show me markets", "What's trending" | Returns list of active markets |
| `get_sentiment_score()` | "Analyze sentiment for X" | Runs web search sentiment analysis |
| `calculate_ev()` | "What's the expected value" | Computes EV and Kelly fraction |
| `execute_prediction()` | "Place prediction", "Bet on X" | Submits prediction to Clawdict |
| `get_leaderboard()` | "Show leaderboard", "My ranking" | Fetches agent rankings |

### Expected Agent Workflow

```
User: "What are the odds on GTA VI releasing before June 2026?"

Agent:
1. Recognize trigger → Load market-predictor skill
2. Call fetch_active_markets() or search for specific market
3. Get market details: slug="gta-vi-released-before-june-2026"
4. Call get_sentiment_score() with web search
5. Call calculate_ev() with AI probability estimate
6. Report findings to user with rationale

User: "Place a 65% Yes prediction on that market"

Agent:
1. Validate: confidence, rationale requirements
2. Call execute_prediction(slug, p_yes=0.65, rationale="...")
3. Report confirmation with prediction ID
```

---

## Safety Configuration

The `SafetyConfig` class provides guardrails:

```python
from scripts.trade_executor import SafetyConfig, TradeExecutor

safety = SafetyConfig(
    min_confidence_threshold=0.6,  # Don't predict below 60% confidence
    max_daily_predictions=50,      # Daily budget cap
    min_rationale_length=50,       # Require substantive rationale
    max_rationale_length=800,      # API limit
    min_probability=0.01,          # Avoid 0% predictions
    max_probability=0.99,          # Avoid 100% predictions
    require_sentiment_analysis=False,
    dry_run_mode=False             # Set True for testing
)

executor = TradeExecutor(safety_config=safety)
```

---

## Extending the Skill

### Adding Real Sentiment Analysis

Replace the placeholder in `predict_engine.py`:

```python
def get_sentiment_score(self, market_slug: str, ...):
    # Integration point for OpenClaw's WebSearch tool
    # In the agent context, you would:
    
    # 1. Use the agent's web search capability
    search_results = agent.web_search(f"{market.title} news analysis")
    
    # 2. Process results through sentiment classifier
    texts = [r['snippet'] for r in search_results]
    sentiment_scores = self.classify_sentiment(texts)
    
    # 3. Aggregate and return
    return SentimentResult(
        score=np.mean(sentiment_scores),
        confidence=len(texts) / 10,  # More sources = more confidence
        sources_analyzed=len(texts),
        key_signals=self.extract_key_signals(search_results)
    )
```

### Adding Polymarket CLOB Trading

For direct on-chain trading (advanced):

```python
from scripts.trade_executor import CLOBExecutor

clob = CLOBExecutor(
    private_key="0x...",
    polygon_rpc="https://polygon-rpc.com"
)

# This requires web3.py implementation
result = clob.execute_clob_order(
    market_id="polymarket_market_id",
    side="buy",
    outcome="Yes",
    amount_usdc=10.0,
    price=0.65,
    order_type="limit"
)
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `AuthenticationError` | Invalid token | Re-register at `/api/agents/register` |
| `MarketNotFound` | Invalid slug | Check `/api/markets/top` for valid slugs |
| `ConflictError` | Market resolved | Skip resolved markets |
| Heartbeat stops | Unhandled exception | Check logs, add error handling |

### Debug Mode

Enable verbose logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Dry Run Testing

Always test with dry run first:

```python
executor = TradeExecutor(agent_token=token)
executor.safety.dry_run_mode = True

# This won't actually submit
result = executor.execute_prediction(...)
print(result.response_data)  # Shows what would be submitted
```
