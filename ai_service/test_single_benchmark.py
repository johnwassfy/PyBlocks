"""
Quick test to verify benchmark runner works with fixed API schemas
"""

import asyncio
import sys
from comprehensive_benchmark_runner import ComprehensiveAIBenchmark


async def test_single_model():
    """Test analyze service with one model and one test"""
    runner = ComprehensiveAIBenchmark()
    
    print("\n" + "="*80)
    print(f"🧪 SINGLE TEST: Testing services with {runner.models[0]}")
    print("="*80 + "\n")
    
    # Run comprehensive benchmark with repeat_count=1
    await runner.run_comprehensive_benchmark(repeat_count=1)
    
    print("\n" + "="*80)
    print("✨ BENCHMARK COMPLETE - Check data/benchmark_results for full results")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(test_single_model())
