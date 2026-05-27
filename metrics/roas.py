"""
Return on Ad Spend (ROAS) Calculators

ROAS measures the revenue generated for every dollar spent on advertising.
A ROAS of 4.0 means R$4 revenue for every R$1 spent.

Benchmarks vary by industry:
- E-commerce: 4:1 to 10:1 is typically profitable
- Lead Gen: 2:1 to 5:1 depending on close rate
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ROASResult:
    """Result of ROAS calculation."""
    roas: float
    revenue: float
    ad_spend: float
    profit: float
    margin_adjusted_roas: Optional[float]
    is_profitable: bool
    break_even_roas: float


def calculate_roas(
    revenue: float,
    ad_spend: float,
    gross_margin: Optional[float] = None,
    fixed_costs: float = 0
) -> ROASResult:
    """
    Calculate Return on Ad Spend.

    Args:
        revenue: Total revenue attributed to ads
        ad_spend: Total advertising spend
        gross_margin: Optional gross margin (0-1) for profitability analysis
        fixed_costs: Optional fixed costs to consider

    Returns:
        ROASResult with ROAS and profitability analysis

    Example:
        >>> result = calculate_roas(
        ...     revenue=100000,
        ...     ad_spend=25000,
        ...     gross_margin=0.4
        ... )
        >>> print(f"ROAS: {result.roas:.2f}x")
        ROAS: 4.00x
    """
    if ad_spend <= 0:
        return ROASResult(
            roas=0,
            revenue=revenue,
            ad_spend=0,
            profit=revenue - fixed_costs,
            margin_adjusted_roas=None,
            is_profitable=revenue > fixed_costs,
            break_even_roas=0
        )

    roas = revenue / ad_spend
    profit = revenue - ad_spend - fixed_costs

    # Calculate margin-adjusted ROAS (net ROAS)
    margin_adjusted_roas = None
    break_even_roas = 1.0  # Default: need 1:1 to break even

    if gross_margin is not None and gross_margin > 0:
        # Net revenue after COGS
        net_revenue = revenue * gross_margin
        margin_adjusted_roas = net_revenue / ad_spend

        # Break-even ROAS = 1 / gross_margin
        break_even_roas = 1 / gross_margin

        # Recalculate profit with margin
        profit = net_revenue - ad_spend - fixed_costs

    is_profitable = profit > 0

    return ROASResult(
        roas=round(roas, 2),
        revenue=revenue,
        ad_spend=ad_spend,
        profit=round(profit, 2),
        margin_adjusted_roas=round(margin_adjusted_roas, 2) if margin_adjusted_roas else None,
        is_profitable=is_profitable,
        break_even_roas=round(break_even_roas, 2)
    )


def calculate_blended_roas(
    channels: List[Dict],
    gross_margin: Optional[float] = None
) -> Dict:
    """
    Calculate blended ROAS across multiple channels.

    Args:
        channels: List of dicts with channel data:
            - name: Channel name
            - revenue: Revenue attributed
            - spend: Ad spend
        gross_margin: Optional gross margin for profitability

    Returns:
        Dict with blended analysis and channel breakdown

    Example:
        >>> channels = [
        ...     {"name": "Google", "revenue": 50000, "spend": 10000},
        ...     {"name": "Meta", "revenue": 30000, "spend": 8000},
        ... ]
        >>> result = calculate_blended_roas(channels)
    """
    if not channels:
        return {"error": "No channel data provided"}

    total_revenue = 0
    total_spend = 0
    channel_results = []

    for channel in channels:
        name = channel.get("name", "Unknown")
        revenue = channel.get("revenue", 0)
        spend = channel.get("spend", 0)

        total_revenue += revenue
        total_spend += spend

        roas = revenue / spend if spend > 0 else 0

        result = {
            "channel": name,
            "revenue": revenue,
            "spend": spend,
            "roas": round(roas, 2),
            "share_of_spend": 0,  # Calculate after totals
            "share_of_revenue": 0
        }

        if gross_margin:
            net_revenue = revenue * gross_margin
            result["net_roas"] = round(net_revenue / spend, 2) if spend > 0 else 0

        channel_results.append(result)

    # Calculate shares
    for result in channel_results:
        result["share_of_spend"] = round(result["spend"] / total_spend * 100, 1) if total_spend > 0 else 0
        result["share_of_revenue"] = round(result["revenue"] / total_revenue * 100, 1) if total_revenue > 0 else 0

    # Sort by ROAS descending
    channel_results.sort(key=lambda x: x["roas"], reverse=True)

    # Blended ROAS
    blended_roas = total_revenue / total_spend if total_spend > 0 else 0

    # Efficiency score (how much top channels contribute)
    if len(channel_results) >= 2:
        top_channel_revenue = channel_results[0]["revenue"]
        top_channel_spend = channel_results[0]["spend"]
        efficiency_opportunity = f"Top channel ({channel_results[0]['channel']}) has {channel_results[0]['roas']}x ROAS. " \
                                 f"Shifting 10% from {channel_results[-1]['channel']} could increase overall ROAS."
    else:
        efficiency_opportunity = None

    return {
        "blended_roas": round(blended_roas, 2),
        "total_revenue": total_revenue,
        "total_spend": total_spend,
        "total_profit": total_revenue - total_spend,
        "channels": channel_results,
        "best_performer": channel_results[0]["channel"] if channel_results else None,
        "worst_performer": channel_results[-1]["channel"] if channel_results else None,
        "efficiency_opportunity": efficiency_opportunity
    }


def calculate_target_roas(
    target_profit: float,
    gross_margin: float,
    ad_spend: float
) -> Dict:
    """
    Calculate the ROAS needed to achieve a profit target.

    Args:
        target_profit: Desired profit amount
        gross_margin: Gross margin (0-1)
        ad_spend: Planned ad spend

    Returns:
        Dict with target ROAS and required revenue
    """
    if gross_margin <= 0 or ad_spend <= 0:
        return {"error": "Invalid inputs"}

    # Required net revenue = target_profit + ad_spend
    required_net_revenue = target_profit + ad_spend

    # Gross revenue needed = net_revenue / margin
    required_gross_revenue = required_net_revenue / gross_margin

    # Target ROAS
    target_roas = required_gross_revenue / ad_spend

    return {
        "target_roas": round(target_roas, 2),
        "required_revenue": round(required_gross_revenue, 2),
        "ad_spend": ad_spend,
        "expected_profit": target_profit,
        "gross_margin": gross_margin,
        "break_even_roas": round(1 / gross_margin, 2)
    }


if __name__ == "__main__":
    # Example: Blended ROAS
    channels = [
        {"name": "Google Ads", "revenue": 80000, "spend": 15000},
        {"name": "Meta Ads", "revenue": 45000, "spend": 12000},
        {"name": "TikTok Ads", "revenue": 15000, "spend": 8000},
    ]

    result = calculate_blended_roas(channels, gross_margin=0.4)

    print("=== Blended ROAS Analysis ===")
    print(f"Blended ROAS: {result['blended_roas']}x")
    print(f"Total Revenue: R$ {result['total_revenue']:,.2f}")
    print(f"Total Spend: R$ {result['total_spend']:,.2f}")
    print(f"Total Profit: R$ {result['total_profit']:,.2f}")
    print()
    print("Channel Breakdown:")
    for ch in result["channels"]:
        print(f"  {ch['channel']}: {ch['roas']}x ROAS ({ch['share_of_spend']}% of spend)")

    print()
    print(f"Best: {result['best_performer']}")
    print(f"Worst: {result['worst_performer']}")
