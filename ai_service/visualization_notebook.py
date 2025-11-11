"""
📊 PYBLOCKS ANALYTICS VISUALIZATION
Jupyter Notebook for creating thesis-ready visualizations

Run this after extracting data with analytics_extractor.py
"""

# ============================================================================
# CELL 1: Setup and Imports
# ============================================================================

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime
import os

# Set style for professional plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 11

# Create output directory for figures
os.makedirs("data/analytics_export/figures", exist_ok=True)

print("✅ Libraries loaded successfully!")
print(f"📁 Output directory: data/analytics_export/figures")


# ============================================================================
# CELL 2: Load Data
# ============================================================================

# Load all datasets
submissions_df = pd.read_csv("data/analytics_export/raw_submissions.csv")
model_comparison = pd.read_csv("data/analytics_export/model_comparison.csv")
student_journeys = pd.read_csv("data/analytics_export/student_journeys.csv")
mission_analytics = pd.read_csv("data/analytics_export/mission_analytics.csv")

print("📊 Data loaded successfully!")
print(f"   - Submissions: {len(submissions_df)} records")
print(f"   - Models compared: {len(model_comparison)} models")
print(f"   - Students: {len(student_journeys)} students")
print(f"   - Missions: {len(mission_analytics)} missions")


# ============================================================================
# CELL 3: AI Model Success Rate Comparison
# ============================================================================

