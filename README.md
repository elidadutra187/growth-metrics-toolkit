<p align="center">
  <strong>φ</strong>
</p>

# Growth Metrics Toolkit

> Essential quantitative metrics for data-driven marketing decisions

## Overview

Growth Metrics Toolkit is a Python library providing calculators for the most important growth and marketing metrics. Built for growth marketers, product managers, and data analysts who need reliable, well-documented implementations of industry-standard formulas.

Each metric module includes detailed docstrings explaining the formula, typical benchmarks, and real-world interpretation guidance. The library emphasizes practical applicability over academic complexity.

## Stack

- **Language:** Python 3.9+
- **Dependencies:** None (pure Python, no external libraries)
- **Testing:** pytest with 100% coverage goal

## Features

- **LTV (Lifetime Value):** Simple and cohort-based calculations
- **CAC (Customer Acquisition Cost):** Overall and by-channel analysis
- **ROAS (Return on Ad Spend):** With margin-adjusted profitability
- **Funnel Analysis:** Multi-stage conversion with optimization recommendations
- **Payback Period:** CAC recovery time with cohort support

## Quick Start

```bash
# Clone the repository
git clone https://github.com/elidadutra/growth-metrics-toolkit.git
cd growth-metrics-toolkit

# Install (no external dependencies needed)
pip install -e .

# Run examples
python -m metrics.ltv
python -m metrics.cac
python -m metrics.roas
python -m metrics.funnel
python -m metrics.payback
```

## Usage Examples

### LTV Calculation

```python
from metrics import calculate_ltv

result = calculate_ltv(
    total_revenue=250000,
    total_customers=1000,
    avg_purchase_frequency=3.5,
    avg_customer_lifespan_months=18
)

print(f"LTV: R$ {result.ltv}")
# LTV: R$ 1071.43
```

### CAC by Channel

```python
from metrics import calculate_cac_by_channel

channels = [
    {"name": "Google Ads", "spend": 25000, "customers": 100},
    {"name": "Meta Ads", "spend": 18000, "customers": 120},
    {"name": "Organic/SEO", "spend": 4000, "customers": 80},
]

result = calculate_cac_by_channel(channels, ltv=800)
print(f"Blended CAC: R$ {result['blended_cac']}")
print(f"Most Efficient: {result['most_efficient']}")
```

### Funnel Analysis

```python
from metrics import analyze_funnel

stages = [
    {"name": "Visitors", "count": 50000},
    {"name": "Product View", "count": 15000},
    {"name": "Add to Cart", "count": 3000},
    {"name": "Purchase", "count": 750},
]

result = analyze_funnel(stages)
print(f"Overall Conversion: {result['overall_conversion']}%")
print(f"Biggest Drop-off: {result['biggest_drop_off']['stage']}")
```

### ROAS Analysis

```python
from metrics import calculate_blended_roas

channels = [
    {"name": "Google", "revenue": 80000, "spend": 15000},
    {"name": "Meta", "revenue": 45000, "spend": 12000},
]

result = calculate_blended_roas(channels, gross_margin=0.4)
print(f"Blended ROAS: {result['blended_roas']}x")
```

## Project Structure

```
growth-metrics-toolkit/
├── metrics/
│   ├── __init__.py      # Package exports
│   ├── ltv.py           # Lifetime Value calculators
│   ├── cac.py           # Customer Acquisition Cost
│   ├── roas.py          # Return on Ad Spend
│   ├── funnel.py        # Funnel analysis
│   └── payback.py       # CAC Payback Period
├── tests/
│   └── test_metrics.py
├── README.md
├── LICENSE
└── setup.py
```

## Metric Benchmarks

| Metric | Excellent | Good | Warning | Critical |
|--------|-----------|------|---------|----------|
| LTV:CAC Ratio | > 5:1 | > 3:1 | > 1:1 | < 1:1 |
| CAC Payback | < 3 mo | < 6 mo | < 12 mo | > 12 mo |
| ROAS (e-comm) | > 6x | > 4x | > 2x | < 2x |
| Funnel CVR | > 3% | > 2% | > 1% | < 1% |

*Benchmarks vary by industry. These are general e-commerce guidelines.*

## Use Cases

- **Budget Allocation:** Use CAC by channel to optimize spend
- **Pricing Strategy:** Use LTV and payback for pricing decisions
- **Investor Reporting:** Standard metrics for fundraising decks
- **Campaign Analysis:** ROAS and funnel for campaign performance
- **Retention Focus:** Cohort LTV for retention program ROI

## Roadmap

- [ ] MRR/ARR calculations for SaaS
- [ ] Cohort retention visualization
- [ ] Export to CSV/Excel
- [ ] API wrapper for real-time dashboards
- [ ] Integration with Google Analytics/Meta APIs

## Author

**Élida Dutra**
Growth Engineer | E-commerce | AI Marketing Automation

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/elidadutra)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/elidadutra)

## License

MIT

---

<p align="center">
  <strong>φ</strong><br>
  <em>Building intelligent systems at the intersection of marketing, data, and AI</em>
</p>
