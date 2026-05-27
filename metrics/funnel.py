"""
Funnel Analysis and Conversion Rate Calculators

Analyze conversion rates at each stage of the customer journey
and identify optimization opportunities.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class FunnelStage:
    """A single funnel stage with metrics."""
    name: str
    visitors: int
    conversion_rate: float
    drop_off_rate: float
    from_previous: float  # Conversion from previous stage


def calculate_conversion_rate(
    conversions: int,
    visitors: int,
    confidence_level: float = 0.95
) -> Dict:
    """
    Calculate conversion rate with confidence interval.

    Args:
        conversions: Number of conversions
        visitors: Total visitors/impressions
        confidence_level: Confidence level for interval (default 95%)

    Returns:
        Dict with conversion rate and confidence interval

    Example:
        >>> result = calculate_conversion_rate(150, 5000)
        >>> print(f"CVR: {result['conversion_rate']}%")
        CVR: 3.0%
    """
    if visitors <= 0:
        return {
            "conversion_rate": 0,
            "conversions": 0,
            "visitors": 0,
            "confidence_interval": None
        }

    rate = conversions / visitors

    # Wilson score interval for binomial proportion
    import math
    z = 1.96 if confidence_level == 0.95 else 2.576  # 95% or 99%

    denominator = 1 + z**2 / visitors
    center = (rate + z**2 / (2 * visitors)) / denominator
    spread = z * math.sqrt((rate * (1 - rate) + z**2 / (4 * visitors)) / visitors) / denominator

    lower = max(0, center - spread)
    upper = min(1, center + spread)

    return {
        "conversion_rate": round(rate * 100, 2),
        "conversions": conversions,
        "visitors": visitors,
        "confidence_interval": {
            "lower": round(lower * 100, 2),
            "upper": round(upper * 100, 2),
            "confidence_level": confidence_level
        }
    }


def analyze_funnel(
    stages: List[Dict],
    name_field: str = "name",
    count_field: str = "count"
) -> Dict:
    """
    Analyze a complete conversion funnel.

    Args:
        stages: List of dicts with stage data (in order)
            - name: Stage name
            - count: Number at this stage
        name_field: Key for stage name
        count_field: Key for count value

    Returns:
        Dict with complete funnel analysis

    Example:
        >>> stages = [
        ...     {"name": "Visitors", "count": 10000},
        ...     {"name": "Add to Cart", "count": 800},
        ...     {"name": "Checkout Started", "count": 400},
        ...     {"name": "Purchase", "count": 200},
        ... ]
        >>> result = analyze_funnel(stages)
    """
    if not stages or len(stages) < 2:
        return {"error": "Need at least 2 stages for funnel analysis"}

    # Process stages
    processed = []
    first_stage_count = stages[0][count_field]

    for i, stage in enumerate(stages):
        name = stage[name_field]
        count = stage[count_field]

        # Overall conversion (from first stage)
        overall_rate = count / first_stage_count if first_stage_count > 0 else 0

        # Stage-to-stage conversion
        if i == 0:
            stage_rate = 1.0
            drop_off = 0
        else:
            prev_count = stages[i - 1][count_field]
            stage_rate = count / prev_count if prev_count > 0 else 0
            drop_off = 1 - stage_rate

        processed.append({
            "stage": name,
            "count": count,
            "overall_conversion": round(overall_rate * 100, 2),
            "stage_conversion": round(stage_rate * 100, 2),
            "drop_off_rate": round(drop_off * 100, 2),
            "lost": stages[i - 1][count_field] - count if i > 0 else 0
        })

    # Calculate overall funnel efficiency
    final_conversion = processed[-1]["overall_conversion"]

    # Find biggest drop-off
    biggest_drop = max(processed[1:], key=lambda x: x["drop_off_rate"])

    # Calculate potential if we fix worst stage
    if biggest_drop["drop_off_rate"] > 0:
        # Simulate improving worst stage by 20%
        improvement_potential = biggest_drop["lost"] * 0.2
        potential_final = processed[-1]["count"] + improvement_potential
        potential_lift = (potential_final - processed[-1]["count"]) / processed[-1]["count"] * 100 if processed[-1]["count"] > 0 else 0
    else:
        improvement_potential = 0
        potential_lift = 0

    return {
        "stages": processed,
        "total_stages": len(stages),
        "top_of_funnel": first_stage_count,
        "bottom_of_funnel": processed[-1]["count"],
        "overall_conversion": final_conversion,
        "biggest_drop_off": {
            "stage": biggest_drop["stage"],
            "drop_off_rate": biggest_drop["drop_off_rate"],
            "lost_count": biggest_drop["lost"]
        },
        "optimization_opportunity": {
            "target_stage": biggest_drop["stage"],
            "potential_additional_conversions": round(improvement_potential),
            "potential_lift_percent": round(potential_lift, 1),
            "recommendation": f"Focus on improving {biggest_drop['stage']} - "
                            f"reducing drop-off by 20% could add {round(improvement_potential)} conversions."
        }
    }


def compare_funnels(
    funnel_a: List[Dict],
    funnel_b: List[Dict],
    labels: tuple = ("A", "B")
) -> Dict:
    """
    Compare two funnels (e.g., before/after or A/B test).

    Args:
        funnel_a: First funnel stages
        funnel_b: Second funnel stages
        labels: Labels for the two funnels

    Returns:
        Dict with comparison analysis
    """
    analysis_a = analyze_funnel(funnel_a)
    analysis_b = analyze_funnel(funnel_b)

    if "error" in analysis_a or "error" in analysis_b:
        return {"error": "Invalid funnel data"}

    # Compare overall conversion
    conv_a = analysis_a["overall_conversion"]
    conv_b = analysis_b["overall_conversion"]
    diff = conv_b - conv_a
    relative_change = (diff / conv_a * 100) if conv_a > 0 else 0

    # Compare stage by stage
    stage_comparison = []
    for i, (stage_a, stage_b) in enumerate(zip(analysis_a["stages"], analysis_b["stages"])):
        stage_comparison.append({
            "stage": stage_a["stage"],
            f"{labels[0]}_conversion": stage_a["stage_conversion"],
            f"{labels[1]}_conversion": stage_b["stage_conversion"],
            "difference": round(stage_b["stage_conversion"] - stage_a["stage_conversion"], 2),
            "improved": stage_b["stage_conversion"] > stage_a["stage_conversion"]
        })

    winner = labels[1] if conv_b > conv_a else labels[0]

    return {
        f"funnel_{labels[0]}": analysis_a,
        f"funnel_{labels[1]}": analysis_b,
        "comparison": {
            "overall_difference": round(diff, 2),
            "relative_change_percent": round(relative_change, 1),
            "winner": winner,
            "stage_comparison": stage_comparison
        },
        "recommendation": f"Funnel {winner} performs better with {abs(round(relative_change, 1))}% "
                         f"{'higher' if conv_b > conv_a else 'lower'} overall conversion."
    }


if __name__ == "__main__":
    # Example: E-commerce funnel
    stages = [
        {"name": "Website Visitors", "count": 50000},
        {"name": "Product View", "count": 15000},
        {"name": "Add to Cart", "count": 3000},
        {"name": "Begin Checkout", "count": 1500},
        {"name": "Purchase", "count": 750},
    ]

    result = analyze_funnel(stages)

    print("=== Funnel Analysis ===")
    print(f"Overall Conversion: {result['overall_conversion']}%")
    print()
    print("Stage Breakdown:")
    for stage in result["stages"]:
        print(f"  {stage['stage']}: {stage['count']:,} ({stage['stage_conversion']}% from prev, {stage['drop_off_rate']}% drop-off)")

    print()
    print(f"Biggest Drop-off: {result['biggest_drop_off']['stage']} ({result['biggest_drop_off']['drop_off_rate']}%)")
    print()
    print("Optimization Opportunity:")
    print(f"  {result['optimization_opportunity']['recommendation']}")
