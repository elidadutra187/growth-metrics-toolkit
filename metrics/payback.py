"""
CAC Payback Period Calculator

Payback period represents how many months it takes to recover
the cost of acquiring a customer.

Benchmarks:
- SaaS: < 12 months is good, < 6 months is excellent
- E-commerce: < 3 months is typical due to lower margins
"""

from typing import Dict, Optional
from dataclasses import dataclass


@dataclass
class PaybackResult:
    """Result of payback calculation."""
    payback_months: float
    cac: float
    monthly_revenue: float
    gross_margin: float
    is_healthy: bool
    rating: str  # excellent, good, warning, critical


def calculate_payback_period(
    cac: float,
    avg_monthly_revenue: float,
    gross_margin: float = 1.0,
    include_expansion: bool = False,
    monthly_expansion_rate: float = 0.0
) -> PaybackResult:
    """
    Calculate CAC payback period in months.

    Args:
        cac: Customer Acquisition Cost
        avg_monthly_revenue: Average monthly revenue per customer
        gross_margin: Gross margin (0-1), default 1.0 (100%)
        include_expansion: Whether to include expansion revenue
        monthly_expansion_rate: Monthly expansion rate if include_expansion

    Returns:
        PaybackResult with payback period and analysis

    Example:
        >>> result = calculate_payback_period(
        ...     cac=500,
        ...     avg_monthly_revenue=100,
        ...     gross_margin=0.7
        ... )
        >>> print(f"Payback: {result.payback_months:.1f} months")
        Payback: 7.1 months
    """
    if cac <= 0:
        return PaybackResult(
            payback_months=0,
            cac=0,
            monthly_revenue=avg_monthly_revenue,
            gross_margin=gross_margin,
            is_healthy=True,
            rating="excellent"
        )

    if avg_monthly_revenue <= 0:
        return PaybackResult(
            payback_months=float('inf'),
            cac=cac,
            monthly_revenue=0,
            gross_margin=gross_margin,
            is_healthy=False,
            rating="critical"
        )

    # Net monthly contribution
    monthly_contribution = avg_monthly_revenue * gross_margin

    if include_expansion and monthly_expansion_rate > 0:
        # With expansion, payback accelerates over time
        # Simplified: use geometric series
        cumulative = 0
        months = 0
        current_revenue = monthly_contribution

        while cumulative < cac and months < 120:  # Cap at 10 years
            cumulative += current_revenue
            current_revenue *= (1 + monthly_expansion_rate)
            months += 1

        payback = months if cumulative >= cac else float('inf')
    else:
        # Simple payback
        payback = cac / monthly_contribution

    # Determine rating
    if payback <= 3:
        rating = "excellent"
        is_healthy = True
    elif payback <= 6:
        rating = "good"
        is_healthy = True
    elif payback <= 12:
        rating = "warning"
        is_healthy = True
    else:
        rating = "critical"
        is_healthy = False

    return PaybackResult(
        payback_months=round(payback, 1),
        cac=cac,
        monthly_revenue=avg_monthly_revenue,
        gross_margin=gross_margin,
        is_healthy=is_healthy,
        rating=rating
    )


def calculate_cohort_payback(
    cohort_data: list,
    cac: float,
    gross_margin: float = 1.0
) -> Dict:
    """
    Calculate payback period using actual cohort revenue data.

    Args:
        cohort_data: List of monthly revenues for the cohort
        cac: Customer Acquisition Cost
        gross_margin: Gross margin (0-1)

    Returns:
        Dict with detailed payback analysis

    Example:
        >>> revenue = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45]
        >>> result = calculate_cohort_payback(revenue, cac=400, gross_margin=0.6)
    """
    if not cohort_data or cac <= 0:
        return {"error": "Invalid inputs"}

    cumulative = 0
    payback_month = None
    monthly_breakdown = []

    for month, revenue in enumerate(cohort_data, 1):
        contribution = revenue * gross_margin
        cumulative += contribution

        monthly_breakdown.append({
            "month": month,
            "revenue": revenue,
            "contribution": round(contribution, 2),
            "cumulative": round(cumulative, 2),
            "cac_recovered_pct": round(cumulative / cac * 100, 1)
        })

        if payback_month is None and cumulative >= cac:
            # Interpolate exact payback point
            prev_cumulative = cumulative - contribution
            remaining = cac - prev_cumulative
            fraction = remaining / contribution if contribution > 0 else 0
            payback_month = month - 1 + fraction

    # If not recovered in data period
    if payback_month is None:
        # Estimate using last month's rate
        last_contribution = cohort_data[-1] * gross_margin
        remaining = cac - cumulative
        if last_contribution > 0:
            additional_months = remaining / last_contribution
            payback_month = len(cohort_data) + additional_months
        else:
            payback_month = float('inf')

    return {
        "payback_months": round(payback_month, 1),
        "cac": cac,
        "total_recovered": round(cumulative, 2),
        "recovery_rate": round(cumulative / cac * 100, 1),
        "months_of_data": len(cohort_data),
        "monthly_breakdown": monthly_breakdown,
        "is_recovered": cumulative >= cac
    }


def calculate_target_cac(
    target_payback_months: float,
    avg_monthly_revenue: float,
    gross_margin: float = 1.0
) -> Dict:
    """
    Calculate the maximum CAC for a target payback period.

    Args:
        target_payback_months: Desired payback period
        avg_monthly_revenue: Average monthly revenue per customer
        gross_margin: Gross margin (0-1)

    Returns:
        Dict with maximum CAC calculation
    """
    max_cac = target_payback_months * avg_monthly_revenue * gross_margin

    return {
        "max_cac": round(max_cac, 2),
        "target_payback_months": target_payback_months,
        "monthly_revenue": avg_monthly_revenue,
        "gross_margin": gross_margin,
        "monthly_contribution": round(avg_monthly_revenue * gross_margin, 2)
    }


if __name__ == "__main__":
    # Example 1: Simple payback
    result = calculate_payback_period(
        cac=600,
        avg_monthly_revenue=150,
        gross_margin=0.5
    )

    print("=== CAC Payback Analysis ===")
    print(f"CAC: R$ {result.cac:.2f}")
    print(f"Monthly Revenue: R$ {result.monthly_revenue:.2f}")
    print(f"Gross Margin: {result.gross_margin * 100}%")
    print(f"Payback Period: {result.payback_months} months")
    print(f"Rating: {result.rating.upper()}")
    print(f"Healthy: {'Yes' if result.is_healthy else 'No'}")

    print()

    # Example 2: Cohort-based payback
    monthly_revenue = [200, 180, 160, 150, 140, 130, 120, 115, 110, 105, 100, 100]
    cohort_result = calculate_cohort_payback(
        cohort_data=monthly_revenue,
        cac=500,
        gross_margin=0.6
    )

    print("=== Cohort Payback Analysis ===")
    print(f"Payback Period: {cohort_result['payback_months']} months")
    print(f"Total Recovered: R$ {cohort_result['total_recovered']:.2f} ({cohort_result['recovery_rate']}% of CAC)")
    print(f"Recovered: {'Yes' if cohort_result['is_recovered'] else 'No'}")
