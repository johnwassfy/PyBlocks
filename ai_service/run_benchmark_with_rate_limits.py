"""
Run comprehensive benchmark with custom rate limiting for free-tier models

Free model limits (tngtech/deepseek-r1t2-chimera:free):
- 16 requests per minute
- 50 requests per day

Rate limiting strategy:
- 4 seconds between tests = ~15 requests per minute (safe)
- 60 seconds between services = allows rate limit to reset
"""

import asyncio
from comprehensive_benchmark_runner import ComprehensiveAIBenchmark

async def main():
    print("🚀 Starting Comprehensive AI Benchmark with Rate Limiting\n")
    print("⚙️  Rate Limit Configuration:")
    print("   • 4s between tests (~15 requests/min)")
    print("   • 60s between services (rate reset)")
    print("   • Prevents 429 rate limit errors\n")
    
    # Create benchmark runner with rate limiting
    benchmark = ComprehensiveAIBenchmark(
        ai_service_url="http://localhost:8001",
        output_dir="data/benchmark_results",
        delay_between_tests=4.0,  # 4 seconds = ~15 req/min (safe for 16/min limit)
        delay_between_services=60.0  # 60 seconds = full reset between services
    )
    
    # Run benchmark with repeat_count=1 (run each test once)
    await benchmark.run_benchmark(repeat_count=1)

if __name__ == "__main__":
    asyncio.run(main())
