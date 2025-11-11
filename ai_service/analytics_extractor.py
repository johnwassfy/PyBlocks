"""
📊 COMPREHENSIVE ANALYTICS EXTRACTOR FOR THESIS RESEARCH
Extracts data from MongoDB and AI event logs for ALL AI services

This script generates:
1. Raw submission data CSV (code analysis)
2. AI service usage metrics (chat, hints, recommendations)
3. Cross-service performance analysis
4. Statistical summaries for thesis
5. Anonymized datasets for publication

Services tracked:
- Code Analysis (/analyze)
- Chatbot Interactions (/chat)
- AI Hints (/hint)
- Mission Recommendations (/recommend)
- Behavior Analysis (/behavior)
"""

import pandas as pd
import json
from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from typing import Dict, List, Any
import numpy as np


class PyBlocksAnalyticsExtractor:
    """
    Comprehensive analytics extraction system
    """
    
    def __init__(
        self,
        mongo_uri: str = "mongodb://localhost:27017/",
        db_name: str = "pyblocks",
        output_dir: str = "data/analytics_export"
    ):
        """
        Initialize analytics extractor
        
        Args:
            mongo_uri: MongoDB connection string
            db_name: Database name
            output_dir: Directory for output files
        """
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"📊 Connected to MongoDB: {mongo_uri}")
        print(f"📁 Output directory: {output_dir}")
    
    def extract_all_data(self):
        """
        Extract raw data for AI model evaluation
        """
        print("\n" + "="*60)
        print("📊 PYBLOCKS DATA EXTRACTION")
        print("="*60 + "\n")
        
        # 1. Extract submission logs
        print("1️⃣ Extracting submission logs from MongoDB...")
        submissions_df = self.extract_submission_logs()
        
        # 2. Extract AI event logs
        print("\n2️⃣ Extracting AI event logs...")
        ai_events_df = self.extract_ai_events()
        
        # 3. Extract chatbot interactions
        print("\n3️⃣ Extracting chatbot interactions...")
        chatbot_df = self.extract_chatbot_interactions()
        
        # 4. Extract hints service usage
        print("\n4️⃣ Extracting hints service usage...")
        hints_df = self.extract_hints_usage(ai_events_df)
        
        # 5. Extract recommendations service usage
        print("\n5️⃣ Extracting recommendations service usage...")
        recommendations_df = self.extract_recommendations_usage(ai_events_df)
        
        print("\n" + "="*60)
        print("✅ EXTRACTION COMPLETE!")
        print("="*60)
        print(f"\n📁 Files saved to: {self.output_dir}")
        print(f"📊 Code Analysis Submissions: {len(submissions_df)}")
        print(f"🤖 Total AI Events: {len(ai_events_df)}")
        print(f"💬 Chatbot Interactions: {len(chatbot_df)}")
        print(f"💡 Hints Provided: {len(hints_df)}")
        print(f"🎯 Recommendations Given: {len(recommendations_df)}")
        print(f"\n📈 Next step: Run 'python comprehensive_ai_evaluator.py' to analyze all services")
        print(f"💡 Or run: 'python comprehensive_benchmark_runner.py' to test all models\n")
        
    def extract_submission_logs(self) -> pd.DataFrame:
        """
        Extract all submission logs from MongoDB
        """
        logs = list(self.db.submissionlogs.find({}))
        
        if not logs:
            print("⚠️ No submission logs found in database")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(logs)
        
        # Convert ObjectId to string
        if '_id' in df.columns:
            df['_id'] = df['_id'].astype(str)
        if 'userId' in df.columns:
            df['userId'] = df['userId'].astype(str)
        if 'missionId' in df.columns:
            df['missionId'] = df['missionId'].astype(str)
        
        # Convert timestamp
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Save raw data
        output_file = os.path.join(self.output_dir, "raw_submissions.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Saved {len(df)} submissions to: raw_submissions.csv")
        
        return df
    
    def extract_ai_events(self) -> pd.DataFrame:
        """
        Extract AI event logs from JSON file
        """
        ai_events_file = "data/ai_events.json"
        
        if not os.path.exists(ai_events_file):
            print(f"   ⚠️ AI events file not found: {ai_events_file}")
            return pd.DataFrame()
        
        # Read JSON lines
        events = []
        with open(ai_events_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    events.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue
        
        if not events:
            print("   ⚠️ No AI events found")
            return pd.DataFrame()
        
        df = pd.DataFrame(events)
        
        # Convert timestamp
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Save raw events
        output_file = os.path.join(self.output_dir, "ai_events.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Saved {len(df)} AI events to: ai_events.csv")
        
        return df
    
    def generate_model_comparison(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate AI model comparison metrics
        """
        if df.empty or 'aiModel' not in df.columns:
            print("   ⚠️ No AI model data available for comparison")
            return pd.DataFrame()
        
        # Group by AI model
        model_stats = df.groupby('aiModel').agg({
            'success': ['count', 'mean', 'sum'],
            'score': ['mean', 'std', 'median'],
            'timeSpent': ['mean', 'std', 'median'],
            'attempts': ['mean', 'std', 'median'],
            'aiHintsProvided': ['mean', 'sum'],
            'aiProactiveHelp': ['mean', 'sum'],
            'chatbotInteractions': ['mean', 'sum'],
            'aiResponseTime': ['mean', 'std', 'median'],
            'feedbackLength': ['mean', 'std'],
            'anonymizedUserId': 'nunique'
        }).round(2)
        
        # Flatten column names
        model_stats.columns = ['_'.join(col).strip() for col in model_stats.columns.values]
        model_stats = model_stats.reset_index()
        
        # Rename columns for clarity
        model_stats.columns = [
            'AI_Model',
            'Total_Submissions',
            'Success_Rate',
            'Successful_Submissions',
            'Avg_Score',
            'Score_StdDev',
            'Median_Score',
            'Avg_Time_Seconds',
            'Time_StdDev',
            'Median_Time',
            'Avg_Attempts',
            'Attempts_StdDev',
            'Median_Attempts',
            'Avg_Hints_Per_Submission',
            'Total_Hints_Provided',
            'Avg_Proactive_Help',
            'Total_Proactive_Help',
            'Avg_Chatbot_Interactions',
            'Total_Chatbot_Interactions',
            'Avg_Response_Time_MS',
            'Response_Time_StdDev',
            'Median_Response_Time',
            'Avg_Feedback_Length',
            'Feedback_Length_StdDev',
            'Unique_Students'
        ]
        
        # Convert success rate to percentage
        model_stats['Success_Rate'] = (model_stats['Success_Rate'] * 100).round(2)
        
        # Save model comparison
        output_file = os.path.join(self.output_dir, "model_comparison.csv")
        model_stats.to_csv(output_file, index=False)
        print(f"   ✅ Model comparison saved to: model_comparison.csv")
        
        # Print summary
        print(f"\n   📊 MODEL PERFORMANCE SUMMARY:")
        for _, row in model_stats.iterrows():
            print(f"      {row['AI_Model']}: {row['Success_Rate']}% success, "
                  f"{row['Avg_Score']:.1f} avg score, "
                  f"{row['Total_Submissions']} submissions")
        
        return model_stats
    
    def generate_student_journeys(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Analyze individual student learning journeys
        """
        if df.empty or 'anonymizedUserId' not in df.columns:
            print("   ⚠️ No student data available")
            return pd.DataFrame()
        
        # Group by student
        student_stats = df.groupby('anonymizedUserId').agg({
            'success': ['count', 'mean', 'sum'],
            'score': ['mean', 'sum'],
            'timeSpent': 'sum',
            'attempts': 'sum',
            'aiHintsProvided': 'sum',
            'aiProactiveHelp': 'sum',
            'chatbotInteractions': 'sum',
            'missionId': 'nunique',
            'aiModel': lambda x: x.mode()[0] if len(x.mode()) > 0 else 'unknown'
        }).round(2)
        
        # Flatten and rename
        student_stats.columns = [
            'Total_Submissions',
            'Success_Rate',
            'Successful_Missions',
            'Avg_Score',
            'Total_Score',
            'Total_Time_Spent_Seconds',
            'Total_Attempts',
            'Total_Hints_Used',
            'Total_Proactive_Help',
            'Total_Chatbot_Interactions',
            'Unique_Missions_Attempted',
            'Primary_AI_Model'
        ]
        student_stats = student_stats.reset_index()
        
        # Convert success rate to percentage
        student_stats['Success_Rate'] = (student_stats['Success_Rate'] * 100).round(2)
        
        # Calculate engagement score (custom metric)
        student_stats['Engagement_Score'] = (
            student_stats['Total_Submissions'] * 0.3 +
            student_stats['Total_Chatbot_Interactions'] * 0.3 +
            student_stats['Total_Time_Spent_Seconds'] / 60 * 0.4  # Convert to minutes
        ).round(2)
        
        # Save student journeys
        output_file = os.path.join(self.output_dir, "student_journeys.csv")
        student_stats.to_csv(output_file, index=False)
        print(f"   ✅ Student journeys saved to: student_journeys.csv")
        
        return student_stats
    
    def generate_mission_analytics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Analyze mission difficulty and completion rates
        """
        if df.empty or 'missionId' not in df.columns:
            print("   ⚠️ No mission data available")
            return pd.DataFrame()
        
        # Group by mission
        mission_stats = df.groupby(['missionId', 'missionTitle', 'missionDifficulty']).agg({
            'success': ['count', 'mean', 'sum'],
            'score': ['mean', 'median'],
            'timeSpent': ['mean', 'median'],
            'attempts': ['mean', 'median'],
            'anonymizedUserId': 'nunique'
        }).round(2)
        
        # Flatten and rename
        mission_stats.columns = [
            'Total_Attempts',
            'Success_Rate',
            'Successful_Completions',
            'Avg_Score',
            'Median_Score',
            'Avg_Time_Seconds',
            'Median_Time_Seconds',
            'Avg_Attempts',
            'Median_Attempts',
            'Unique_Students'
        ]
        mission_stats = mission_stats.reset_index()
        
        # Convert success rate to percentage
        mission_stats['Success_Rate'] = (mission_stats['Success_Rate'] * 100).round(2)
        
        # Calculate difficulty score (inverse of success rate)
        mission_stats['Actual_Difficulty'] = (100 - mission_stats['Success_Rate']).round(2)
        
        # Save mission analytics
        output_file = os.path.join(self.output_dir, "mission_analytics.csv")
        mission_stats.to_csv(output_file, index=False)
        print(f"   ✅ Mission analytics saved to: mission_analytics.csv")
        
        return mission_stats
    
    def generate_thesis_summary(
        self,
        submissions_df: pd.DataFrame,
        model_comparison: pd.DataFrame,
        student_journeys: pd.DataFrame,
        mission_analytics: pd.DataFrame
    ):
        """
        Generate comprehensive thesis summary report
        """
        summary_file = os.path.join(self.output_dir, "THESIS_SUMMARY.md")
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("# 📊 PyBlocks Analytics Summary - Thesis Research\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")
            
            # Overall Statistics
            f.write("## 📈 Overall Platform Statistics\n\n")
            if not submissions_df.empty:
                f.write(f"- **Total Submissions:** {len(submissions_df):,}\n")
                f.write(f"- **Unique Students:** {submissions_df['anonymizedUserId'].nunique()}\n")
                f.write(f"- **Unique Missions:** {submissions_df['missionId'].nunique()}\n")
                f.write(f"- **Overall Success Rate:** {(submissions_df['success'].mean() * 100):.2f}%\n")
                f.write(f"- **Average Score:** {submissions_df['score'].mean():.2f}\n")
                f.write(f"- **Total Learning Time:** {(submissions_df['timeSpent'].sum() / 3600):.2f} hours\n\n")
            
            # AI Model Comparison
            f.write("## 🤖 AI Model Performance Comparison\n\n")
            if not model_comparison.empty:
                f.write("| Model | Success Rate | Avg Score | Avg Time (s) | Hints Used | Students |\n")
                f.write("|-------|-------------|-----------|--------------|------------|----------|\n")
                for _, row in model_comparison.iterrows():
                    f.write(f"| {row['AI_Model']} | {row['Success_Rate']}% | "
                           f"{row['Avg_Score']:.1f} | {row['Avg_Time_Seconds']:.1f} | "
                           f"{row['Avg_Hints_Per_Submission']:.2f} | {row['Unique_Students']} |\n")
                f.write("\n")
            
            # Top Performing Students
            f.write("## 🌟 Top Performing Students (Anonymized)\n\n")
            if not student_journeys.empty:
                top_students = student_journeys.nlargest(10, 'Success_Rate')
                f.write("| Student ID | Success Rate | Missions | Total Score |\n")
                f.write("|-----------|--------------|----------|-------------|\n")
                for _, row in top_students.iterrows():
                    f.write(f"| {row['anonymizedUserId']} | {row['Success_Rate']}% | "
                           f"{row['Unique_Missions_Attempted']} | {row['Total_Score']:.0f} |\n")
                f.write("\n")
            
            # Mission Difficulty Analysis
            f.write("## 🎯 Mission Difficulty Analysis\n\n")
            if not mission_analytics.empty:
                f.write("### Easiest Missions\n\n")
                easiest = mission_analytics.nlargest(5, 'Success_Rate')
                for _, row in easiest.iterrows():
                    f.write(f"- **{row['missionTitle']}** ({row['missionDifficulty']}): "
                           f"{row['Success_Rate']}% success\n")
                
                f.write("\n### Most Challenging Missions\n\n")
                hardest = mission_analytics.nsmallest(5, 'Success_Rate')
                for _, row in hardest.iterrows():
                    f.write(f"- **{row['missionTitle']}** ({row['missionDifficulty']}): "
                           f"{row['Success_Rate']}% success\n")
                f.write("\n")
            
            # Research Insights
            f.write("## 💡 Key Research Insights\n\n")
            if not model_comparison.empty and len(model_comparison) > 1:
                best_model = model_comparison.loc[model_comparison['Success_Rate'].idxmax()]
                fastest_model = model_comparison.loc[model_comparison['Avg_Response_Time_MS'].idxmin()]
                
                f.write(f"1. **Best Performing Model:** {best_model['AI_Model']} "
                       f"({best_model['Success_Rate']}% success rate)\n")
                f.write(f"2. **Fastest Response Time:** {fastest_model['AI_Model']} "
                       f"({fastest_model['Avg_Response_Time_MS']:.0f}ms average)\n")
                
                if not submissions_df.empty:
                    f.write(f"3. **AI Assistance Impact:** Students who received hints had an average "
                           f"success rate of {(submissions_df[submissions_df['aiHintsProvided'] > 0]['success'].mean() * 100):.2f}%\n")
            
            f.write("\n---\n\n")
            f.write("## 📁 Generated Files\n\n")
            f.write("- `raw_submissions.csv` - Complete submission data\n")
            f.write("- `ai_events.csv` - AI interaction events\n")
            f.write("- `model_comparison.csv` - AI model performance metrics\n")
            f.write("- `student_journeys.csv` - Individual student progress\n")
            f.write("- `mission_analytics.csv` - Mission difficulty analysis\n")
            f.write("- `THESIS_SUMMARY.md` - This summary report\n\n")
            f.write("---\n\n")
            f.write("*Data is anonymized for research publication*\n")
        
        print(f"   ✅ Thesis summary saved to: THESIS_SUMMARY.md")
    
    def extract_chatbot_interactions(self) -> pd.DataFrame:
        """
        Extract chatbot interaction logs
        """
        # Try to find chatbot collection in MongoDB
        chatbot_logs = list(self.db.chatbotlogs.find({}))
        
        if not chatbot_logs:
            print("   ⚠️ No chatbot logs found in database")
            return pd.DataFrame()
        
        df = pd.DataFrame(chatbot_logs)
        
        # Convert IDs to string
        if '_id' in df.columns:
            df['_id'] = df['_id'].astype(str)
        if 'userId' in df.columns:
            df['userId'] = df['userId'].astype(str)
        
        # Convert timestamp
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Save
        output_file = os.path.join(self.output_dir, "chatbot_interactions.csv")
        df.to_csv(output_file, index=False)
        print(f"   ✅ Saved {len(df)} chatbot interactions to: chatbot_interactions.csv")
        
        return df
    
    def extract_hints_usage(self, ai_events_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract hints service usage from AI events
        """
        if ai_events_df.empty:
            print("   ⚠️ No AI events available for hints extraction")
            return pd.DataFrame()
        
        # Filter for hint events
        if 'event_type' in ai_events_df.columns:
            hints_df = ai_events_df[ai_events_df['event_type'] == 'hint_provided'].copy()
        else:
            hints_df = pd.DataFrame()
        
        if hints_df.empty:
            print("   ⚠️ No hint events found")
            return pd.DataFrame()
        
        # Save
        output_file = os.path.join(self.output_dir, "hints_usage.csv")
        hints_df.to_csv(output_file, index=False)
        print(f"   ✅ Saved {len(hints_df)} hint events to: hints_usage.csv")
        
        return hints_df
    
    def extract_recommendations_usage(self, ai_events_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract recommendations service usage from AI events
        """
        if ai_events_df.empty:
            print("   ⚠️ No AI events available for recommendations extraction")
            return pd.DataFrame()
        
        # Filter for recommendation events
        if 'event_type' in ai_events_df.columns:
            recs_df = ai_events_df[ai_events_df['event_type'] == 'recommendation_provided'].copy()
        else:
            recs_df = pd.DataFrame()
        
        if recs_df.empty:
            print("   ⚠️ No recommendation events found")
            return pd.DataFrame()
        
        # Save
        output_file = os.path.join(self.output_dir, "recommendations_usage.csv")
        recs_df.to_csv(output_file, index=False)
        print(f"   ✅ Saved {len(recs_df)} recommendation events to: recommendations_usage.csv")
        
        return recs_df


def main():
    """
    Main execution function
    """
    print("\n🚀 Starting PyBlocks Analytics Extraction...\n")
    
    # Initialize extractor
    extractor = PyBlocksAnalyticsExtractor(
        mongo_uri="mongodb://localhost:27017/",
        db_name="pyblocks",
        output_dir="data/analytics_export"
    )
    
    # Extract all data
    extractor.extract_all_data()
    
    print("\n✨ Analytics extraction complete! Check the output directory for all files.\n")


if __name__ == "__main__":
    main()
