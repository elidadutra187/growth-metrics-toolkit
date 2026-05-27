"""
Lifetime Value (LTV) Calculators

LTV represents the total revenue a business can expect from a single customer
over the entire duration of their relationship.

Common formulas:
- Simple LTV = AOV x Purchase Frequency x Customer Lifespan
- LTV:CAC Ratio = LTV / CAC (healthy ratio is > 3:1)
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class LTVResult:
    """Result of LTV calculation."""
    ltv: float
    aov: float
    purchase_frequency: float
    customer_lifespan_months: float
    method: str
    confidence: str  # low, medium, high


def calculate_ltv(
    total_revenue: float,
    total_customers: int,
    avg_purchase_frequency: float,
    avg_customer_lifespan_months: float = 24,
    churn_rate: Optional[float] = None
) -> LTVResult:
    """
    Calculate Customer Lifetime Value.

    Args:
        total_revenue: Total revenue in the period
        total_customers: Total unique customers
        avg_purchase_frequency: Average purchases per year
        avg_customer_lifespan_months: Average customer lifespan in months
        churn_rate: Optional monthly churn rate (0-1)

    Returns:
        LTVResult with calculated LTV and breakdown

    Example:
        >>> result = calculate_ltv(
        ...     total_revenue=100000,
        ...     total_customers=500,
        ...     avg_purchase_frequency=4,
        ...     avg_customer_lifespan_months=24
        ... )
        >>> print(f"LTV: R$ {result.ltv:.2f}")
        LTV: R$ 800.00
    """
    # Calculate Average Order Value
    aov = total_revenue / (total_customers * avg_purchase_frequency) if total_customers > 0 else 0

    # If churn rate provided, calculate lifespan from it
    if churn_rate and churn_rate > 0:
        avg_customer_lifespan_months = 1 / churn_rate
        method = "churn-based"
    else:
        method = "historical"

    # LTV = AOV x Frequency x Lifespan (in years)
    lifespan_years = avg_customer_lifespan_months / 12
    ltv = aov * avg_purchase_frequency * lifespan_years

    # Determine confidence level
    if total_customers >= 1000:
        confidence = "high"
    elif total_customers >= 100:
        confidence = "medium"
    else:
        confidence = "low"

    return LTVResult(
        ltv=round(ltv, 2),
        aov=round(aov, 2),
        purchase_frequency=avg_purchase_frequency,
        customer_lifespan_months=avg_customer_lifespan_months,
        method=method,
        confidence=confidence
    )


def calculate_ltv_cohort(
    cohort_data: List[Dict],
    revenue_field: str = "revenue",
    customers_field: str = "customers",
    month_field: str = "month"
) -> Dict:
    """
    Calculate LTV by cohort for more accurate projections.

    Args:
        cohort_data: List of dicts with monthly cohort data
        revenue_field: Key for revenue values
        customers_field: Key for customer count
        month_field: Key for month number

    Returns:
        Dict with cohort analysis including:
        - cumulative_ltv_by_month
        - projected_12m_ltv
        - retention_curve

    Example:
        >>> data = [
        ...     {"month": 1, "customers": 100, "revenue": 5000},
        ...     {"month": 2, "customers": 80, "revenue": 3200},
        ...     {"month": 3, "customers": 70, "revenue": 2800},
        ... ]
        >>> result = calculate_ltv_cohort(data)
        >>> print(f"12-month projected LTV: R$ {result['projected_12m_ltv']:.2f}")
    """
    if not cohort_data:
        return {"error": "No cohort data provided"}

    # Sort by month
    sorted_data = sorted(cohort_data, key=lambda x: x[month_field])

    # Calculate cumulative LTV
    initial_customers = sorted_data[0][customers_field]
    cumulative_revenue = 0
    ltv_by_month = []
    retention_curve = []

    for month_data in sorted_data:
        cumulative_revenue += month_data[revenue_field]
        month_ltv = cumulative_revenue / initial_customers if initial_customers > 0 else 0
        ltv_by_month.append({
            "month": month_data[month_field],
            "cumulative_ltv": round(month_ltv, 2)
        })

        retention = month_data[customers_field] / initial_customers if initial_customers > 0 else 0
        retention_curve.append({
            "month": month_data[month_field],
            "retention_rate": round(retention * 100, 1)
        })

    # Project 12-month LTV using observed growth rate
    if len(ltv_by_month) >= 2:
        last_ltv = ltv_by_month[-1]["cumulative_ltv"]
        first_ltv = ltv_by_month[0]["cumulative_ltv"]
        months_observed = len(ltv_by_month)

        # Calculate monthly LTV growth rate
        if first_ltv > 0:
            monthly_growth = (last_ltv / first_ltv) ** (1 / months_observed) - 1
        else:
            monthly_growth = 0

        # Project to 12 months
        months_to_project = 12 - months_observed
        projected_12m_ltv = last_ltv * ((1 + monthly_growth) ** months_to_project)
    else:
        projected_12m_ltv = ltv_by_month[-1]["cumulative_ltv"] if ltv_by_month else 0

    return {
        "initial_cohort_size": initial_customers,
        "months_observed": len(sorted_data),
        "cumulative_ltv_by_month": ltv_by_month,
        "current_ltv": ltv_by_month[-1]["cumulative_ltv"] if ltv_by_month else 0,
        "projected_12m_ltv": round(projected_12m_ltv, 2),
        "retention_curve": retention_curve
    }


if __name__ == "__main__":
    # Example usage
    result = calculate_ltv(
        total_revenue=250000,
        total_customers=1000,
        avg_purchase_frequency=3.5,
        avg_customer_lifespan_months=18
    )

    print("=== LTV Calculation ===")
    print(f"LTV: R$ {result.ltv:.2f}")
    print(f"AOV: R$ {result.aov:.2f}")
    print(f"Purchase Frequency: {result.purchase_frequency}x/year")
    print(f"Customer Lifespan: {result.customer_lifespan_months} months")
    print(f"Method: {result.method}")
    print(f"Confidence: {result.confidence}")
