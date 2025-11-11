#!/usr/bin/env python3
"""
Cross-Model Statistical Analysis for Thesis
Performs comprehensive statistical analysis across all tested AI models
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from scipy import stats
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns

class ThesisStatisticalAnalysis:
    """Statistical analysis for thesis research"""
    
    def __init__(self):
        self.benchmark_dir = Path("data/benchmark_results")
        self.output_dir = Path("data/thesis_analysis")
        self.output_dir.mkdir(exist_ok=True)
        
    def load_all_model_data(self):
        """Load benchmark data for all models"""
        all_data = []
        
        for model_dir in self.benchmark_dir.iterdir():
            if not model_dir.is_dir() or model_dir.name == "GLOBAL_SUMMARY.json":
                continue
            
            # Find latest benchmark file
            json_files = list(model_dir.glob("benchmark_*.json"))
            if not json_files:
                continue
            
            latest_file = max(json_files, key=lambda p: p.stat().st_mtime)
            
            with open(latest_file, 'r') as f:
                data = json.load(f)
            
            # Add model name to each record
            for record in data:
                record['model_name'] = model_dir.name
            
            all_data.extend(data)
        
        df = pd.DataFrame(all_data)
        print(f"✅ Loaded {len(df)} total test results from {df['model_name'].nunique()} models")
        return df
    
    def analyze_overall_performance(self, df):
        """Analyze overall model performance"""
        print("\n" + "="*80)
        print("📊 OVERALL MODEL PERFORMANCE")
        print("="*80)
        
        # Group by model
        model_stats = df.groupby('model_name').agg({
            'success': ['count', 'sum', 'mean'],
            'semantic_success': ['sum', 'mean'],
            'response_time_ms': ['mean', 'median', 'std', 'min', 'max']
        }).round(2)
        
        print("\nModel Performance Summary:")
        print(model_stats)
        
        # Save to CSV
        output_file = self.output_dir / "model_performance_summary.csv"
        model_stats.to_csv(output_file)
        print(f"\n✅ Saved to: {output_file}")
        
        return model_stats
    
    def analyze_by_service(self, df):
        """Analyze performance by service"""
        print("\n" + "="*80)
        print("📦 PERFORMANCE BY SERVICE")
        print("="*80)
        
        # Group by model and service
        service_stats = df.groupby(['model_name', 'service']).agg({
            'success': ['count', 'mean'],
            'semantic_success': 'mean',
            'response_time_ms': ['mean', 'median']
        }).round(2)
        
        print("\nService Performance by Model:")
        print(service_stats)
        
        # Save to CSV
        output_file = self.output_dir / "service_performance_by_model.csv"
        service_stats.to_csv(output_file)
        print(f"\n✅ Saved to: {output_file}")
        
        return service_stats
    
    def statistical_significance_tests(self, df):
        """Perform statistical significance tests"""
        print("\n" + "="*80)
        print("📈 STATISTICAL SIGNIFICANCE TESTS")
        print("="*80)
        
        models = df['model_name'].unique()
        results = []
        
        # Response time comparison (ANOVA)
        print("\n1️⃣ Response Time Comparison (ANOVA)")
        
        # Only compare AI models (exclude rule-based)
        ai_models_df = df[df['model'] != 'rule-based']
        groups = [ai_models_df[ai_models_df['model_name'] == model]['response_time_ms'].dropna() 
                  for model in ai_models_df['model_name'].unique()]
        
        if len(groups) > 1:
            f_stat, p_value = stats.f_oneway(*groups)
            print(f"   F-statistic: {f_stat:.4f}")
            print(f"   P-value: {p_value:.6f}")
            
            if p_value < 0.05:
                print(f"   ✅ Significant difference in response times (p < 0.05)")
            else:
                print(f"   ⚠️  No significant difference in response times")
            
            results.append({
                'test': 'Response Time ANOVA',
                'f_statistic': f_stat,
                'p_value': p_value,
                'significant': p_value < 0.05
            })
        
        # Pairwise comparisons (t-tests)
        print("\n2️⃣ Pairwise Response Time Comparisons (t-tests)")
        
        ai_models = ai_models_df['model_name'].unique()
        for i, model1 in enumerate(ai_models):
            for model2 in ai_models[i+1:]:
                group1 = ai_models_df[ai_models_df['model_name'] == model1]['response_time_ms'].dropna()
                group2 = ai_models_df[ai_models_df['model_name'] == model2]['response_time_ms'].dropna()
                
                t_stat, p_value = stats.ttest_ind(group1, group2)
                
                print(f"\n   {model1} vs {model2}:")
                print(f"   T-statistic: {t_stat:.4f}, P-value: {p_value:.6f}")
                
                if p_value < 0.05:
                    faster = model1 if group1.mean() < group2.mean() else model2
                    print(f"   ✅ Significant difference - {faster} is faster")
                else:
                    print(f"   ⚠️  No significant difference")
                
                results.append({
                    'test': f't-test: {model1} vs {model2}',
                    't_statistic': t_stat,
                    'p_value': p_value,
                    'significant': p_value < 0.05
                })
        
        # Save results
        results_df = pd.DataFrame(results)
        output_file = self.output_dir / "statistical_tests.csv"
        results_df.to_csv(output_file, index=False)
        print(f"\n✅ Statistical test results saved to: {output_file}")
        
        return results_df
    
    def analyze_service_quality(self, df):
        """Analyze AI response quality metrics"""
        print("\n" + "="*80)
        print("🎯 AI RESPONSE QUALITY ANALYSIS")
        print("="*80)
        
        # Analyze ANALYZE service
        analyze_df = df[df['service'] == 'analyze'].copy()
        
        if not analyze_df.empty:
            print("\n📝 ANALYZE Service Quality:")
            
            # Extract feedback from response_data
            analyze_df['feedback_text'] = analyze_df['response_data'].apply(
                lambda x: x.get('feedback', '') if isinstance(x, dict) else ''
            )
            analyze_df['feedback_length'] = analyze_df['feedback_text'].apply(len)
            analyze_df['ai_score'] = analyze_df['response_data'].apply(
                lambda x: x.get('score', 0) if isinstance(x, dict) else 0
            )
            
            quality_stats = analyze_df.groupby('model_name').agg({
                'feedback_length': ['mean', 'median', 'std'],
                'ai_score': ['mean', 'median', 'std']
            }).round(2)
            
            print(quality_stats)
            
            output_file = self.output_dir / "analyze_quality_metrics.csv"
            quality_stats.to_csv(output_file)
            print(f"\n✅ Saved to: {output_file}")
        
        # Analyze CHAT service
        chat_df = df[df['service'] == 'chat'].copy()
        
        if not chat_df.empty:
            print("\n💬 CHAT Service Quality:")
            
            chat_df['response_text'] = chat_df['response_data'].apply(
                lambda x: x.get('response', '') if isinstance(x, dict) else ''
            )
            chat_df['response_length'] = chat_df['response_text'].apply(len)
            
            quality_stats = chat_df.groupby('model_name').agg({
                'response_length': ['mean', 'median', 'std']
            }).round(2)
            
            print(quality_stats)
            
            output_file = self.output_dir / "chat_quality_metrics.csv"
            quality_stats.to_csv(output_file)
            print(f"\n✅ Saved to: {output_file}")
    
    def generate_comparison_tables(self, df):
        """Generate publication-ready comparison tables"""
        print("\n" + "="*80)
        print("📋 GENERATING COMPARISON TABLES")
        print("="*80)
        
        # Table 1: Overall Performance
        overall = df.groupby('model_name').agg({
            'success': ['count', lambda x: f"{(x.sum()/len(x)*100):.1f}%"],
            'semantic_success': lambda x: f"{(x.sum()/len(x)*100):.1f}%",
            'response_time_ms': ['mean', 'median']
        })
        
        overall.columns = ['Total Tests', 'HTTP Success', 'Semantic Success', 
                          'Mean Time (ms)', 'Median Time (ms)']
        overall['Mean Time (ms)'] = overall['Mean Time (ms)'].round(0).astype(int)
        overall['Median Time (ms)'] = overall['Median Time (ms)'].round(0).astype(int)
        
        print("\nTable 1: Overall Model Performance")
        print(overall.to_markdown())
        
        output_file = self.output_dir / "table1_overall_performance.csv"
        overall.to_csv(output_file)
        
        # Table 2: Service-Specific Performance
        service_perf = df.groupby(['service', 'model_name']).agg({
            'semantic_success': lambda x: f"{(x.sum()/len(x)*100):.1f}%",
            'response_time_ms': lambda x: f"{x.mean():.0f}"
        }).reset_index()
        
        service_pivot = service_perf.pivot(index='service', 
                                           columns='model_name', 
                                           values='semantic_success')
        
        print("\nTable 2: Success Rate by Service")
        print(service_pivot.to_markdown())
        
        output_file = self.output_dir / "table2_service_performance.csv"
        service_pivot.to_csv(output_file)
        
        print(f"\n✅ Tables saved to: {self.output_dir}")
    
    def run_complete_analysis(self):
        """Run all analyses"""
        print("="*80)
        print("🎓 THESIS STATISTICAL ANALYSIS")
        print("="*80)
        
        # Load data
        df = self.load_all_model_data()
        
        # Run analyses
        self.analyze_overall_performance(df)
        self.analyze_by_service(df)
        self.statistical_significance_tests(df)
        self.analyze_service_quality(df)
        self.generate_comparison_tables(df)
        
        print("\n" + "="*80)
        print("✅ ANALYSIS COMPLETE")
        print("="*80)
        print(f"\n📁 All results saved to: {self.output_dir}")
        print("\n📊 Generated files:")
        for file in self.output_dir.glob("*.csv"):
            print(f"   • {file.name}")

if __name__ == "__main__":
    analyzer = ThesisStatisticalAnalysis()
    analyzer.run_complete_analysis()
