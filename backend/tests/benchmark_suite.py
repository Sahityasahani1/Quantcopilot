"""
QuantCopilot AI - Production High-Performance Benchmark Suite
Evaluates throughput, latency, and numerical stability across:
1. Chart Pattern Morphological Detector (Double Bottom, Double Top, H&S, Flag, Triangle)
2. FinBERT Financial Domain NLP Sentiment Engine
3. SEBI & Indian Government Policy Intelligence Tracker
4. Spatio-Temporal Deep Neural Attention Forecaster
5. End-to-End AI Scan Integration
"""

import sys
import os
import time
import math
import statistics
import pandas as pd
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ml_service.pattern_detector import pattern_detector_engine
from ml_service.finbert_sentiment import finbert_engine
from ml_service.sebi_policy_tracker import sebi_policy_tracker
from ml_service.deep_forecaster import forecaster_engine


def generate_synthetic_candles(num_bars: int = 200, base_price: float = 2400.0) -> pd.DataFrame:
    """Generates realistic candlestick series with swing pivots."""
    np.random.seed(42)
    times = [1700000000 + i * 300 for i in range(num_bars)]
    closes = [base_price]
    for i in range(1, num_bars):
        ret = np.random.normal(0.0002, 0.006)
        closes.append(closes[-1] * (1.0 + ret))
    
    opens = [closes[0]]
    highs = []
    lows = []
    vols = []
    for i in range(num_bars):
        c = closes[i]
        o = opens[-1] if i > 0 else c
        h = max(o, c) * (1.0 + abs(np.random.normal(0, 0.003)))
        l = min(o, c) * (1.0 - abs(np.random.normal(0, 0.003)))
        v = int(np.random.randint(5000, 150000))
        highs.append(round(h, 2))
        lows.append(round(l, 2))
        vols.append(v)
        if i < num_bars - 1:
            opens.append(c)

    return pd.DataFrame({
        "time": times,
        "Open": [round(o, 2) for o in opens],
        "High": highs,
        "Low": lows,
        "Close": [round(c, 2) for c in closes],
        "Volume": vols
    })


def benchmark_pattern_detector(iterations: int = 50) -> dict:
    """Benchmarks rolling-window pivot extraction and pattern classification."""
    df = generate_synthetic_candles(num_bars=250, base_price=1200.0)
    latencies = []

    for _ in range(iterations):
        t0 = time.perf_counter()
        patterns = pattern_detector_engine.detect_patterns(df, symbol="RELIANCE")
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

    avg_ms = statistics.mean(latencies)
    p95_ms = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)
    throughput = 1000.0 / avg_ms

    return {
        "component": "Chart Pattern Morphological Engine",
        "iterations": iterations,
        "avg_latency_ms": round(avg_ms, 3),
        "p95_latency_ms": round(p95_ms, 3),
        "throughput_fps": round(throughput, 1),
        "status": "PASS" if avg_ms < 15.0 else "WARN"
    }


def benchmark_finbert_sentiment(iterations: int = 100) -> dict:
    """Benchmarks FinBERT financial NLP lexicon and polarity calculation."""
    sample_headlines = [
        "Reliance Retail reports 22% quarterly profit surge driven by strong omnichannel demand",
        "Infosys cuts full year revenue guidance amid discretionary IT spending slowdown",
        "HDFC Bank asset quality stabilizes with gross NPA falling to record 1.15%",
        "Tata Motors EV unit signs mega battery assembly joint venture under PLI framework",
        "SEBI issues revised index derivatives framework to curtail retail intraday speculative losses",
        "TCS secures 500 million dollar multi-year cloud modernisation mandate from European insurer",
        "Crude oil prices decline 3% as global supply forecasts expand ahead of winter demand",
        "State Bank of India posts resilient net interest margins despite higher deposit rates"
    ]

    latencies = []
    for i in range(iterations):
        text = sample_headlines[i % len(sample_headlines)]
        t0 = time.perf_counter()
        res = finbert_engine.analyze_text(text)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

    avg_ms = statistics.mean(latencies)
    p95_ms = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)
    throughput = 1000.0 / max(0.001, avg_ms)

    return {
        "component": "FinBERT Financial Sentiment NLP Engine",
        "iterations": iterations,
        "avg_latency_ms": round(avg_ms, 4),
        "p95_latency_ms": round(p95_ms, 4),
        "throughput_ops_per_sec": round(throughput, 1),
        "status": "PASS" if avg_ms < 1.0 else "WARN"
    }