plt.figure(figsize=(10, 6))
bars = plt.bar(model_comparison['AI_Model'], model_comparison['Success_Rate'], 
               color=['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][:len(model_comparison)])
plt.xlabel('AI Model', fontsize=12, fontweight='bold')
plt.ylabel('Success Rate (%)', fontsize=12, fontweight='bold')
plt.title('AI Model Performance Comparison - Success Rate', fontsize=14, fontweight='bold')
plt.xticks(rotation=45, ha='right')
plt.ylim(0, 100)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.1f}%',
             ha='center', va='bottom', fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig('data/analytics_export/figures/model_success_rate.png', dpi=300, bbox_inches='tight')
plt.show()

print("✅ Figure saved: model_success_rate.png")


# ============================================================================
# CELL 4: AI Model Average Score Comparison
# ============================================================================

plt.figure(figsize=(10, 6))
bars = plt.bar(model_comparison['AI_Model'], model_comparison['Avg_Score'],
               color=['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][:len(model_comparison)])
plt.xlabel('AI Model', fontsize=12, fontweight='bold')
plt.ylabel('Average Score', fontsize=12, fontweight='bold')
plt.title('AI Model Performance - Average Student Score', fontsize=14, fontweight='bold')
plt.xticks(rotation=45, ha='right')

# Add value labels
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.1f}',
             ha='center', va='bottom', fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig('data/analytics_export/figures/model_avg_score.png', dpi=300, bbox_inches='tight')
plt.show()

print("✅ Figure saved: model_avg_score.png")


# ============================================================================
# CELL 5: Hints Usage Comparison
# ============================================================================

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Average hints per submission
ax1.bar(model_comparison['AI_Model'], model_comparison['Avg_Hints_Per_Submission'],
        color='#2196F3')
ax1.set_xlabel('AI Model', fontweight='bold')
ax1.set_ylabel('Average Hints per Submission', fontweight='bold')
ax1.set_title('AI Hint Usage - Average per Submission', fontweight='bold')
ax1.tick_params(axis='x', rotation=45)

# Total proactive help
ax2.bar(model_comparison['AI_Model'], model_comparison['Total_Proactive_Help'],
        color='#FF9800')
ax2.set_xlabel('AI Model', fontweight='bold')
ax2.set_ylabel('Total Proactive Help Instances', fontweight='bold')
ax2.set_title('AI Proactive Help - Total Count', fontweight='bold')
ax2.tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.savefig('data/analytics_export/figures/hints_comparison.png', dpi=300, bbox_inches='tight')
plt.show()

print("✅ Figure saved: hints_comparison.png")


# ============================================================================
# CELL 6: Response Time Comparison
# ============================================================================

plt.figure(figsize=(10, 6))
bars = plt.bar(model_comparison['AI_Model'], model_comparison['Avg_Response_Time_MS'],
               color=['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][:len(model_comparison)])
plt.xlabel('AI Model', fontsize=12, fontweight='bold')
plt.ylabel('Average Response Time (ms)', fontsize=12, fontweight='bold')
plt.title('AI Model Response Time Comparison', fontsize=14, fontweight='bold')
plt.xticks(rotation=45, ha='right')

# Add value labels
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.0f}ms',
             ha='center', va='bottom', fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig('data/analytics_export/figures/response_time.png', dpi=300, bbox_inches='tight')
plt.show()

print("✅ Figure saved: response_time.png")


# ============================================================================
# CELL 7: Comprehensive Model Radar Chart
# ============================================================================

# Normalize metrics for radar chart (0-100 scale)
radar_data = model_comparison[['AI_Model', 'Success_Rate', 'Avg_Score', 
                                'Avg_Hints_Per_Submission', 'Avg_Chatbot_Interactions']].copy()

# Normalize to 0-100 scale
radar_data['Avg_Score_Norm'] = (radar_data['Avg_Score'] / radar_data['Avg_Score'].max()) * 100
radar_data['Hints_Norm'] = (radar_data['Avg_Hints_Per_Submission'] / radar_data['Avg_Hints_Per_Submission'].max()) * 100
radar_data['Chat_Norm'] = (radar_data['Avg_Chatbot_Interactions'] / radar_data['Avg_Chatbot_Interactions'].max()) * 100

fig = go.Figure()

categories = ['Success Rate', 'Avg Score', 'Hint Usage', 'Chat Engagement']
colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336']

for idx, row in radar_data.iterrows():
    values = [row['Success_Rate'], row['Avg_Score_Norm'], row['Hints_Norm'], row['Chat_Norm']]
    values += values[:1]  # Complete the circle
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=categories + [categories[0]],
        fill='toself',
        name=row['AI_Model'],
        line_color=colors[idx % len(colors)]
    ))

fig.update_layout(
    polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
    title="AI Model Multi-Metric Performance Comparison",
    font=dict(size=12)
)

fig.write_html('data/analytics_export/figures/model_radar_chart.html')
fig.show()

print("✅ Figure saved: model_radar_chart.html")


# ============================================================================
# CELL 8: Student Success Distribution
# ============================================================================

plt.figure(figsize=(12, 6))
plt.hist(student_journeys['Success_Rate'], bins=20, color='#4CAF50', edgecolor='black', alpha=0.7)
plt.xlabel('Success Rate (%)', fontsize=12, fontweight='bold')
plt.ylabel('Number of Students', fontsize=12, fontweight='bold')
plt.title('Distribution of Student Success Rates', fontsize=14, fontweight='bold')
plt.axvline(student_journeys['Success_Rate'].mean(), color='red', linestyle='--', 
            linewidth=2, label=f'Mean: {student_journeys["Success_Rate"].mean():.1f}%')
plt.legend()
plt.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('data/analytics_export/figures/student_success_distribution.png', dpi=300, bbox_inches='tight')
plt.show()

print("✅ Figure saved: student_success_distribution.png")


# ============================================================================
# CELL 9: Mission Difficulty vs Success Rate
# ============================================================================

plt.figure(figsize=(12, 6))
difficulty_colors = {'beginner': '#4CAF50', 'intermediate': '#FF9800', 'advanced': '#F44336'}

for difficulty in mission_analytics['missionDifficulty'].unique():
    data = mission_analytics[mission_analytics['missionDifficulty'] == difficulty]
    plt.scatter(data['Total_Attempts'], data['Success_Rate'], 
                label=difficulty.capitalize(), 
                color=difficulty_colors.get(difficulty, '#2196F3'),
                s=100, alpha=0.6, edgecolors='black')

plt.xlabel('Total Attempts', fontsize=12, fontweight='bold')
plt.ylabel('Success Rate (%)', fontsize=12, fontweight='bold')
plt.title('Mission Difficulty Analysis: Attempts vs Success Rate', fontsize=14, fontweight='bold')
plt.legend()
plt.grid(alpha=0.3)

plt.tight_layout()
plt.savefig('data/analytics_export/figures/mission_difficulty_analysis.png', dpi=300, bbox_inches='tight')
plt.show()

print("✅ Figure saved: mission_difficulty_analysis.png")


# ============================================================================
# CELL 10: Comprehensive Summary Table (for Thesis)
# ============================================================================

print("="*80)
print("📊 COMPREHENSIVE AI MODEL COMPARISON SUMMARY (THESIS TABLE)")
print("="*80)
print()

# Create thesis-ready table
thesis_table = model_comparison[['AI_Model', 'Success_Rate', 'Avg_Score', 'Avg_Time_Seconds',
                                  'Avg_Hints_Per_Submission', 'Total_Proactive_Help',
                                  'Avg_Response_Time_MS', 'Unique_Students']].copy()

thesis_table.columns = ['Model', 'Success %', 'Avg Score', 'Time (s)', 
                        'Hints', 'Proactive', 'Response (ms)', 'Students']

# Format for display
thesis_table['Success %'] = thesis_table['Success %'].apply(lambda x: f"{x:.1f}%")
thesis_table['Avg Score'] = thesis_table['Avg Score'].apply(lambda x: f"{x:.1f}")
thesis_table['Time (s)'] = thesis_table['Time (s)'].apply(lambda x: f"{x:.1f}")
thesis_table['Hints'] = thesis_table['Hints'].apply(lambda x: f"{x:.2f}")
thesis_table['Response (ms)'] = thesis_table['Response (ms)'].apply(lambda x: f"{x:.0f}")

print(thesis_table.to_string(index=False))
print()
print("="*80)

# Save as LaTeX table
latex_table = model_comparison[['AI_Model', 'Success_Rate', 'Avg_Score', 'Avg_Time_Seconds',
                                 'Avg_Hints_Per_Submission', 'Avg_Response_Time_MS']].copy()
latex_table.to_latex('data/analytics_export/model_comparison_table.tex', index=False)

print("\n✅ LaTeX table saved: model_comparison_table.tex")
print("✅ All visualizations generated successfully!")
print(f"\n📁 Check 'data/analytics_export/figures/' for all images")
