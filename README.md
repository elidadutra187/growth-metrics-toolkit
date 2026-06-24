# Growth Metrics Toolkit

**Practical calculators and reference logic for growth, marketing and e-commerce metrics.**

This repository organizes key performance indicators used in growth marketing and commercial operations: CAC, LTV, ROAS, funnel conversion, payback and channel comparison.

Repository: [elidadutra187/growth-metrics-toolkit](https://github.com/elidadutra187/growth-metrics-toolkit)

---

## Business problem

Marketing decisions are often made from disconnected reports: ad platform results, CRM data, e-commerce orders, spreadsheets and analytics dashboards.

This project creates a simple toolkit to help translate those numbers into business questions:

- Which channel is more efficient?
- Where is the funnel losing users?
- Is acquisition cost sustainable?
- Which campaign deserves more budget?
- How much revenue is needed to justify spend?

---

## What it does

The toolkit provides logic for calculating and interpreting:

- **CAC** — customer acquisition cost
- **LTV** — estimated customer lifetime value
- **ROAS** — return on ad spend
- **Funnel conversion** — stage-by-stage conversion and drop-off
- **Payback** — time needed to recover acquisition cost
- **Channel comparison** — performance across paid, organic and CRM sources

---

## Stack

- **Python** for metric calculations
- **Structured data** for inputs and examples
- **Marketing analytics logic** for interpretation
- **E-commerce and CRM context** for practical use cases

---

## Example use cases

- Compare Meta Ads, Google Ads and organic channels
- Estimate whether a campaign is profitable
- Track funnel conversion from lead to sale
- Identify the biggest drop-off in a commercial journey
- Support budget allocation decisions
- Turn campaign and CRM data into actionable insights

---

## Example logic

```python
revenue = 33000
ad_spend = 8000
roas = revenue / ad_spend

print(f"ROAS: {roas:.2f}x")
```

```python
leads = 92
quotes = 7
lead_to_quote = quotes / leads * 100

print(f"Lead to quote conversion: {lead_to_quote:.1f}%")
```

---

## Project structure

```text
growth-metrics-toolkit/
├── metrics/
│   ├── cac.py
│   ├── ltv.py
│   ├── roas.py
│   ├── funnel.py
│   └── payback.py
├── examples/
├── tests/
└── README.md
```

---

## Expected impact

- Clearer marketing decisions
- Better understanding of campaign efficiency
- More disciplined funnel analysis
- Stronger connection between ads, CRM and sales
- Easier communication of performance to stakeholders

---

## Status

Portfolio case / analytics toolkit.

This project represents practical **growth analytics** work: using simple, reusable calculations to support performance marketing, e-commerce and CRM decisions.

---

## Author

**Élida Dutra**  
Growth · Marketing Analytics · E-commerce Ops · BI · Paid Media

[LinkedIn](https://www.linkedin.com/in/elidadutra) · [GitHub](https://github.com/elidadutra187)
