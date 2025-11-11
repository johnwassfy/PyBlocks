#!/usr/bin/env python3
"""
Thesis Data Validation Script
Verifies all benchmark data is complete and ready for analysis
"""

import json
import os
import pandas as pd
from pathlib import Path

def validate_thesis_data():
    """Validate all collected benchmark data for thesis"""
    
    print("="*80)
    print("🎓 THESIS DATA VALIDATION")
    print("="*80)
    
    # Expected models to test (actual folder names from data/benchmark_results/)
    expected_models = [
        "openrouter_polaris-alpha",
        "tngtech_deepseek-r1t2-chimera_free",
        "minimax_minimax-m2_free",
        "openai_gpt-oss-20b_free",
        "z-ai_glm-4.5-air"
    ]
    
    # Check benchmark results
    benchmark_dir = Path("data/benchmark_results")
    print("\n📁 Checking Benchmark Results...")
    print("-"*80)
    
    found_models = []
    missing_models = []
    
    for model in expected_models:
        model_dir = benchmark_dir / model
        if model_dir.exists():
            # Find latest benchmark file
            json_files = list(model_dir.glob("benchmark_*.json"))
            if json_files:
                latest_file = max(json_files, key=lambda p: p.stat().st_mtime)
                with open(latest_file, 'r') as f:
                    data = json.load(f)
                print(f"✅ {model}: {len(data)} tests - {latest_file.name}")
                found_models.append(model)
            else:
                print(f"⚠️  {model}: Directory exists but no JSON files")
                missing_models.append(model)
        else:
            print(f"❌ {model}: No data found")
            missing_models.append(model)
    
    # Check analytics
    analytics_dir = Path("data/analytics_export")
    print("\n📊 Checking Analytics Files...")
    print("-"*80)
    
    required_files = [
        "COMPREHENSIVE_AI_REPORT.md",
        "service_aggregate_scores.csv",
        "analyze_service_metrics.csv",
        "chat_service_metrics.csv",
        "hint_service_metrics.csv",
        "recommend_service_metrics.csv"
    ]
    
    for model in found_models:
        model_analytics = analytics_dir / model
        if model_analytics.exists():
            missing_files = []
            for req_file in required_files:
                if not (model_analytics / req_file).exists():
                    missing_files.append(req_file)
            
            if missing_files:
                print(f"⚠️  {model}: Missing {len(missing_files)} files")
                for mf in missing_files:
                    print(f"     - {mf}")
            else:
                print(f"✅ {model}: All 6 analytics files present")
        else:
            print(f"❌ {model}: No analytics directory")
    
    # Check global summary
    print("\n🌐 Checking Global Summary...")
    print("-"*80)
    
    global_summary = benchmark_dir / "GLOBAL_SUMMARY.json"
    if global_summary.exists():
        with open(global_summary, 'r') as f:
            summary = json.load(f)
        
        models_in_summary = list(summary.get("models", {}).keys())
        print(f"✅ Global summary exists")
        print(f"   Models tracked: {len(models_in_summary)}")
        for model in models_in_summary:
            model_data = summary["models"][model]
            print(f"   • {model}: {model_data.get('total_tests', 0)} tests, "
                  f"{model_data.get('semantic_success_rate', 0):.1f}% success")
    else:
        print(f"❌ Global summary not found")
    
    # Summary
    print("\n" + "="*80)
    print("📋 VALIDATION SUMMARY")
    print("="*80)
    print(f"✅ Models with complete data: {len(found_models)}/{len(expected_models)}")
    print(f"⚠️  Models missing data: {len(missing_models)}/{len(expected_models)}")
    
    if missing_models:
        print("\n❌ Missing models:")
        for model in missing_models:
            print(f"   • {model}")
        print("\n💡 Run benchmark for missing models:")
        print("   1. Edit .env and set OPENAI_MODEL_NAME")
        print("   2. Run: python comprehensive_benchmark_runner.py")
    
    if len(found_models) == len(expected_models):
        print("\n🎉 ALL DATA COLLECTED - READY FOR ANALYSIS!")
        return True
    else:
        print(f"\n⏳ Collect data for {len(missing_models)} more model(s)")
        return False

if __name__ == "__main__":
    validate_thesis_data()