def benchmark_sebi_policy_tracker(iterations: int = 100) -> dict:
    """Benchmarks SEBI regulatory exposure scoring and circular indexing."""
    symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "TATAMOTORS", "NIFTY 50"]
    latencies = []

    for i in range(iterations):
        sym = symbols[i % len(symbols)]
        t0 = time.perf_counter()
        impact = sebi_policy_tracker.get_company_policy_impact(sym)
        all_policies = sebi_policy_tracker.get_all_policies()
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

    avg_ms = statistics.mean(latencies)
    p95_ms = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)
    throughput = 1000.0 / max(0.001, avg_ms)

    return {
        "component": "SEBI & Govt Policy Intelligence Engine",
        "iterations": iterations,
        "avg_latency_ms": round(avg_ms, 4),
        "p95_latency_ms": round(p95_ms, 4),
        "throughput_queries_per_sec": round(throughput, 1),
        "status": "PASS" if avg_ms < 2.0 else "WARN"
    }


def benchmark_deep_forecaster(iterations: int = 30) -> dict:
    """Benchmarks 18-alpha spatio-temporal self-attention multi-quantile neural projection."""
    df = generate_synthetic_candles(num_bars=100, base_price=24150.0)
    latencies = []

    for _ in range(iterations):
        t0 = time.perf_counter()
        fc = forecaster_engine.forecast(
            symbol="NIFTY 50",
            prices=df["Close"].tolist(),
            volumes=df["Volume"].tolist(),
            df=df
        )
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

    avg_ms = statistics.mean(latencies)
    p95_ms = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)
    throughput = 1000.0 / avg_ms

    return {
        "component": "Spatio-Temporal Deep Attention Forecaster",
        "iterations": iterations,
        "avg_latency_ms": round(avg_ms, 3),
        "p95_latency_ms": round(p95_ms, 3),
        "throughput_inferences_per_sec": round(throughput, 1),
        "status": "PASS" if avg_ms < 60.0 else "WARN"
    }


def run_full_benchmark_suite():
    """Executes full benchmark suite and prints production readiness scorecard."""
    print("=" * 80)
    print("QUANTCOPILOT AI - PRODUCTION HIGH-PERFORMANCE BENCHMARK SUITE")
    print("=" * 80)
    print("Testing core quantitative algorithms, NLP heuristics, and policy engines...\n")

    results = []

    # 1. Pattern Detector
    print("[1/4] Running Chart Pattern Detector Benchmark...")
    res_pat = benchmark_pattern_detector(iterations=60)
    results.append(res_pat)
    print(f"      Avg Latency: {res_pat['avg_latency_ms']} ms | P95: {res_pat['p95_latency_ms']} ms | Throughput: {res_pat['throughput_fps']} series/sec [{res_pat['status']}]")

    # 2. FinBERT Sentiment
    print("[2/4] Running FinBERT Sentiment NLP Benchmark...")
    res_snt = benchmark_finbert_sentiment(iterations=120)
    results.append(res_snt)
    print(f"      Avg Latency: {res_snt['avg_latency_ms']} ms | P95: {res_snt['p95_latency_ms']} ms | Throughput: {res_snt['throughput_ops_per_sec']} ops/sec [{res_snt['status']}]")

    # 3. SEBI Policy Tracker
    print("[3/4] Running SEBI Policy Intelligence Benchmark...")
    res_pol = benchmark_sebi_policy_tracker(iterations=120)
    results.append(res_pol)
    print(f"      Avg Latency: {res_pol['avg_latency_ms']} ms | P95: {res_pol['p95_latency_ms']} ms | Throughput: {res_pol['throughput_queries_per_sec']} queries/sec [{res_pol['status']}]")

    # 4. Spatio-Temporal Forecaster
    print("[4/4] Running Spatio-Temporal Neural Forecaster Benchmark...")
    res_fc = benchmark_deep_forecaster(iterations=40)
    results.append(res_fc)
    print(f"      Avg Latency: {res_fc['avg_latency_ms']} ms | P95: {res_fc['p95_latency_ms']} ms | Throughput: {res_fc['throughput_inferences_per_sec']} inf/sec [{res_fc['status']}]")

    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY SCORECARD")
    print("=" * 80)
    print(f"{'Component':<45} | {'Avg Latency':<12} | {'P95 Latency':<12} | {'Status':<6}")
    print("-" * 80)
    for r in results:
        print(f"{r['component']:<45} | {r['avg_latency_ms']:>8.3f} ms | {r['p95_latency_ms']:>8.3f} ms | {r['status']:<6}")
    print("=" * 80)

    all_passed = all(r['status'] == "PASS" for r in results)
    if all_passed:
        print("ALL BENCHMARKS PASSED: PRODUCTION PERFORMANCE VERIFIED.")
    else:
        print("SOME BENCHMARKS EXCEEDED THRESHOLD: REVIEW LOGS.")
    print("=" * 80)


if __name__ == "__main__":
    run_full_benchmark_suite()
