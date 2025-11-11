"""
📊 COMPREHENSIVE AI SERVICE EVALUATOR
Analyzes performance of ALL AI services across the platform

This evaluates:
1. ANALYZE Service - Code analysis and feedback
2. CHAT Service - Chatbot interactions
3. HINT Service - AI hints generation
4. RECOMMEND Service - Mission recommendations

Metrics include:
- Response quality and relevance
- Response time and efficiency
- Error handling
- Context awareness
- Consistency across models
"""

import pandas as pd
import json
import os
from typing import Dict, List, Any
import numpy as np
from datetime import datetime
import glob


class ComprehensiveAIEvaluator:
    """
    Evaluates all AI services comprehensively
    Supports model-specific analysis with separate folders per model
    """
    
    def __init__(self, model_folder: str = None, output_dir: str = "data/analytics_export"):
        """
        Args:
            model_folder: Name of model folder (e.g., 'z-ai_glm-4.5-air')
                         If None, will try to detect from benchmark results
            output_dir: Base output directory for analytics
        """
        self.model_folder = model_folder
        self.output_dir = output_dir
        
        # Create model-specific analytics folder if model_folder provided
        if model_folder:
            self.model_output_dir = os.path.join(output_dir, model_folder)
            os.makedirs(self.model_output_dir, exist_ok=True)
            print(f"📊 Comprehensive AI Service Evaluator initialized")
            print(f"🤖 Analyzing model: {model_folder}")
            print(f"� Output directory: {self.model_output_dir}\n")
        else:
            self.model_output_dir = output_dir
            os.makedirs(output_dir, exist_ok=True)
            print(f"�📊 Comprehensive AI Service Evaluator initialized")
            print(f"📁 Output directory: {output_dir}\n")
    
    def load_benchmark_data(self, benchmark_dir: str = "data/benchmark_results") -> pd.DataFrame:
        """Load benchmark results from model-specific folder or detect latest"""
        # If model folder specified, load from that folder
        if self.model_folder:
            search_path = os.path.join(benchmark_dir, self.model_folder, "benchmark_*.json")
        else:
            # Search all model folders
            search_path = os.path.join(benchmark_dir, "*", "benchmark_*.json")
        
        benchmark_files = glob.glob(search_path)
        
        if not benchmark_files:
            print(f"❌ No benchmark results found in: {search_path}")
            print("💡 Run: python comprehensive_benchmark_runner.py")
            return pd.DataFrame()
        
        # Load most recent
        latest_file = max(benchmark_files, key=os.path.getctime)
        print(f"📂 Loading benchmark data from: {os.path.basename(latest_file)}")
        
        with open(latest_file, 'r') as f:
            results = json.load(f)
        
        df = pd.DataFrame(results)
        print(f"✅ Loaded {len(df)} test results\n")
        
        return df
    
    def evaluate_all_services(self):
        """Main evaluation entry point"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE AI SERVICE EVALUATION")
        print("="*80 + "\n")
        
        # Load data
        df = self.load_benchmark_data()
        if df.empty:
            return
        
        # Evaluate each service
        print("1️⃣ Evaluating ANALYZE service...")
        analyze_metrics = self.evaluate_analyze_service(df[df['service'] == 'analyze'])
        
        print("\n2️⃣ Evaluating CHAT service...")
        chat_metrics = self.evaluate_chat_service(df[df['service'] == 'chat'])
        
        print("\n3️⃣ Evaluating HINT service...")
        hint_metrics = self.evaluate_hint_service(df[df['service'] == 'hint'])
        
        print("\n4️⃣ Evaluating RECOMMEND service...")
        recommend_metrics = self.evaluate_recommend_service(df[df['service'] == 'recommend'])
        
        # Generate aggregate report
        print("\n5️⃣ Generating comprehensive report...")
        self.generate_comprehensive_report(df, analyze_metrics, chat_metrics, hint_metrics, recommend_metrics)
        
        print("\n" + "="*80)
        print("✅ EVALUATION COMPLETE!")
        print("="*80)
        print(f"\n📁 Check {self.model_output_dir} for detailed reports\n")
    
    # ==================== ANALYZE SERVICE EVALUATION ====================
    
    def evaluate_analyze_service(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate code analysis service"""
        if df.empty:
            return {}
        
        metrics = {
            'service_name': 'Code Analysis',
            'total_tests': len(df),
            'models_tested': df['model'].nunique(),
            'success_rate': (df['success'].sum() / len(df) * 100),
            'avg_response_time': df['response_time_ms'].mean(),
            'median_response_time': df['response_time_ms'].median(),
            'response_time_std': df['response_time_ms'].std(),
        }
        
        # Extract feedback quality metrics from responses
        feedback_lengths = []
        scores = []
        
        for idx, row in df[df['success']].iterrows():
            if 'response_data' in row and row['response_data']:
                data = row['response_data']
                if 'feedback' in data:
                    feedback_lengths.append(len(data['feedback']))
                if 'score' in data:
                    scores.append(data['score'])
        
        if feedback_lengths:
            metrics['avg_feedback_length'] = np.mean(feedback_lengths)
            metrics['median_feedback_length'] = np.median(feedback_lengths)
        
        if scores:
            metrics['avg_score'] = np.mean(scores)
            metrics['median_score'] = np.median(scores)
        
        # Performance by model
        model_performance = df.groupby('model').agg({
            'success': ['count', 'mean'],
            'response_time_ms': ['mean', 'median', 'std']
        }).round(2)
        
        metrics['model_performance'] = model_performance.to_dict()
        
        # Save detailed metrics
        output_file = os.path.join(self.model_output_dir, "analyze_service_metrics.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Analyze service metrics: {metrics['success_rate']:.1f}% success, {metrics['avg_response_time']:.0f}ms avg")
        
        return metrics
    
    # ==================== CHAT SERVICE EVALUATION ====================
    
    def evaluate_chat_service(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate chatbot service"""
        if df.empty:
            return {}
        
        metrics = {
            'service_name': 'Chatbot',
            'total_tests': len(df),
            'models_tested': df['model'].nunique(),
            'success_rate': (df['success'].sum() / len(df) * 100),
            'avg_response_time': df['response_time_ms'].mean(),
            'median_response_time': df['response_time_ms'].median(),
        }
        
        # Extract chat-specific metrics
        response_lengths = []
        helpful_scores = []
        
        for idx, row in df[df['success']].iterrows():
            if 'response_data' in row and row['response_data']:
                data = row['response_data']
                if 'message' in data:
                    response_lengths.append(len(data['message']))
                if 'helpful' in data:
                    helpful_scores.append(1 if data['helpful'] else 0)
        
        if response_lengths:
            metrics['avg_response_length'] = np.mean(response_lengths)
            metrics['median_response_length'] = np.median(response_lengths)
        
        if helpful_scores:
            metrics['helpfulness_rate'] = np.mean(helpful_scores) * 100
        
        # Save detailed metrics
        output_file = os.path.join(self.model_output_dir, "chat_service_metrics.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Chat service metrics: {metrics['success_rate']:.1f}% success, {metrics['avg_response_time']:.0f}ms avg")
        
        return metrics
    
    # ==================== HINT SERVICE EVALUATION ====================
    
    def evaluate_hint_service(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate hints service"""
        if df.empty:
            return {}
        
        metrics = {
            'service_name': 'AI Hints',
            'total_tests': len(df),
            'models_tested': df['model'].nunique(),
            'success_rate': (df['success'].sum() / len(df) * 100),
            'avg_response_time': df['response_time_ms'].mean(),
            'median_response_time': df['response_time_ms'].median(),
        }
        
        # Extract hint-specific metrics
        hint_counts = []
        hint_relevances = []
        
        for idx, row in df[df['success']].iterrows():
            if 'response_data' in row and row['response_data']:
                data = row['response_data']
                if 'hints' in data and isinstance(data['hints'], list):
                    hint_counts.append(len(data['hints']))
                if 'relevance_score' in data:
                    hint_relevances.append(data['relevance_score'])
        
        if hint_counts:
            metrics['avg_hints_per_request'] = np.mean(hint_counts)
            metrics['median_hints_per_request'] = np.median(hint_counts)
        
        if hint_relevances:
            metrics['avg_relevance_score'] = np.mean(hint_relevances)
        
        # Save detailed metrics
        output_file = os.path.join(self.model_output_dir, "hint_service_metrics.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Hint service metrics: {metrics['success_rate']:.1f}% success, {metrics['avg_response_time']:.0f}ms avg")
        
        return metrics
    
    # ==================== RECOMMEND SERVICE EVALUATION ====================
    
    def evaluate_recommend_service(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate recommendation service"""
        if df.empty:
            return {}
        
        metrics = {
            'service_name': 'Mission Recommendations',
            'total_tests': len(df),
            'success_rate': (df['success'].sum() / len(df) * 100),
            'avg_response_time': df['response_time_ms'].mean(),
            'median_response_time': df['response_time_ms'].median(),
        }
        
        # Extract recommendation-specific metrics
        recommendation_counts = []
        
        for idx, row in df[df['success']].iterrows():
            if 'response_data' in row and row['response_data']:
                data = row['response_data']
                if 'recommendations' in data and isinstance(data['recommendations'], list):
                    recommendation_counts.append(len(data['recommendations']))
        
        if recommendation_counts:
            metrics['avg_recommendations'] = np.mean(recommendation_counts)
            metrics['median_recommendations'] = np.median(recommendation_counts)
        
        # Save detailed metrics
        output_file = os.path.join(self.model_output_dir, "recommend_service_metrics.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Recommend service metrics: {metrics['success_rate']:.1f}% success, {metrics['avg_response_time']:.0f}ms avg")
        
        return metrics
    
    # ==================== COMPREHENSIVE REPORT ====================
    
    def generate_comprehensive_report(
        self,
        df: pd.DataFrame,
        analyze_metrics: Dict,
        chat_metrics: Dict,
        hint_metrics: Dict,
        recommend_metrics: Dict
    ):
        """Generate markdown report for all services"""
        report_file = os.path.join(self.model_output_dir, "COMPREHENSIVE_AI_REPORT.md")
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("# 📊 Comprehensive AI Service Evaluation Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")
            
            # Executive Summary
            f.write("## 📈 Executive Summary\n\n")
            f.write(f"- **Total Tests Executed:** {len(df):,}\n")
            f.write(f"- **Overall Success Rate:** {(df['success'].sum() / len(df) * 100):.2f}%\n")
            f.write(f"- **Services Tested:** {df['service'].nunique()}\n")
            f.write(f"- **AI Models Evaluated:** {df['model'].nunique()}\n")
            f.write(f"- **Average Response Time:** {df['response_time_ms'].mean():.0f}ms\n\n")
            
            # Service-by-Service Breakdown
            f.write("## 🔍 Service-by-Service Analysis\n\n")
            
            # ANALYZE Service
            if analyze_metrics:
                f.write("### 1️⃣ Code Analysis Service\n\n")
                f.write(f"- **Total Tests:** {analyze_metrics['total_tests']}\n")
                f.write(f"- **Success Rate:** {analyze_metrics['success_rate']:.2f}%\n")
                f.write(f"- **Avg Response Time:** {analyze_metrics['avg_response_time']:.0f}ms\n")
                if 'avg_feedback_length' in analyze_metrics:
                    f.write(f"- **Avg Feedback Length:** {analyze_metrics['avg_feedback_length']:.0f} chars\n")
                if 'avg_score' in analyze_metrics:
                    f.write(f"- **Avg Score Given:** {analyze_metrics['avg_score']:.1f}/100\n")
                f.write("\n")
            
            # CHAT Service
            if chat_metrics:
                f.write("### 2️⃣ Chatbot Service\n\n")
                f.write(f"- **Total Tests:** {chat_metrics['total_tests']}\n")
                f.write(f"- **Success Rate:** {chat_metrics['success_rate']:.2f}%\n")
                f.write(f"- **Avg Response Time:** {chat_metrics['avg_response_time']:.0f}ms\n")
                if 'avg_response_length' in chat_metrics:
                    f.write(f"- **Avg Response Length:** {chat_metrics['avg_response_length']:.0f} chars\n")
                if 'helpfulness_rate' in chat_metrics:
                    f.write(f"- **Helpfulness Rate:** {chat_metrics['helpfulness_rate']:.1f}%\n")
                f.write("\n")
            
            # HINT Service
            if hint_metrics:
                f.write("### 3️⃣ AI Hints Service\n\n")
                f.write(f"- **Total Tests:** {hint_metrics['total_tests']}\n")
                f.write(f"- **Success Rate:** {hint_metrics['success_rate']:.2f}%\n")
                f.write(f"- **Avg Response Time:** {hint_metrics['avg_response_time']:.0f}ms\n")
                if 'avg_hints_per_request' in hint_metrics:
                    f.write(f"- **Avg Hints Per Request:** {hint_metrics['avg_hints_per_request']:.1f}\n")
                if 'avg_relevance_score' in hint_metrics:
                    f.write(f"- **Avg Relevance Score:** {hint_metrics['avg_relevance_score']:.2f}\n")
                f.write("\n")
            
            # RECOMMEND Service
            if recommend_metrics:
                f.write("### 4️⃣ Recommendation Service\n\n")
                f.write(f"- **Total Tests:** {recommend_metrics['total_tests']}\n")
                f.write(f"- **Success Rate:** {recommend_metrics['success_rate']:.2f}%\n")
                f.write(f"- **Avg Response Time:** {recommend_metrics['avg_response_time']:.0f}ms\n")
                if 'avg_recommendations' in recommend_metrics:
                    f.write(f"- **Avg Recommendations:** {recommend_metrics['avg_recommendations']:.1f}\n")
                f.write("\n")
            
            # Model Comparison
            f.write("## 🤖 AI Model Comparison\n\n")
            model_stats = df.groupby('model').agg({
                'success': ['count', lambda x: (x.sum() / len(x) * 100)],
                'response_time_ms': ['mean', 'median']
            }).round(2)
            
            f.write("| Model | Total Tests | Success Rate | Avg Time (ms) | Median Time (ms) |\n")
            f.write("|-------|-------------|--------------|---------------|------------------|\n")
            
            for model in model_stats.index:
                stats = model_stats.loc[model]
                f.write(f"| {model} | {int(stats[('success', 'count')])} | "
                       f"{stats[('success', '<lambda_0>')]:.1f}% | "
                       f"{stats[('response_time_ms', 'mean')]:.0f} | "
                       f"{stats[('response_time_ms', 'median')]:.0f} |\n")
            f.write("\n")
            
            # Service Performance Matrix
            f.write("## 📊 Service Performance Matrix\n\n")
            service_model_stats = df.groupby(['service', 'model']).agg({
                'success': lambda x: (x.sum() / len(x) * 100),
                'response_time_ms': 'mean'
            }).round(2)
            
            f.write("### Success Rates by Service and Model\n\n")
            for service in df['service'].unique():
                f.write(f"\n**{service.upper()}:**\n\n")
                service_data = service_model_stats.loc[service]
                for model in service_data.index:
                    success_rate = service_data.loc[model, 'success']
                    f.write(f"- {model}: {success_rate:.1f}%\n")
            
            f.write("\n")
            
            # Recommendations
            f.write("## 💡 Key Insights & Recommendations\n\n")
            
            # Best performing model overall
            best_model = df.groupby('model')['success'].mean().idxmax()
            best_success_rate = df.groupby('model')['success'].mean().max() * 100
            f.write(f"1. **Best Overall Model:** {best_model} ({best_success_rate:.1f}% success rate)\n")
            
            # Fastest model
            fastest_model = df.groupby('model')['response_time_ms'].mean().idxmin()
            fastest_time = df.groupby('model')['response_time_ms'].mean().min()
            f.write(f"2. **Fastest Model:** {fastest_model} ({fastest_time:.0f}ms average response time)\n")
            
            # Service with highest success rate
            best_service = df.groupby('service')['success'].mean().idxmax()
            best_service_rate = df.groupby('service')['success'].mean().max() * 100
            f.write(f"3. **Most Reliable Service:** {best_service} ({best_service_rate:.1f}% success rate)\n")
            
            f.write("\n---\n\n")
            f.write("## 📁 Generated Files\n\n")
            f.write("- `analyze_service_metrics.csv` - Code analysis detailed metrics\n")
            f.write("- `chat_service_metrics.csv` - Chatbot service metrics\n")
            f.write("- `hint_service_metrics.csv` - Hints service metrics\n")
            f.write("- `recommend_service_metrics.csv` - Recommendation service metrics\n")
            f.write("- `COMPREHENSIVE_AI_REPORT.md` - This comprehensive report\n\n")
        
        print(f"   ✅ Comprehensive report saved to: COMPREHENSIVE_AI_REPORT.md")
        
        # Also create aggregate scores CSV
        aggregate_data = []
        
        for service, metrics in [
            ('analyze', analyze_metrics),
            ('chat', chat_metrics),
            ('hint', hint_metrics),
            ('recommend', recommend_metrics)
        ]:
            if metrics:
                aggregate_data.append({
                    'service': service,
                    'total_tests': metrics.get('total_tests', 0),
                    'success_rate': metrics.get('success_rate', 0),
                    'avg_response_time_ms': metrics.get('avg_response_time', 0),
                    'median_response_time_ms': metrics.get('median_response_time', 0)
                })
        
        agg_df = pd.DataFrame(aggregate_data)
        agg_file = os.path.join(self.model_output_dir, "service_aggregate_scores.csv")
        agg_df.to_csv(agg_file, index=False)
        print(f"   ✅ Aggregate scores saved to: service_aggregate_scores.csv")


def main():
    """Main execution - auto-detects model folder from latest benchmark"""
    print("\n🚀 Starting Comprehensive AI Service Evaluation...\n")
    
    # Auto-detect model folder from latest benchmark
    benchmark_dir = "data/benchmark_results"
    model_folders = [d for d in os.listdir(benchmark_dir) if os.path.isdir(os.path.join(benchmark_dir, d))]
    
    if not model_folders:
        print("❌ No model folders found in benchmark_results/")
        print("💡 Run: python comprehensive_benchmark_runner.py")
        return
    
    # Get most recent model folder
    latest_folder = max(
        model_folders,
        key=lambda d: os.path.getctime(os.path.join(benchmark_dir, d))
    )
    
    print(f"🤖 Auto-detected model folder: {latest_folder}\n")
    
    evaluator = ComprehensiveAIEvaluator(model_folder=latest_folder)
    evaluator.evaluate_all_services()
    
    print(f"\n✨ Evaluation complete! Check data/analytics_export/{latest_folder}/ for reports.\n")


if __name__ == "__main__":
    main()
