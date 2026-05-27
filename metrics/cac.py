"""
Customer Acquisition Cost (CAC) Calculators

CAC represents the total cost of acquiring a new customer,
including marketing, sales, and related expenses.

Key benchmarks:
- LTV:CAC ratio should be > 3:1
- CAC Payback should be < 12 months
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class CACResult:
    """Result of CAC calculation."""
    cac: float
    total_spend: float
    new_customers: int
    ltv_cac_ratio: Optional[float]
    is_healthy: bool
    recommendation: str


def calculate_cac(
    marketing_spend: float,
    sales_spend: float,
    new_customers: int,
    ltv: Optional[float] = None
) -> CACResult:
    """
    Calculate Customer Acquisition Cost.

    Args:
        marketing_spend: Total marketing spend in period
        sales_spend: Total sales team cost in period
        new_customers: Number of new customers acquired
        ltv: Optional LTV for ratio calculation

    Returns:
        CACResult with CAC and analysis

    Example:
        >>> result = calculate_cac(
        ...     marketing_spend=50000,
        ...     sales_spend=30000,
        ...     new_customers=200,
        ...     ltv=1200
        ... )
        >>> print(f"CAC: R$ {result.cac:.2f}")
        CAC: R$ 400.00
    """
    total_spend = marketing_spend + sales_spend

    if new_customers <= 0:
        return CACResult(
            cac=0,
            total_spend=total_spend,
            new_customers=0,
            ltv_cac_ratio=None,
            is_healthy=False,
            recommendation="No customers acquired. Review acquisition channels."
        )

    cac = total_spend / new_customers

    # Calculate LTV:CAC ratio if LTV provided
    ltv_cac_ratio = None
    is_healthy = True
    recommendation = ""

    if ltv is not None and cac > 0:
        ltv_cac_ratio = ltv / cac

        if ltv_cac_ratio >= 5:
            recommendation = "Excellent ratio. Consider increasing spend to accelerate growth."
        elif ltv_cac_ratio >= 3:
            recommendation = "Healthy ratio. Current acquisition strategy is sustainable."
        elif ltv_cac_ratio >= 1:
            is_healthy = False
            recommendation = "Warning: Ratio below 3:1. Optimize channels or improve retention."
        else:
            is_healthy = False
            recommendation = "Critical: Spending more to acquire than customers are worth. Immediate action needed."
    else:
        recommendation = "Provide LTV for complete analysis."

    return CACResult(
        cac=round(cac, 2),
        total_spend=total_spend,
        new_customers=new_customers,
        ltv_cac_ratio=round(ltv_cac_ratio, 2) if ltv_cac_ratio else None,
        is_healthy=is_healthy,
        recommendation=recommendation
    )


def calculate_cac_by_channel(
    channels: List[Dict],
    ltv: Optional[float] = None
) -> Dict:
    """
    Calculate CAC breakdown by marketing channel.

    Args:
        channels: List of dicts with channel data:
            - name: Channel name
            - spend: Total spend
            - customers: Customers acquired
        ltv: Optional LTV for ratio calculations

    Returns:
        Dict with channel analysis and recommendations

    Example:
        >>> channels = [
        ...     {"name": "Google Ads", "spend": 20000, "customers": 80},
        ...     {"name": "Facebook", "spend": 15000, "customers": 100},
        ...     {"name": "Organic", "spend": 5000, "customers": 50},
        ... ]
        >>> result = calculate_cac_by_channel(channels, ltv=800)
    """
    if not channels:
        return {"error": "No channel data provided"}

    results = []
    total_spend = 0
    total_customers = 0

    for channel in channels:
        name = channel.get("name", "Unknown")
        spend = channel.get("spend", 0)
        customers = channel.get("customers", 0)

        total_spend += spend
        total_customers += customers

        cac = spend / customers if customers > 0 else float('inf')

        result = {
            "channel": name,
            "spend": spend,
            "customers": customers,
            "cac": round(cac, 2) if cac != float('inf') else None,
            "efficiency": None
        }

        if ltv and cac != float('inf') and cac > 0:
            result["ltv_cac_ratio"] = round(ltv / cac, 2)
            result["efficiency"] = "excellent" if ltv / cac >= 5 else \
                                   "good" if ltv / cac >= 3 else \
                                   "warning" if ltv / cac >= 1 else "critical"

        results.append(result)

    # Sort by efficiency (CAC ascending)
    results.sort(key=lambda x: x["cac"] if x["cac"] else float('inf'))

    # Calculate blended CAC
    blended_cac = total_spend / total_customers if total_customers > 0 else 0

    # Generate recommendations
    recommendations = []
    if results:
        best = results[0]
        worst = results[-1]

        if best["cac"] and worst["cac"]:
            if worst["cac"] > best["cac"] * 2:
                recommendations.append(
                    f"Consider reallocating budget from {worst['channel']} to {best['channel']}"
                )

    return {
        "channels": results,
        "blended_cac": round(blended_cac, 2),
        "total_spend": total_spend,
        "total_customers": total_customers,
        "most_efficient": results[0]["channel"] if results else None,
        "least_efficient": results[-1]["channel"] if results else None,
        "recommendations": recommendations
    }


if __name__ == "__main__":
    # Example: CAC by channel
    channels = [
        {"name": "Google Ads", "spend": 25000, "customers": 100},
        {"name": "Meta Ads", "spend": 18000, "customers": 120},
        {"name": "TikTok Ads", "spend": 8000, "customers": 60},
        {"name": "Organic/SEO", "spend": 4000, "customers": 80},
    ]

    result = calculate_cac_by_channel(channels, ltv=600)

    print("=== CAC by Channel ===")
    print(f"Blended CAC: R$ {result['blended_cac']:.2f}")
    print(f"Total Spend: R$ {result['total_spend']:,.2f}")
    print(f"Total Customers: {result['total_customers']}")
    print()
    print("Channel Breakdown:")
    for ch in result["channels"]:
        print(f"  {ch['channel']}: R$ {ch['cac']:.2f} (LTV:CAC = {ch.get('ltv_cac_ratio', 'N/A')})")

    print()
    print(f"Most Efficient: {result['most_efficient']}")
    print(f"Least Efficient: {result['least_efficient']}")

    if result["recommendations"]:
        print()
        print("Recommendations:")
        for rec in result["recommendations"]:
            print(f"  - {rec}")
