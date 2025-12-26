#!/usr/bin/env python3
"""
Thesis Visualization Generator
Creates publication-ready charts and graphs for thesis
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

class ThesisVisualizations:
    """Generate visualizations for thesis"""
    
    def __init__(self):
        self.benchmark_dir = Path("data/benchmark_results")
        self.output_dir = Path("data/thesis_visualizations")
        self.output_dir.mkdir(exist_ok=True)
        
        # Set publication-quality style
        sns.set_style("whitegrid")
        plt.rcParams['figure.dpi'] = 300
        plt.rcParams['savefig.dpi'] = 300
        plt.rcParams['font.size'] = 10
        plt.rcParams['figure.figsize'] = (10, 6)
    
    def load_all_model_data(self):
        """Load benchmark data for all models"""
        all_data = []
        
        for model_dir in self.benchmark_dir.iterdir():
            if not model_dir.is_dir():
                continue
            
            json_files = list(model_dir.glob("benchmark_*.json"))
            if not json_files:
                continue
            
            latest_file = max(json_files, key=lambda p: p.stat().st_mtime)
            
            with open(latest_file, 'r') as f:
                data = json.load(f)
            
            for record in data:
                record['model_name'] = model_dir.name
            
            all_data.extend(data)
        
        return pd.DataFrame(all_data)
    
    def plot_success_rates(self, df):
        """Plot success rates by model"""
        print("📊 Generating success rate comparison...")
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        # Overall success rate
        success_data = df.groupby('model_name').agg({
            'success': 'mean',
            'semantic_success': 'mean'
        }) * 100
        
        success_data.plot(kind='bar', ax=ax1, width=0.7)
        ax1.set_title('Overall Success Rates by Model', fontsize=14, fontweight='bold')
        ax1.set_xlabel('Model', fontsize=12)
        ax1.set_ylabel('Success Rate (%)', fontsize=12)
        ax1.set_ylim(0, 105)
        ax1.legend(['HTTP Success', 'Semantic Success'])
        ax1.grid(axis='y', alpha=0.3)
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Success rate by service
        service_success = df.groupby(['service', 'model_name'])['semantic_success'].mean() * 100
        service_success = service_success.unstack()
        
        service_success.plot(kind='bar', ax=ax2, width=0.7)
        ax2.set_title('Success Rate by Service', fontsize=14, fontweight='bold')
        ax2.set_xlabel('Service', fontsize=12)
        ax2.set_ylabel('Success Rate (%)', fontsize=12)
        ax2.set_ylim(0, 105)
        ax2.legend(title='Model', bbox_to_anchor=(1.05, 1), loc='upper left')
        ax2.grid(axis='y', alpha=0.3)
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        plt.tight_layout()
        output_file = self.output_dir / "fig1_success_rates.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def plot_response_times(self, df):
        """Plot response time distributions"""
        print("📊 Generating response time analysis...")
        
        # Filter AI models only (exclude rule-based)
        ai_df = df[df['model'] != 'rule-based'].copy()
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # 1. Box plot by model
        ai_df.boxplot(column='response_time_ms', by='model_name', ax=axes[0, 0])
        axes[0, 0].set_title('Response Time Distribution by Model', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('Model', fontsize=10)
        axes[0, 0].set_ylabel('Response Time (ms)', fontsize=10)
        plt.setp(axes[0, 0].xaxis.get_majorticklabels(), rotation=45, ha='right')
        plt.suptitle('')  # Remove default title
        
        # 2. Violin plot by service
        sns.violinplot(data=ai_df, x='service', y='response_time_ms', ax=axes[0, 1])
        axes[0, 1].set_title('Response Time by Service', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel('Service', fontsize=10)
        axes[0, 1].set_ylabel('Response Time (ms)', fontsize=10)
        
        # 3. Mean response time comparison
        mean_times = ai_df.groupby('model_name')['response_time_ms'].mean().sort_values()
        mean_times.plot(kind='barh', ax=axes[1, 0], color='steelblue')
        axes[1, 0].set_title('Mean Response Time Comparison', fontsize=12, fontweight='bold')
        axes[1, 0].set_xlabel('Response Time (ms)', fontsize=10)
        axes[1, 0].set_ylabel('Model', fontsize=10)
        axes[1, 0].grid(axis='x', alpha=0.3)
        
        # 4. Response time by service and model (heatmap)
        pivot_data = ai_df.groupby(['service', 'model_name'])['response_time_ms'].mean().unstack()
        sns.heatmap(pivot_data, annot=True, fmt='.0f', cmap='YlOrRd', ax=axes[1, 1])
        axes[1, 1].set_title('Response Time Heatmap (ms)', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Model', fontsize=10)
        axes[1, 1].set_ylabel('Service', fontsize=10)
        
        plt.tight_layout()
        output_file = self.output_dir / "fig2_response_times.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def plot_service_breakdown(self, df):
        """Plot detailed service analysis"""
        print("📊 Generating service breakdown...")
        
        # Check which services have data
        available_services = df['service'].unique()
        services_to_plot = [s for s in ['analyze', 'chat', 'hint', 'behavior', 'validation'] if s in available_services]
        
        # Determine grid size based on available services
        n_services = len(services_to_plot)
        n_rows = (n_services + 1) // 2
        n_cols = 2
        
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(14, 5*n_rows))
        if n_rows == 1:
            axes = axes.reshape(1, -1)
        
        services = services_to_plot[:n_rows*n_cols]
        
        for idx, service in enumerate(services):
            ax = axes[idx // 2, idx % 2]
            service_df = df[df['service'] == service]
            
            # Success rate by model
            success_by_model = service_df.groupby('model_name')['semantic_success'].mean() * 100
            
            success_by_model.plot(kind='bar', ax=ax, color='mediumseagreen')
            ax.set_title(f'{service.upper()} Service - Success Rate', 
                        fontsize=12, fontweight='bold')
            ax.set_xlabel('Model', fontsize=10)
            ax.set_ylabel('Success Rate (%)', fontsize=10)
            ax.set_ylim(0, 105)
            ax.grid(axis='y', alpha=0.3)
            plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
            
            # Add value labels on bars
            for container in ax.containers:
                ax.bar_label(container, fmt='%.1f%%', padding=3)
        
        plt.tight_layout()
        output_file = self.output_dir / "fig3_service_breakdown.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def plot_quality_metrics(self, df):
        """Plot AI response quality metrics"""
        print("📊 Generating quality metrics...")
        
        # Extract quality metrics from ANALYZE service
        analyze_df = df[df['service'] == 'analyze'].copy()
        
        if analyze_df.empty:
            print("⚠️  No ANALYZE service data found")
            return
        
        analyze_df['feedback_length'] = analyze_df['response_data'].apply(
            lambda x: len(x.get('feedback', '')) if isinstance(x, dict) else 0
        )
        analyze_df['ai_score'] = analyze_df['response_data'].apply(
            lambda x: x.get('score', 0) if isinstance(x, dict) else 0
        )
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        # Feedback length comparison
        feedback_stats = analyze_df.groupby('model_name')['feedback_length'].mean()
        feedback_stats.plot(kind='bar', ax=ax1, color='coral')
        ax1.set_title('Average Feedback Length (ANALYZE Service)', 
                     fontsize=12, fontweight='bold')
        ax1.set_xlabel('Model', fontsize=10)
        ax1.set_ylabel('Feedback Length (characters)', fontsize=10)
        ax1.grid(axis='y', alpha=0.3)
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # AI Score distribution
        analyze_df.boxplot(column='ai_score', by='model_name', ax=ax2)
        ax2.set_title('AI Score Distribution (ANALYZE Service)', 
                     fontsize=12, fontweight='bold')
        ax2.set_xlabel('Model', fontsize=10)
        ax2.set_ylabel('AI Score (0-100)', fontsize=10)
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')
        plt.suptitle('')
        
        plt.tight_layout()
        output_file = self.output_dir / "fig4_quality_metrics.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def plot_behavior_analysis(self, df):
        """Plot behavior service specific metrics"""
        print("📊 Generating behavior service analysis...")
        
        behavior_df = df[df['service'] == 'behavior'].copy()
        
        if behavior_df.empty:
            print("⚠️  No BEHAVIOR service data found")
            return
        
        # Extract behavior metrics
        behavior_df['pattern'] = behavior_df['response_data'].apply(
            lambda x: x.get('pattern', '') if isinstance(x, dict) else ''
        )
        behavior_df['hint_text'] = behavior_df['response_data'].apply(
            lambda x: x.get('hint', '') if isinstance(x, dict) else ''
        )
        behavior_df['hint_provided'] = behavior_df['hint_text'].apply(lambda x: 1 if x else 0)
        behavior_df['hint_length'] = behavior_df['hint_text'].apply(lambda x: len(x) if isinstance(x, str) else 0)
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # 1. Intervention Rate by Model
        intervention_rate = behavior_df.groupby('model_name')['hint_provided'].mean() * 100
        intervention_rate.plot(kind='bar', ax=axes[0, 0], color='coral')
        axes[0, 0].set_title('Intervention Rate by Model', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('Model', fontsize=10)
        axes[0, 0].set_ylabel('Intervention Rate (%)', fontsize=10)
        axes[0, 0].set_ylim(0, 105)
        axes[0, 0].grid(axis='y', alpha=0.3)
        plt.setp(axes[0, 0].xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add value labels
        for container in axes[0, 0].containers:
            axes[0, 0].bar_label(container, fmt='%.1f%%', padding=3)
        
        # 2. Average Hint Length
        hint_length = behavior_df[behavior_df['hint_provided'] == 1].groupby('model_name')['hint_length'].mean()
        if not hint_length.empty:
            hint_length.plot(kind='bar', ax=axes[0, 1], color='steelblue')
            axes[0, 1].set_title('Average Hint Length', fontsize=12, fontweight='bold')
            axes[0, 1].set_xlabel('Model', fontsize=10)
            axes[0, 1].set_ylabel('Characters', fontsize=10)
            axes[0, 1].grid(axis='y', alpha=0.3)
            plt.setp(axes[0, 1].xaxis.get_majorticklabels(), rotation=45, ha='right')
        else:
            axes[0, 1].set_title('Average Hint Length', fontsize=12, fontweight='bold')
            axes[0, 1].text(0.5, 0.5, 'No hints provided', ha='center', va='center', fontsize=12)
            axes[0, 1].set_xticks([])
            axes[0, 1].set_yticks([])
        
        # 3. Pattern Detection Distribution
        pattern_counts = behavior_df.groupby(['model_name', 'pattern']).size().unstack(fill_value=0)
        pattern_counts.plot(kind='bar', stacked=True, ax=axes[1, 0], colormap='Set3')
        axes[1, 0].set_title('Pattern Detection Distribution', fontsize=12, fontweight='bold')
        axes[1, 0].set_xlabel('Model', fontsize=10)
        axes[1, 0].set_ylabel('Count', fontsize=10)
        axes[1, 0].legend(title='Pattern', bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
        axes[1, 0].grid(axis='y', alpha=0.3)
        plt.setp(axes[1, 0].xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 4. Success Rate by Model
        success_rate = behavior_df.groupby('model_name')['semantic_success'].mean() * 100
        success_rate.plot(kind='bar', ax=axes[1, 1], color='mediumseagreen')
        axes[1, 1].set_title('Behavior Analysis Success Rate', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Model', fontsize=10)
        axes[1, 1].set_ylabel('Success Rate (%)', fontsize=10)
        axes[1, 1].set_ylim(0, 105)
        axes[1, 1].grid(axis='y', alpha=0.3)
        plt.setp(axes[1, 1].xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add value labels
        for container in axes[1, 1].containers:
            axes[1, 1].bar_label(container, fmt='%.1f%%', padding=3)
        
        plt.tight_layout()
        output_file = self.output_dir / "fig4b_behavior_analysis.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def plot_validation_analysis(self, df):
        """Plot validation service specific metrics"""
        print("📊 Generating validation service analysis...")
        
        validation_df = df[df['service'] == 'validation'].copy()
        
        if validation_df.empty:
            print("⚠️  No VALIDATION service data found")
            return
        
        # Extract validation metrics
        validation_df['is_valid'] = validation_df['response_data'].apply(
            lambda x: x.get('isValid') or x.get('is_valid') if isinstance(x, dict) else None
        )
        validation_df['hardcoding_detected'] = validation_df['response_data'].apply(
            lambda x: x.get('hardcodingDetected', False) if isinstance(x, dict) else False
        )
        validation_df['creativity_score'] = validation_df['response_data'].apply(
            lambda x: x.get('creativityScore', 0) if isinstance(x, dict) else 0
        )
        validation_df['complexity_score'] = validation_df['response_data'].apply(
            lambda x: x.get('complexityScore', 0) if isinstance(x, dict) else 0
        )
        validation_df['correct_validation'] = validation_df.apply(
            lambda row: (
                row['is_valid'] == row.get('expected_result', {}).get('isValid')
                if isinstance(row.get('expected_result'), dict) and 'isValid' in row.get('expected_result', {})
                else None
            ), axis=1
        )
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # 1. Validation Success Rate by Model
        success_rate = validation_df.groupby('model_name')['semantic_success'].mean() * 100
        success_rate.plot(kind='bar', ax=axes[0, 0], color='mediumseagreen')
        axes[0, 0].set_title('Validation Service Success Rate', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('Model', fontsize=10)
        axes[0, 0].set_ylabel('Success Rate (%)', fontsize=10)
        axes[0, 0].set_ylim(0, 105)
        axes[0, 0].grid(axis='y', alpha=0.3)
        plt.setp(axes[0, 0].xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add value labels
        for container in axes[0, 0].containers:
            axes[0, 0].bar_label(container, fmt='%.1f%%', padding=3)
        
        # 2. Hardcoding Detection Rate
        hardcoding_rate = validation_df.groupby('model_name')['hardcoding_detected'].mean() * 100
        hardcoding_rate.plot(kind='bar', ax=axes[0, 1], color='coral')
        axes[0, 1].set_title('Hardcoding Detection Rate', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel('Model', fontsize=10)
        axes[0, 1].set_ylabel('Detection Rate (%)', fontsize=10)
        axes[0, 1].set_ylim(0, 105)
        axes[0, 1].grid(axis='y', alpha=0.3)
        plt.setp(axes[0, 1].xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        for container in axes[0, 1].containers:
            axes[0, 1].bar_label(container, fmt='%.1f%%', padding=3)
        
        # 3. Creativity Score Distribution
        if validation_df['creativity_score'].sum() > 0:
            validation_df.boxplot(column='creativity_score', by='model_name', ax=axes[1, 0])
            axes[1, 0].set_title('Creativity Score Distribution', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('Model', fontsize=10)
            axes[1, 0].set_ylabel('Creativity Score', fontsize=10)
            plt.setp(axes[1, 0].xaxis.get_majorticklabels(), rotation=45, ha='right')
            plt.suptitle('')
        else:
            axes[1, 0].set_title('Creativity Score Distribution', fontsize=12, fontweight='bold')
            axes[1, 0].text(0.5, 0.5, 'No creativity scores available', ha='center', va='center', fontsize=12)
            axes[1, 0].set_xticks([])
            axes[1, 0].set_yticks([])
        
        # 4. Validation Accuracy (if expected results exist)
        accuracy_data = validation_df[validation_df['correct_validation'].notna()]
        if not accuracy_data.empty:
            accuracy = accuracy_data.groupby('model_name')['correct_validation'].mean() * 100
            accuracy.plot(kind='bar', ax=axes[1, 1], color='steelblue')
            axes[1, 1].set_title('Validation Accuracy', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('Model', fontsize=10)
            axes[1, 1].set_ylabel('Accuracy (%)', fontsize=10)
            axes[1, 1].set_ylim(0, 105)
            axes[1, 1].grid(axis='y', alpha=0.3)
            plt.setp(axes[1, 1].xaxis.get_majorticklabels(), rotation=45, ha='right')
            
            for container in axes[1, 1].containers:
                axes[1, 1].bar_label(container, fmt='%.1f%%', padding=3)
        else:
            axes[1, 1].set_title('Validation Accuracy', fontsize=12, fontweight='bold')
            axes[1, 1].text(0.5, 0.5, 'No expected results for comparison', ha='center', va='center', fontsize=12)
            axes[1, 1].set_xticks([])
            axes[1, 1].set_yticks([])
        
        plt.tight_layout()
        output_file = self.output_dir / "fig4c_validation_analysis.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def plot_overall_summary(self, df):
        """Create comprehensive summary visualization"""
        print("📊 Generating overall summary...")
        
        fig = plt.figure(figsize=(16, 10))
        gs = fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)
        
        # 1. Overall performance radar chart would go here
        # (requires more complex implementation)
        
        # 2. Test count by service
        ax1 = fig.add_subplot(gs[0, 0])
        test_counts = df['service'].value_counts()
        test_counts.plot(kind='pie', ax=ax1, autopct='%1.1f%%', startangle=90)
        ax1.set_title('Test Distribution by Service', fontsize=11, fontweight='bold')
        ax1.set_ylabel('')
        
        # 3. Model success comparison
        ax2 = fig.add_subplot(gs[0, 1:])
        model_success = df.groupby('model_name')['semantic_success'].agg(['sum', 'count'])
        model_success['success_rate'] = (model_success['sum'] / model_success['count']) * 100
        model_success['success_rate'].plot(kind='bar', ax=ax2, color='skyblue')
        ax2.set_title('Model Success Rate Comparison', fontsize=11, fontweight='bold')
        ax2.set_ylabel('Success Rate (%)', fontsize=10)
        ax2.set_ylim(0, 105)
        ax2.grid(axis='y', alpha=0.3)
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 4. Response time trends
        ax3 = fig.add_subplot(gs[1, :])
        ai_df = df[df['model'] != 'rule-based']
        for model in ai_df['model_name'].unique():
            model_data = ai_df[ai_df['model_name'] == model]
            ax3.plot(range(len(model_data)), 
                    model_data['response_time_ms'].values, 
                    label=model, alpha=0.6)
        ax3.set_title('Response Time Across Tests', fontsize=11, fontweight='bold')
        ax3.set_xlabel('Test Number', fontsize=10)
        ax3.set_ylabel('Response Time (ms)', fontsize=10)
        ax3.legend(fontsize=8)
        ax3.grid(alpha=0.3)
        
        # 5. Success rate matrix
        ax4 = fig.add_subplot(gs[2, :])
        service_model_success = df.groupby(['service', 'model_name'])['semantic_success'].mean() * 100
        service_model_pivot = service_model_success.unstack()
        sns.heatmap(service_model_pivot, annot=True, fmt='.1f', 
                   cmap='Greens', ax=ax4, cbar_kws={'label': 'Success Rate (%)'})
        ax4.set_title('Success Rate Matrix (Service × Model)', 
                     fontsize=11, fontweight='bold')
        ax4.set_xlabel('Model', fontsize=10)
        ax4.set_ylabel('Service', fontsize=10)
        
        output_file = self.output_dir / "fig5_overall_summary.png"
        plt.savefig(output_file, bbox_inches='tight')
        print(f"✅ Saved: {output_file}")
        plt.close()
    
    def generate_all_visualizations(self):
        """Generate all visualizations"""
        print("="*80)
        print("🎨 THESIS VISUALIZATION GENERATOR")
        print("="*80)
        
        # Load data
        print("\n📂 Loading benchmark data...")
        df = self.load_all_model_data()
        print(f"✅ Loaded {len(df)} test results from {df['model_name'].nunique()} models\n")
        
        # Generate visualizations
        self.plot_success_rates(df)
        self.plot_response_times(df)
        self.plot_service_breakdown(df)
        self.plot_quality_metrics(df)
        self.plot_behavior_analysis(df)
        self.plot_validation_analysis(df)
        self.plot_overall_summary(df)
        
        print("\n" + "="*80)
        print("✅ ALL VISUALIZATIONS GENERATED")
        print("="*80)
        print(f"\n📁 Saved to: {self.output_dir}")
        print("\n📊 Generated figures:")
        for file in sorted(self.output_dir.glob("*.png")):
            print(f"   • {file.name}")
        
        print("\n💡 These figures are publication-ready (300 DPI)")
        print("   You can insert them directly into your thesis document")

if __name__ == "__main__":
    viz = ThesisVisualizations()
    viz.generate_all_visualizations()
