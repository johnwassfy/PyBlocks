"""
📊 AI MODEL COMPARISON VISUALIZATIONS
Create thesis-ready charts for AI model evaluation

Run this after ai_model_evaluator.py to generate visualizations
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import os

# Try to import plotly
try:
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    import plotly.express as px
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False
    print("⚠️ plotly not installed - some interactive charts will be skipped")

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 11

# Create output directory
os.makedirs("data/analytics_export/figures/ai_comparison", exist_ok=True)


def load_evaluation_data():
    """Load all evaluation CSV files"""
    data_dir = "data/analytics_export"
    
    data = {}
    files = {
        'accuracy': 'ai_accuracy_metrics.csv',
        'feedback': 'ai_feedback_quality.csv',
        'efficiency': 'ai_efficiency_metrics.csv',
        'adaptivity': 'ai_adaptivity_metrics.csv',
        'creativity': 'ai_creativity_metrics.csv',
        'aggregate': 'ai_aggregate_scores.csv'
    }
    
    for key, filename in files.items():
        filepath = os.path.join(data_dir, filename)
        if os.path.exists(filepath):
            data[key] = pd.read_csv(filepath)
        else:
            print(f"⚠️ {filename} not found - some charts will be skipped")
            data[key] = pd.DataFrame()
    
    return data


def create_aggregate_comparison(aggregate_df):
    """Create comprehensive aggregate score comparison"""
    if aggregate_df.empty:
        return
    
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Prepare data for grouped bar chart
    scores = aggregate_df[['Model', 'Accuracy_Score', 'Feedback_Score', 
                           'Efficiency_Score', 'Adaptivity_Score', 'Creativity_Score']]
    
    x = np.arange(len(scores))
    width = 0.15
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    
    ax.bar(x - 2*width, scores['Accuracy_Score'], width, label='Accuracy', color=colors[0])
    ax.bar(x - width, scores['Feedback_Score'], width, label='Feedback', color=colors[1])
    ax.bar(x, scores['Efficiency_Score'], width, label='Efficiency', color=colors[2])
    ax.bar(x + width, scores['Adaptivity_Score'], width, label='Adaptivity', color=colors[3])
    ax.bar(x + 2*width, scores['Creativity_Score'], width, label='Creativity', color=colors[4])
    
    ax.set_xlabel('AI Model', fontweight='bold', fontsize=12)
    ax.set_ylabel('Score (0-100)', fontweight='bold', fontsize=12)
    ax.set_title('AI Model Performance Comparison - Component Scores', fontweight='bold', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(scores['Model'], rotation=45, ha='right')
    ax.legend(loc='upper right')
    ax.set_ylim(0, 100)
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('data/analytics_export/figures/ai_comparison/component_scores.png', dpi=300, bbox_inches='tight')
    print("✅ Saved: component_scores.png")
    plt.close()


def create_final_ranking(aggregate_df):
    """Create final ranking bar chart"""
    if aggregate_df.empty:
        return
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Sort by final score
    sorted_df = aggregate_df.sort_values('Final_Weighted_Score', ascending=True)
    
    colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(sorted_df)))
    bars = ax.barh(sorted_df['Model'], sorted_df['Final_Weighted_Score'], color=colors)
    
    ax.set_xlabel('Final Weighted Score (0-100)', fontweight='bold', fontsize=12)
    ax.set_title('AI Model Final Ranking', fontweight='bold', fontsize=14)
    ax.set_xlim(0, 100)
    
    # Add value labels
    for i, (bar, value) in enumerate(zip(bars, sorted_df['Final_Weighted_Score'])):
        ax.text(value + 2, bar.get_y() + bar.get_height()/2, 
                f'{value:.1f}', va='center', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('data/analytics_export/figures/ai_comparison/final_ranking.png', dpi=300, bbox_inches='tight')
    print("✅ Saved: final_ranking.png")
    plt.close()


def create_efficiency_comparison(efficiency_df):
    """Create efficiency metrics comparison"""
    if efficiency_df.empty:
        return
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Response time comparison
    models = efficiency_df['Model']
    response_times = efficiency_df['Avg_Response_Time_MS']
    
    bars1 = ax1.bar(models, response_times, color='#4ECDC4')
    ax1.set_xlabel('AI Model', fontweight='bold')
    ax1.set_ylabel('Response Time (ms)', fontweight='bold')
    ax1.set_title('Average Response Time', fontweight='bold')
    ax1.tick_params(axis='x', rotation=45)
    
    # Add value labels
    for bar in bars1:
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.0f}ms', ha='center', va='bottom', fontweight='bold')
    
    # Stability comparison
    stability = efficiency_df['Stability_%']
    
    bars2 = ax2.bar(models, stability, color='#45B7D1')
    ax2.set_xlabel('AI Model', fontweight='bold')
    ax2.set_ylabel('Stability (%)', fontweight='bold')
    ax2.set_title('Response Stability', fontweight='bold')
    ax2.set_ylim(0, 100)
    ax2.tick_params(axis='x', rotation=45)
    
    # Add value labels
    for bar in bars2:
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.1f}%', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('data/analytics_export/figures/ai_comparison/efficiency_metrics.png', dpi=300, bbox_inches='tight')
    print("✅ Saved: efficiency_metrics.png")
    plt.close()


def create_feedback_quality_comparison(feedback_df):
    """Create feedback quality comparison"""
    if feedback_df.empty:
        return
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    models = feedback_df['Model']
    
    # Readability score
    if 'Readability_Score' in feedback_df.columns:
        readability = feedback_df['Readability_Score']
        bars1 = ax1.bar(models, readability, color='#FFA07A')
        ax1.set_xlabel('AI Model', fontweight='bold')
        ax1.set_ylabel('Readability Score', fontweight='bold')
        ax1.set_title('Feedback Readability (Higher = Easier to Read)', fontweight='bold')
        ax1.tick_params(axis='x', rotation=45)
        
        for bar in bars1:
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}', ha='center', va='bottom', fontweight='bold')
    
    # Encouragement ratio
    encouragement = feedback_df['Encouragement_Ratio']
    bars2 = ax2.bar(models, encouragement, color='#98D8C8')
    ax2.set_xlabel('AI Model', fontweight='bold')
    ax2.set_ylabel('Encouragement Ratio', fontweight='bold')
    ax2.set_title('Encouragement Ratio (Positive/Total)', fontweight='bold')
    ax2.set_ylim(0, 1)
    ax2.tick_params(axis='x', rotation=45)
    
    for bar in bars2:
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('data/analytics_export/figures/ai_comparison/feedback_quality.png', dpi=300, bbox_inches='tight')
    print("✅ Saved: feedback_quality.png")
    plt.close()


def create_creativity_comparison(creativity_df):
    """Create creativity metrics comparison"""
    if creativity_df.empty:
        return
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    models = creativity_df['Model']
    x = np.arange(len(models))
    width = 0.35
    
    creative = creativity_df['Creative_Success_Rate_%']
    strict = creativity_df['Strict_Success_Rate_%']
    
    bars1 = ax.bar(x - width/2, creative, width, label='Creative Mode', color='#FF6B6B')
    bars2 = ax.bar(x + width/2, strict, width, label='Strict Mode', color='#4ECDC4')
    
    ax.set_xlabel('AI Model', fontweight='bold', fontsize=12)
    ax.set_ylabel('Success Rate (%)', fontweight='bold', fontsize=12)
    ax.set_title('Creative vs Strict Mode Success Rates', fontweight='bold', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(models, rotation=45, ha='right')
    ax.legend()
    ax.set_ylim(0, 100)
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('data/analytics_export/figures/ai_comparison/creativity_comparison.png', dpi=300, bbox_inches='tight')
    print("✅ Saved: creativity_comparison.png")
    plt.close()


def create_radar_chart(aggregate_df):
    """Create radar chart for multi-metric comparison"""
    if not HAS_PLOTLY or aggregate_df.empty:
        return
    
    categories = ['Accuracy', 'Feedback', 'Efficiency', 'Adaptivity', 'Creativity']
    
    fig = go.Figure()
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    
    for idx, row in aggregate_df.iterrows():
        values = [
            row['Accuracy_Score'],
            row['Feedback_Score'],
            row['Efficiency_Score'],
            row['Adaptivity_Score'],
            row['Creativity_Score']
        ]
        values += values[:1]  # Complete the circle
        
        fig.add_trace(go.Scatterpolar(
            r=values,
            theta=categories + [categories[0]],
            fill='toself',
            name=row['Model'],
            line_color=colors[idx % len(colors)]
        ))
    
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
        title="AI Model Multi-Dimensional Performance Comparison",
        font=dict(size=12),
        showlegend=True
    )
    
    fig.write_html('data/analytics_export/figures/ai_comparison/radar_comparison.html')
    print("✅ Saved: radar_comparison.html")


def create_heatmap(aggregate_df):
    """Create heatmap of all scores"""
    if aggregate_df.empty:
        return
    
    # Prepare data
    scores_df = aggregate_df[['Model', 'Accuracy_Score', 'Feedback_Score', 
                               'Efficiency_Score', 'Adaptivity_Score', 'Creativity_Score']]
    scores_df = scores_df.set_index('Model')
    scores_df.columns = ['Accuracy', 'Feedback', 'Efficiency', 'Adaptivity', 'Creativity']
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    sns.heatmap(scores_df, annot=True, fmt='.1f', cmap='RdYlGn', 
                cbar_kws={'label': 'Score (0-100)'}, ax=ax, vmin=0, vmax=100)
    
    ax.set_title('AI Model Performance Heatmap', fontweight='bold', fontsize=14)
    ax.set_xlabel('')
    ax.set_ylabel('')
    
    plt.tight_layout()
    plt.savefig('data/analytics_export/figures/ai_comparison/performance_heatmap.png', dpi=300, bbox_inches='tight')
    print("✅ Saved: performance_heatmap.png")
    plt.close()


def create_thesis_summary_table(aggregate_df):
    """Create a publication-ready summary table"""
    if aggregate_df.empty:
        return
    
    # Sort by final score
    sorted_df = aggregate_df.sort_values('Final_Weighted_Score', ascending=False)
    
    # Create thesis table
    thesis_table = sorted_df[['Model', 'Accuracy_Score', 'Feedback_Score', 
                               'Efficiency_Score', 'Adaptivity_Score', 
                               'Creativity_Score', 'Final_Weighted_Score']].copy()
    
    thesis_table.columns = ['Model', 'Accuracy', 'Feedback', 'Efficiency', 
                            'Adaptivity', 'Creativity', 'Final Score']
    
    # Round all scores
    for col in thesis_table.columns[1:]:
        thesis_table[col] = thesis_table[col].round(2)
    
    # Save as CSV
    thesis_table.to_csv('data/analytics_export/figures/ai_comparison/thesis_summary_table.csv', index=False)
    
    # Save as LaTeX
    latex_output = thesis_table.to_latex(index=False, float_format='%.2f')
    with open('data/analytics_export/figures/ai_comparison/thesis_summary_table.tex', 'w') as f:
        f.write(latex_output)
    
    print("✅ Saved: thesis_summary_table.csv and .tex")
    
    # Print to console
    print("\n" + "="*80)
    print("📊 THESIS SUMMARY TABLE")
    print("="*80)
    print(thesis_table.to_string(index=False))
    print("="*80 + "\n")


def main():
    """Generate all AI comparison visualizations"""
    print("\n" + "="*80)
    print("📊 GENERATING AI MODEL COMPARISON VISUALIZATIONS")
    print("="*80 + "\n")
    
    # Load data
    print("📂 Loading evaluation data...")
    data = load_evaluation_data()
    
    if data['aggregate'].empty:
        print("\n❌ No evaluation data found!")
        print("Run ai_model_evaluator.py first!")
        return
    
    print(f"✅ Loaded data for {len(data['aggregate'])} models\n")
    
    # Generate visualizations
    print("🎨 Generating visualizations...\n")
    
    create_aggregate_comparison(data['aggregate'])
    create_final_ranking(data['aggregate'])
    create_efficiency_comparison(data['efficiency'])
    create_feedback_quality_comparison(data['feedback'])
    create_creativity_comparison(data['creativity'])
    create_radar_chart(data['aggregate'])
    create_heatmap(data['aggregate'])
    create_thesis_summary_table(data['aggregate'])
    
    print("\n" + "="*80)
    print("✅ ALL VISUALIZATIONS GENERATED!")
    print("="*80)
    print("\n📁 Location: data/analytics_export/figures/ai_comparison/")
    print("\n📊 Files created:")
    print("   - component_scores.png - Component score comparison")
    print("   - final_ranking.png - Final model ranking")
    print("   - efficiency_metrics.png - Response time and stability")
    print("   - feedback_quality.png - Readability and encouragement")
    print("   - creativity_comparison.png - Creative vs strict modes")
    print("   - radar_comparison.html - Interactive multi-metric radar")
    print("   - performance_heatmap.png - Performance heatmap")
    print("   - thesis_summary_table.csv - Publication-ready table")
    print("   - thesis_summary_table.tex - LaTeX table")
    print("\n✨ Ready for your thesis!\n")


if __name__ == "__main__":
    main()
