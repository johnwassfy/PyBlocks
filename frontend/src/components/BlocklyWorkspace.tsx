'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { submitCode, type SubmissionResponse } from '../services/submissionsApi';
import { useChatbot } from './KidSidebar';
import { useBehaviorTracker } from '../hooks/useBehaviorTracker';
import FunConsoleModal from './FunConsoleModal';
import ChatInterface from './ChatInterface';
import '../styles/kid-sidebar.css';

// Type definitions (move to top)
export type MissionStep = {
  title: string;
  instructions: string;
  starterCode?: string;
  expectedOutput?: string;
  testCases?: { input: string; expectedOutput: string }[];
  concepts?: string[];
  hints?: string[];
  aiCheckpoints?: boolean;
  xpReward?: number;
};

export type ValidationRules = {
  disallowHardcodedOutput?: boolean;
  requiredConcepts?: string[];
  forbiddenPatterns?: string[];
};

export type MissionConfig = {
  allowSkipSteps?: boolean;
};

export type MissionAnalytics = {
  averageStepsCompleted?: number;
  averageCompletionTime?: number;
  completionRate?: number;
};

export enum ToolboxCategoryName {
  VARIABLES = 'VARIABLES',
  DECISIONS = 'DECISIONS',
  ITERATION = 'ITERATION',
  FUNCTIONS = 'FUNCTIONS',
  CALCULATIONS = 'CALCULATIONS',
  OUTPUT_WITH_PLOTTING = 'OUTPUT_WITH_PLOTTING',
  INPUT = 'INPUT',
  TURTLES = 'TURTLES',
  VALUES = 'VALUES',
  CONVERSIONS = 'CONVERSIONS',
  LISTS = 'LISTS',
  DICTIONARIES = 'DICTIONARIES',
}

export type ToolboxCategoryFilter = {
  name: ToolboxCategoryName;
  allowedBlocks?: string[]; // specific block code strings to allow; if empty/undefined, all blocks in category are allowed
};

export type ToolboxConfig = {
  mode: 'full' | 'restrict' | 'hide'; // 'full': all blocks, 'restrict': only specified categories, 'hide': empty toolbox
  categories?: ToolboxCategoryFilter[]; // only used if mode is 'restrict'
};

export type Mission = {
  _id: string;
  title: string;
  description: string;
  order: number;
  xpReward: number;
  difficulty: string;
  tags: string[];
  objectives: string[];
  hints: string[];
  starterCode?: string;
  expectedOutput?: string;
  estimatedTime?: number;
  testCases?: { input: string; expectedOutput: string }[];
  concepts?: string[];

  // NEW: Step-based mission structure
  steps?: MissionStep[];
  validationRules?: ValidationRules;
  config?: MissionConfig;
  analytics?: MissionAnalytics;
  toolboxConfig?: ToolboxConfig; // NEW: Toolbox filtering configuration
};
export type UserData = {
  id: string;  // MongoDB _id
  username: string;
  avatar: string;
  ageRange: string;
  role: string;
  guardianEmail?: string;
};

export type ProfileData = {
  codingExperience: string;
  pythonFamiliarity: string;
  knownConcepts: string[];
  weakSkills: string[];
  strongSkills: string[];
  totalSubmissions: number;
  successfulSubmissions: number;
  avgAccuracy: number;
  skillScores: Record<string, number>;
  lastActive?: string;
};

export type Achievement = {
  _id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
};

export type GamificationData = {
  xp: number;
  level: number;
  streak: number;
  completedMissions: string[];
  totalMissionsCompleted: number;
  achievements: Achievement[];
};
interface BlocklyWorkspaceProps {
  mission: Mission;
  user: UserData | null;
  profile: ProfileData | null;
  gamification: GamificationData | null;
  sendChatMessage: (request: any) => Promise<any>;
  getPredefinedPrompts: () => Promise<any>;
  checkAIServiceHealth: () => Promise<boolean>;
}

export default function BlocklyWorkspace({
  mission,
  user,
  profile,
  gamification,
  sendChatMessage,
  getPredefinedPrompts,
  checkAIServiceHealth,
}: BlocklyWorkspaceProps) {
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToolboxReady, setIsToolboxReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const startTimeRef = useRef<number>(Date.now());

  // Console Modal State
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [consoleCode, setConsoleCode] = useState('');

  // 🧠 NEW: Live AI Observation System
  const [blockActivity, setBlockActivity] = useState<any[]>([]);
  const [idleTime, setIdleTime] = useState(0);
  const [lastEditTime, setLastEditTime] = useState(Date.now());
  const [liveHint, setLiveHint] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const behaviorSyncRef = useRef<NodeJS.Timeout | null>(null);

  // 🧰 Helper function: Map category display name to enum key
  const getCategoryKeyFromName = (displayName: string): ToolboxCategoryName | null => {
    const nameMap: Record<string, ToolboxCategoryName> = {
      'Variables': ToolboxCategoryName.VARIABLES,
      'Decisions': ToolboxCategoryName.DECISIONS,
      'Iteration': ToolboxCategoryName.ITERATION,
      'Functions': ToolboxCategoryName.FUNCTIONS,
      'Calculations': ToolboxCategoryName.CALCULATIONS,
      'Output and Plotting': ToolboxCategoryName.OUTPUT_WITH_PLOTTING,
      'Input': ToolboxCategoryName.INPUT,
      'Turtles': ToolboxCategoryName.TURTLES,
      'Values': ToolboxCategoryName.VALUES,
      'Conversions': ToolboxCategoryName.CONVERSIONS,
      'Lists': ToolboxCategoryName.LISTS,
      'Dictionaries': ToolboxCategoryName.DICTIONARIES,
    };
    return nameMap[displayName] || null;
  };

  // 🧰 Helper function: Apply toolbox filtering based on mission config
  const applyToolboxFiltering = (mission: Mission) => {
    console.log('[🧰 Toolbox] === STARTING FILTER PROCESS ===');
    console.log('[🧰 Toolbox] Mission:', mission?.title);
    console.log('[🧰 Toolbox] ToolboxConfig:', mission?.toolboxConfig);

    if (!mission?.toolboxConfig) {
      console.warn('[🧰 Toolbox] ❌ No toolboxConfig found, skipping');
      setIsToolboxReady(true);
      return;
    }

    try {
      // Get the BlockPy instance
      const blockPy = editorRef.current;
      console.log('[🧰 Toolbox] blockPy instance:', !!blockPy);

      // Navigate to blockEditor
      let blockEditor = null;
      const pythonEditor = blockPy?.components?.pythonEditor;
      console.log('[🧰 Toolbox] components.pythonEditor found:', !!pythonEditor);

      if (pythonEditor?.bm?.blockEditor) {
        blockEditor = pythonEditor.bm.blockEditor;
        console.log('[🧰 Toolbox] ✅ Found blockEditor via pythonEditor.bm');
      }

      if (!blockEditor) {
        console.error('[🧰 Toolbox] ❌ Could not find blockEditor');
        return;
      }

      const { mode, categories } = mission.toolboxConfig;
      console.log('[🧰 Toolbox] Mode:', mode);
      console.log('[🧰 Toolbox] Categories to restrict:', categories?.map(c => c.name));

      // Get TOOLBOXES object
      let TOOLBOXES = blockEditor.TOOLBOXES;
      console.log('[🧰 Toolbox] TOOLBOXES found:', !!TOOLBOXES);

      if (!TOOLBOXES) {
        console.error('[🧰 Toolbox] ❌ TOOLBOXES not found');
        return;
      }

      // Handle modes
      if (mode === 'full') {
        console.log('[🧰 Toolbox] Mode FULL: Showing all blocks');
        if (typeof blockEditor.remakeToolbox === 'function') {
          blockEditor.remakeToolbox('normal');
          console.log('[🧰 Toolbox] ✅ Called remakeToolbox("normal")');
        }
        setIsToolboxReady(true);
        return;
      }

      if (mode === 'hide') {
        console.log('[🧰 Toolbox] Mode HIDE: Hiding all blocks');
        if (typeof blockEditor.remakeToolbox === 'function') {
          blockEditor.remakeToolbox('empty');
          console.log('[🧰 Toolbox] ✅ Called remakeToolbox("empty")');
        }
        setIsToolboxReady(true);
        return;
      }

      // RESTRICT mode
      if (mode === 'restrict' && Array.isArray(categories)) {
        console.log('[🧰 Toolbox] Mode RESTRICT: Filtering categories');

        const sourceToolbox = TOOLBOXES['normal'];
        console.log('[🧰 Toolbox] Source toolbox is array:', Array.isArray(sourceToolbox));

        if (!Array.isArray(sourceToolbox)) {
          console.error('[🧰 Toolbox] ❌ normal toolbox is not an array');
          return;
        }

        // ========================================
        // 📋 COMPLETE TOOLBOX STRUCTURE LOG
        // ========================================
        console.log('\n' + '='.repeat(80));
        console.log('📋 COMPLETE TOOLBOX STRUCTURE - ALL CATEGORIES AND BLOCKS');
        console.log('='.repeat(80));

        sourceToolbox.forEach((category: any, index: number) => {
          if (typeof category === 'string') {
            console.log(`\n[${index}] SEPARATOR: "${category}"`);
            return;
          }

          console.log(`\n[${index}] CATEGORY: "${category.name}"`);
          console.log(`   Color: ${category.colour || 'N/A'}`);
          console.log(`   Total Blocks: ${category.blocks ? category.blocks.length : 0}`);

          if (category.blocks && Array.isArray(category.blocks)) {
            console.log(`   Blocks:`);
            category.blocks.forEach((block: string, blockIndex: number) => {
              console.log(`      ${blockIndex + 1}. "${block}"`);
            });
          }
        });

        console.log('\n' + '='.repeat(80) + '\n');
        // ========================================

        // Build filtered toolbox (keep BlockMirror format, not Blockly JSON)
        const filteredToolbox: any[] = [];


        for (const categoryFilter of categories) {
          const displayName = categoryFilter.name as any;
          console.log(`[🧰 Toolbox] Looking for category: "${displayName}"`);

          // Find matching category in source (skip separators)
          const sourceCategory = sourceToolbox.find((cat: any) => {
            if (typeof cat === 'string') return false;
            return cat.name === displayName;
          });

          if (!sourceCategory) {
            console.warn(`[🧰 Toolbox] ⚠️ Category "${displayName}" not found in source`);
            continue;
          }

          console.log(`[🧰 Toolbox] ✅ Found category:`, sourceCategory.name);

          // Clone the category
          let filteredCategory = { ...sourceCategory };

          // Log available blocks for this category
          console.log(`[🧰 Toolbox] Available blocks in "${displayName}":`, sourceCategory.blocks);

          // Filter blocks if specified
          if (categoryFilter.allowedBlocks && categoryFilter.allowedBlocks.length > 0 && sourceCategory.blocks) {
            const before = sourceCategory.blocks.length;

            // Normalize allowed blocks (unescape JSON escaping)
            const normalizedAllowed = categoryFilter.allowedBlocks.map((block: string) => {
              let normalized = block;

              // Handle multiple levels of escaping
              // First pass: replace \\\" with "
              normalized = normalized.replace(/\\\\"/g, '"');
              // Second pass: replace \" with "
              normalized = normalized.replace(/\\"/g, '"');
              // Third pass: handle \\ with single \
              normalized = normalized.replace(/\\\\/g, '\\');

              return normalized;
            });

            console.log(`[🧰 Toolbox] Allowed blocks from config (raw):`, categoryFilter.allowedBlocks);
            console.log(`[🧰 Toolbox] Allowed blocks normalized:`, normalizedAllowed);

            filteredCategory.blocks = sourceCategory.blocks.filter((block: string) => {
              const isAllowed = normalizedAllowed.includes(block);
              if (!isAllowed) {
                console.log(`[🧰 Toolbox] ❌ Block NOT matched: "${block}"`);
              } else {
                console.log(`[🧰 Toolbox] ✅ Block matched: "${block}"`);
              }
              return isAllowed;
            });
            console.log(`[🧰 Toolbox] Blocks: ${before} → ${filteredCategory.blocks.length}`);
          }

          filteredToolbox.push(filteredCategory);
        }

        console.log('[🧰 Toolbox] Filtered toolbox categories:', filteredToolbox.length);
        console.log('[🧰 Toolbox] Filtered toolbox:', filteredToolbox);

        // Update TOOLBOXES object
        TOOLBOXES['__mission__'] = filteredToolbox;
        console.log('[🧰 Toolbox] ✅ Assigned to TOOLBOXES["__mission__"]');

        // Change BlockMirror configuration to use our filtered toolbox
        const bm = pythonEditor?.bm;
        if (bm && bm.configuration) {
          console.log('[🧰 Toolbox] Current toolbox config:', bm.configuration.toolbox);
          bm.configuration.toolbox = '__mission__';
          console.log('[🧰 Toolbox] ✅ Changed configuration.toolbox to "__mission__"');
        }

        // Force BlockMirror to rebuild the toolbox
        if (typeof blockEditor.remakeToolbox === 'function') {
          console.log('[🧰 Toolbox] Calling blockEditor.remakeToolbox()...');
          try {
            blockEditor.remakeToolbox();
            console.log('[🧰 Toolbox] ✅✅✅ TOOLBOX FILTERED SUCCESSFULLY! ✅✅✅');
            setIsToolboxReady(true);
          } catch (remakeErr) {
            console.error('[🧰 Toolbox] remakeToolbox failed:', remakeErr);
            setIsToolboxReady(true); // Set ready even on error to prevent infinite loading
          }
        } else {
          console.error('[🧰 Toolbox] ❌ remakeToolbox not available');
          setIsToolboxReady(true); // Set ready even if method not available
        }
      }
    } catch (err) {
      console.error('[🧰 Toolbox] ❌ EXCEPTION:', err);
      console.error('[🧰 Toolbox] Stack:', (err as any).stack);
    }

    console.log('[🧰 Toolbox] === FILTER PROCESS COMPLETE ===');
  };

  // Helper function to get current code from editor
  const getCurrentCodeFromEditor = useCallback(() => {
    try {
      const pythonEditor = editorRef.current?.components?.pythonEditor;
      if (!pythonEditor?.bm) return '';

      // Try BlockMirror's getCode() method first
      if (typeof pythonEditor.bm.getCode === 'function') {
        return pythonEditor.bm.getCode();
      }

      // Fallback to textEditor methods
      const textEditor = pythonEditor.bm.textEditor;
      if (textEditor) {
        if (typeof textEditor.getValue === 'function') {
          return textEditor.getValue();
        }
        if (textEditor.doc && typeof textEditor.doc.getValue === 'function') {
          return textEditor.doc.getValue();
        }
      }

      return '';
    } catch (e) {
      console.error('[BlocklyWorkspace] Error getting current code:', e);
      return '';
    }
  }, []);

  // 🤖 Chatbot integration
  const chatbot = useChatbot(getCurrentCodeFromEditor);

  // 🧠 Behavior Tracking for Proactive Hints
  const behaviorTracker = useBehaviorTracker({
    userId: user?.id || 'anonymous',  // Fixed: use user.id instead of user.username
    missionId: mission?._id || 'free-play',
    missionData: mission, // Pass full mission object for context-aware hints
    userProfile: profile, // Pass full user profile for personalization
    getCurrentCode: getCurrentCodeFromEditor, // NEW: Callback to get live code
    weakConcepts: profile?.weakSkills || [],
    strongConcepts: profile?.strongSkills || [],
    masterySnapshot: profile?.skillScores,
    enabled: true, // Always enabled for testing - change back to !!user && !!mission in production
  });

  // Reset editor to starter code when mission changes
  useEffect(() => {
    if (editorRef.current?.components?.editor?.python?.bm?.textEditor && mission?.starterCode !== undefined) {
      editorRef.current.components.editor.python.bm.textEditor.setValue(mission.starterCode || '');
    }
    // Reset tracking variables when mission changes
    setAttempts(1);
    startTimeRef.current = Date.now();
    setShowFeedback(false);
    // Reset behavioral tracking
    setBlockActivity([]);
    setIdleTime(0);
    setLastEditTime(Date.now());
    setLiveHint(null);
    setErrorCount(0);
    setLastError(null);
  }, [mission?.starterCode, mission?._id]);

  /**
   * Handle code execution when Run button is clicked
   * Now executes code directly and shows real console output
   */
  const handleRunCode = async () => {
    if (!editorRef.current) {
      return;
    }

    // Force BlockPy to sync BEFORE extraction
    try {
      const pythonEditor = editorRef.current.components?.pythonEditor;

      if (pythonEditor?.bm?.textEditor) {
        const textEditor = pythonEditor.bm.textEditor;
        let currentText = '';

        // Try BlockMirror's getCode() method (BlockMirror-specific)
        if (pythonEditor.bm && typeof pythonEditor.bm.getCode === 'function') {
          try {
            currentText = pythonEditor.bm.getCode();
          } catch (e) {
            // Silent fail, try next method
          }
        }

        // Try textEditor.getCode() if it exists
        if (!currentText && typeof textEditor.getCode === 'function') {
          try {
            currentText = textEditor.getCode();
          } catch (e) {
            // Silent fail, try next method
          }
        }

        // Check if it's a CodeMirror instance with doc
        if (!currentText && textEditor.doc && typeof textEditor.doc.getValue === 'function') {
          try {
            currentText = textEditor.doc.getValue();
          } catch (e) {
            // Silent fail, try next method
          }
        }

        // Try getDoc() then getValue()
        if (!currentText && typeof textEditor.getDoc === 'function') {
          try {
            const doc = textEditor.getDoc();
            if (doc && typeof doc.getValue === 'function') {
              currentText = doc.getValue();
            }
          } catch (e) {
            // Silent fail, try next method
          }
        }

        // Try direct getValue() 
        if (!currentText && typeof textEditor.getValue === 'function') {
          try {
            currentText = textEditor.getValue();
          } catch (e) {
            // Silent fail, try next method
          }
        }

        // Try accessing the value property directly
        if (!currentText && textEditor.value) {
          currentText = textEditor.value;
        }

        // Try CodeMirror instance stored in textEditor
        if (!currentText && textEditor.cm && typeof textEditor.cm.getValue === 'function') {
          try {
            currentText = textEditor.cm.getValue();
          } catch (e) {
            // Silent fail
          }
        }

        // Now force update the file with the extracted text
        if (currentText && pythonEditor.file) {
          if (typeof pythonEditor.file.set === 'function') {
            pythonEditor.file.set(currentText);
          } else {
            pythonEditor.file.contents = currentText;
          }
        }

        // Also try to force model update
        if (pythonEditor.bm && typeof pythonEditor.bm.updateModel === 'function') {
          pythonEditor.bm.updateModel();
        }
      }

      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      // Silent fail - will try extraction anyway
    }

    // Get the current code from the editor - try multiple methods
    let code = '';

    // Method 1: Try to get directly from textEditor using multiple approaches
    try {
      const pythonEditor = editorRef.current.components?.pythonEditor;
      const textEditor = pythonEditor?.bm?.textEditor;
      const bm = pythonEditor?.bm;

      if (bm) {
        // Try BlockMirror's getCode() first (BlockMirror-specific)
        if (typeof bm.getCode === 'function') {
          code = bm.getCode();
        }
      }

      if (!code && textEditor) {
        // Try textEditor.getCode()
        if (typeof textEditor.getCode === 'function') {
          code = textEditor.getCode();
        }
        // Try doc.getValue() (most common in CodeMirror)
        else if (textEditor.doc && typeof textEditor.doc.getValue === 'function') {
          code = textEditor.doc.getValue();
        }
        // Try getDoc().getValue()
        else if (typeof textEditor.getDoc === 'function') {
          const doc = textEditor.getDoc();
          if (doc && typeof doc.getValue === 'function') {
            code = doc.getValue();
          }
        }
        // Try textEditor.cm (CodeMirror instance)
        else if (textEditor.cm && typeof textEditor.cm.getValue === 'function') {
          code = textEditor.cm.getValue();
        }
        // Try direct value property
        else if (textEditor.value) {
          code = textEditor.value;
        }
      }
    } catch (e) {
      // Silent fail, try next method
    }

    // Method 2: Try the file model as fallback
    if (!code) {
      try {
        const fileContents = editorRef.current.components?.pythonEditor?.file?.contents;
        if (fileContents && fileContents.trim()) {
          code = fileContents;
        }
      } catch (e) {
        // Silent fail, try next method
      }
    }

    // Method 3: Try the model's program main code
    if (!code) {
      try {
        const mainCode = editorRef.current.model?.programs?.['__main__']?.code;
        if (mainCode && mainCode.trim()) {
          code = mainCode;
        }
      } catch (e) {
        // Silent fail, try next method
      }
    }

    // Method 4: Try accessing through main property
    if (!code) {
      try {
        const mainCode = editorRef.current.main?.model?.programs?.['__main__']?.code;
        if (mainCode && mainCode.trim()) {
          code = mainCode;
        }
      } catch (e) {
        // Silent fail
      }
    }


    // Check if we got actual code (not just default/empty)
    const defaultPatterns = [
      '# Write your code here',
      '# Use a for loop here',
      '# Your code goes here',
      '# TODO',
    ];

    const codeToCheck = code.trim();
    const isDefaultCode = defaultPatterns.some(pattern => codeToCheck === pattern || codeToCheck === pattern + '\n');

    if (!code || !code.trim()) {
      alert('Please write some code before running!');
      return;
    }

    if (isDefaultCode) {
      alert('It looks like you haven\'t modified the code yet. Please write your solution first!');
      return;
    }

    setIsSubmitting(true);

    // Store the code and open the console modal
    setConsoleCode(code);
    setShowConsoleModal(true);

    try {
      // Track run in behavior tracker
      if (user && mission) {
        behaviorTracker.trackEdit(code);
      }

      // Increment attempts
      setAttempts(prev => prev + 1);

    } catch (error) {
      console.error('Error opening console:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 🧠 Track code editing activity
   * Called whenever the user makes changes to the code
   */
  const trackCodeEdit = (changeType: 'create' | 'delete' | 'modify', details?: any) => {
    const now = Date.now();

    // 🔍 LOG: Track edit
    console.log(`✏️ [Edit Tracked] Type: ${changeType}`, details || '');

    setBlockActivity(prev => [...prev, {
      type: changeType,
      timestamp: now,
      details
    }]);
    setLastEditTime(now);
    setIdleTime(0); // Reset idle timer

    // Track edit in behavior tracker
    const currentCode = editorRef.current?.components?.editor?.python?.bm?.textEditor?.getValue() || '';
    behaviorTracker.trackEdit(currentCode);

    // 🔍 LOG: Current activity count
    setBlockActivity(prev => {
      console.log(`📊 [Activity Count] Total edits: ${prev.length + 1}`);
      return prev;
    });
  };

  /**
   * 🧠 Analyze user behavior and send to AI for live hints
   */
  const analyzeBehavior = async () => {
    if (!user || !mission || !user.id) {
      console.log('⚠️ [AI Behavior] Skipping analysis - no user, user.id, or mission');
      return;
    }

    try {
      // Get current code
      let currentCode = '';
      try {
        const pythonEditor = editorRef.current?.components?.pythonEditor;
        if (pythonEditor?.bm && typeof pythonEditor.bm.getCode === 'function') {
          currentCode = pythonEditor.bm.getCode();
        }
      } catch (e) {
        // Can't get code, skip analysis
        console.log('⚠️ [AI Behavior] Could not extract code');
        return;
      }

      // Prepare behavior summary
      const behaviorSummary = {
        userId: user.id,  // Fixed: use user.id instead of user.username
        missionId: mission._id,
        step: 0, // TODO: Track current step
        activity: {
          blocksCreated: blockActivity.filter(a => a.type === 'create').length,
          blocksDeleted: blockActivity.filter(a => a.type === 'delete').length,
          blocksModified: blockActivity.filter(a => a.type === 'modify').length,
          idleTime: Math.floor((Date.now() - lastEditTime) / 1000),
          totalEdits: blockActivity.length,
          errorCount: errorCount,
          lastError: lastError,
          codeSnapshot: currentCode,
          concepts: mission.concepts || [],
          difficulty: mission.difficulty
        }
      };

      // 🔍 LOG: Behavior analysis request
      console.log('🧠 [AI Behavior] Sending behavior analysis...', {
        userId: behaviorSummary.userId,
        missionId: behaviorSummary.missionId,
        activity: {
          created: behaviorSummary.activity.blocksCreated,
          deleted: behaviorSummary.activity.blocksDeleted,
          modified: behaviorSummary.activity.blocksModified,
          totalEdits: behaviorSummary.activity.totalEdits,
          idleTime: `${behaviorSummary.activity.idleTime}s`,
          errors: behaviorSummary.activity.errorCount
        },
        codeLength: currentCode.length,
        concepts: behaviorSummary.activity.concepts
      });

      // Send to AI service for analysis
      const response = await fetch('http://localhost:8000/api/v1/behavior/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-key-12345'
        },
        body: JSON.stringify(behaviorSummary)
      });

      // 🔍 LOG: Response status
      console.log(`🧠 [AI Behavior] Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();

        // 🔍 LOG: AI response
        console.log('🧠 [AI Behavior] AI Response:', result);

        if (result.hint) {
          console.log(`💡 [AI Hint] Displaying hint: "${result.hint}"`);
          console.log(`   Type: ${result.type}, Priority: ${result.priority}`);

          setLiveHint(result.hint);
          // Auto-dismiss hint after 15 seconds
          setTimeout(() => setLiveHint(null), 15000);
        } else {
          console.log('🧠 [AI Behavior] No hint generated (normal behavior)');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [AI Behavior] Error response:', errorText);
      }
    } catch (error) {
      // Silent fail - behavioral analysis is optional
      console.error('❌ [AI Behavior] Request failed:', error);
    }

    // Reset activity tracking
    console.log('🔄 [AI Behavior] Resetting activity tracking');
    setBlockActivity([]);
  };

  // 🧠 Track idle time every second
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      const timeSinceLastEdit = Date.now() - lastEditTime;
      const idleSeconds = Math.floor(timeSinceLastEdit / 1000);
      setIdleTime(idleSeconds);

      // Log idle time every 10 seconds
      if (idleSeconds % 10 === 0 && idleSeconds > 0) {
        console.log(`⏱️ [Idle Timer] User idle for ${idleSeconds}s`);
      }

      // Trigger hint if idle for 30 seconds (only trigger once at 30s, not every second after)
      if (idleSeconds === 30) {
        console.log('🚨 [Idle Timer] 30s idle threshold reached! Triggering behavior analysis...');
        analyzeBehavior();
      }
    }, 1000);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [lastEditTime]);

  // 🧠 Send behavior summary every 10 seconds if there's activity
  useEffect(() => {
    behaviorSyncRef.current = setInterval(() => {
      if (blockActivity.length > 0) {
        console.log(`🔄 [Behavior Sync] 10s interval - Activity detected (${blockActivity.length} edits), analyzing...`);
        analyzeBehavior();
      }
    }, 10000);

    return () => {
      if (behaviorSyncRef.current) clearInterval(behaviorSyncRef.current);
    };
  }, [blockActivity.length, user, mission]);

  // 🧠 Detect repeated errors (frustration signal)
  useEffect(() => {
    if (errorCount >= 3 && lastError) {
      console.log(`😤 [Frustration Detected] ${errorCount} errors detected! Showing encouragement hint`);
      // Student is frustrated - trigger encouraging hint
      setLiveHint("🌟 I see you're working hard on this! Take a deep breath. Want me to show you a similar example?");
      setTimeout(() => setLiveHint(null), 20000);
    }
  }, [errorCount, lastError]);

  // Load kid-friendly theme CSS
  useEffect(() => {
    // Load main theme
    const mainTheme = document.createElement('link');
    mainTheme.rel = 'stylesheet';
    mainTheme.href = '/css/kid-friendly-theme.css';
    document.head.appendChild(mainTheme);

    // Load Blockly-specific theme
    const blocklyTheme = document.createElement('link');
    blocklyTheme.rel = 'stylesheet';
    blocklyTheme.href = '/css/blockly-kid-theme.css';
    document.head.appendChild(blocklyTheme);

    // Load helper UI (tooltips, encouragements, etc.)
    const helperUI = document.createElement('link');
    helperUI.rel = 'stylesheet';
    helperUI.href = '/css/kid-helper-ui.css';
    document.head.appendChild(helperUI);

    // Sidebar styles are now imported at the top of the file

    // Load Font Awesome for icons
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    fontAwesome.crossOrigin = 'anonymous';
    document.head.appendChild(fontAwesome);

    return () => {
      document.head.removeChild(mainTheme);
      document.head.removeChild(blocklyTheme);
      document.head.removeChild(helperUI);
      document.head.removeChild(fontAwesome);
    };
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;

    const initBlockPy = () => {
      if (!(window as any).blockpy) {
        setTimeout(initBlockPy, 100);
        return;
      }

      try {
        const BlockPy = (window as any).blockpy.BlockPy;
        editorRef.current = new BlockPy({
          'attachment.point': '#blockpy-editor',
          // Assignment settings to control UI (must be strings!)
          'assignment.settings.start_view': 'split',
          'assignment.settings.can_blocks': 'true',
          'assignment.settings.hide_import_datasets_button': 'true',
          'assignment.settings.hide_files': 'true',
          // Kid-friendly configuration  
          'block_style': 'modern',
          'text.width': 50,
          'blocks.width': 50,
          // Mission-specific info
          'assignment.title': mission.title,
          'assignment.description': mission.description,
          'assignment.starting_code': mission.starterCode || '',
          'assignment.expected_output': mission.expectedOutput || '',
          'assignment.hints': mission.hints?.join('\n') || '',
          'assignment.objectives': mission.objectives?.join(', ') || '',
          'assignment.xp_reward': mission.xpReward?.toString() || '0',
          'assignment.difficulty': mission.difficulty,
        });
        // Set starter code in Python editor after BlockPy is initialized
        // Robustly wait for the editor and set starter code
        let attempts = 0;
        const maxAttempts = 20;
        const trySetStarterCode = () => {
          const components = editorRef.current?.components;
          if (components && components.pythonEditor && components.pythonEditor.file) {
            const fileObj = components.pythonEditor.file;
            const starter = mission.starterCode && mission.starterCode.trim().length > 0
              ? mission.starterCode
              : '# Write your code here';
            const pythonEditor = components.pythonEditor;
            if (pythonEditor.bm) {
              // Set starter code in the editor UI
              if (!fileObj.contents || fileObj.contents.trim() === '') {
                fileObj.contents = starter;
                pythonEditor.bm.setCode(starter, false);
              }
              return;
            }
          }
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(trySetStarterCode, 200);
          }
        };
        trySetStarterCode();

        // Hook into BlockPy's run button to trigger our submission handler
        setTimeout(() => {
          const runButton = document.querySelector('.blockpy-run');
          if (runButton) {
            runButton.addEventListener('click', (e) => {
              // Prevent BlockPy from running (we'll handle it ourselves)
              e.preventDefault();
              e.stopPropagation();

              // But first, force BlockPy to sync the editor content to its model
              try {
                const pythonEditor = editorRef.current?.components?.pythonEditor;
                if (pythonEditor?.updateModel) {
                  pythonEditor.updateModel();
                }
                if (pythonEditor?.bm?.updateModel) {
                  pythonEditor.bm.updateModel();
                }
              } catch (err) {
                // Silent fail
              }

              // Now run our handler with a tiny delay to ensure sync is complete
              setTimeout(() => {
                handleRunCode();
              }, 100); // 100ms to ensure model sync
            });
          }
        }, 1500);

        // Set split mode in the model after initialization
        setTimeout(() => {
          if (editorRef.current?.model) {
            // Set the display mode to split
            if (editorRef.current.model.display && editorRef.current.model.display.pythonMode) {
              editorRef.current.model.display.pythonMode('split');
            }
          }
        }, 500);

        // Function to calculate and set dynamic height
        const updateEditorHeight = () => {
          // Check if all components are initialized
          if (!editorRef.current ||
            !editorRef.current.components ||
            !editorRef.current.components.editor ||
            !editorRef.current.components.editor.python ||
            !editorRef.current.components.editor.python.bm) {
            return; // Not ready yet, skip
          }

          // Get the container element
          const container = document.getElementById('blockpy-editor');
          if (!container) return;

          // Get the toolbar height (the buttons row)
          const toolbar = document.querySelector('.blockpy-python-toolbar');
          const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 50;

          // Calculate available height based on the container's parent
          // We want to fill the parent container, minus the toolbar
          const parentHeight = container.parentElement?.getBoundingClientRect().height || window.innerHeight;
          const availableHeight = parentHeight - toolbarHeight;

          // Update BlockMirror configuration
          editorRef.current.components.editor.python.bm.configuration.height = availableHeight;

          // Trigger resize to apply new height
          const textEditor = editorRef.current.components.editor.python.bm.textEditor;
          const blockEditor = editorRef.current.components.editor.python.bm.blockEditor;

          if (textEditor) {
            textEditor.resizeResponsively();
          }
          if (blockEditor) {
            blockEditor.resizeResponsively();
          }
        };

        // Set initial height after BlockPy is fully loaded
        let retryCount = 0;
        const maxRetries = 10;
        const tryUpdateHeight = () => {
          const toolbar = document.querySelector('.blockpy-python-toolbar');
          if (!toolbar && retryCount < maxRetries) {
            retryCount++;
            setTimeout(tryUpdateHeight, 500);
            return;
          }

          updateEditorHeight();

          // Use ResizeObserver for more robust resizing (handles zoom and container changes)
          const resizeObserver = new ResizeObserver(() => {
            updateEditorHeight();
          });

          const container = document.getElementById('blockpy-editor');
          if (container) {
            resizeObserver.observe(container);
            // Also observe parent to catch layout changes
            if (container.parentElement) {
              resizeObserver.observe(container.parentElement);
            }
          }

          // Also keep window resize as fallback
          window.addEventListener('resize', updateEditorHeight);

          // Store observer to disconnect later if needed (though this is inside initBlockPy closure)
          // Ideally we would return a cleanup function but initBlockPy is called inside useEffect
        };

        setTimeout(tryUpdateHeight, 1000);

        // Inject CSS to hide header and second row (console/feedback)
        setTimeout(() => {
          const style = document.createElement('style');
          style.innerHTML = `
            /* Hide the entire second row with console and feedback */
            div[data-bind*="ui.secondRow.width"] {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Hide header row with assignment description and quick menu */
            div.row[data-bind*="ui.smallLayout"] {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Hide header panels */
            .blockpy-header,
            .blockpy-quick-menu {
              display: none !important;
              flex: 1 !important;
              height: 100% !important;
              min-height: 100% !important;
              overflow: hidden !important;
            }

            /* Force the main BlockPy container to fill height */
            .blockpy-content {
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
            }

            /* Ensure the editor row takes full remaining height */
            div[data-bind*="ui.editorRow.width"] {
              flex: 1 !important;
              height: 100% !important;
              display: flex !important;
            }
            
            /* Hide all button groups except the first one (Run button) */
            .blockpy-python-toolbar .btn-group:not(:first-of-type) {
              display: none !important;
            }
            
            /* Hide mode toggle buttons (Blocks, Split, Text) */
            .blockpy-mode-display,
            .btn-group-vertical,
            button[data-mode],
            .blockpy-mode-set-blocks {
              display: none !important;
            }
            
            /* Hide the entire BlockPy toolbar (blue header with Run button) */
            .blockpy-python-toolbar,
            .blockpy-toolbar {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
              visibility: hidden !important;
            }

            /* Hide all BlockPy buttons including Run */
            .blockpy-run,
            .btn-success,
            button.btn-success,
            .blockpy-python-toolbar .btn-group {
              display: none !important;
              visibility: hidden !important;
            }

            /* Hide BlockPy status bar/footer at the bottom */
            .blockpy-status,
            .blockpy-footer,
            .blockpy-status-bar,
            div[data-bind*="status"],
            .blockpy-presentation-status {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
              visibility: hidden !important;
            }
          `;
          document.head.appendChild(style);
        }, 1000);

        // Add Blockly event listeners for live behavioral tracking
        setTimeout(() => {
          try {
            const blockEditor = editorRef.current?.components?.editor?.python?.bm?.blockEditor;
            const textEditor = editorRef.current?.components?.editor?.python?.bm?.textEditor;

            // Track Blockly block changes
            if (blockEditor?.workspace) {
              blockEditor.workspace.addChangeListener((event: any) => {
                // Only track user-initiated changes (not programmatic changes)
                if (event.isUiEvent) return;

                // Track different types of block events
                if (event.type === 'create') {
                  trackCodeEdit('create', { eventType: event.type });
                } else if (event.type === 'delete') {
                  trackCodeEdit('delete', { eventType: event.type });
                } else if (event.type === 'change' || event.type === 'move') {
                  trackCodeEdit('modify', { eventType: event.type });
                }
              });
            }

            // Track text editor changes (CodeMirror)
            if (textEditor?.on) {
              textEditor.on('change', (cm: any, change: any) => {
                // Only track user-initiated changes
                if (change.origin === 'setValue') return;

                trackCodeEdit('modify', { source: 'text-editor' });
              });
            }
          } catch (err) {
            console.warn('Could not attach event listeners for behavioral tracking:', err);
          }
        }, 2000); // Wait 2s for editor to be fully ready

        // 🧰 Apply mission-specific toolbox filtering (NEW)
        // Try at 2.5s
        setTimeout(() => {
          try {
            console.log('[🧰 Toolbox] Attempt 1: Applying filtering after 2.5s...');
            applyToolboxFiltering(mission);
          } catch (err) {
            console.error('[🧰 Toolbox] Attempt 1 failed:', err);
          }
        }, 2500);

        // Try again at 3.5s (in case blockEditor wasn't ready yet)
        setTimeout(() => {
          try {
            console.log('[🧰 Toolbox] Attempt 2: Retry filtering after 3.5s...');
            applyToolboxFiltering(mission);
          } catch (err) {
            console.error('[🧰 Toolbox] Attempt 2 failed:', err);
          }
        }, 3500);

        // Try one more time at 5s
        setTimeout(() => {
          try {
            console.log('[🧰 Toolbox] Attempt 3: Final retry filtering after 5s...');
            applyToolboxFiltering(mission);
          } catch (err) {
            console.error('[🧰 Toolbox] Attempt 3 failed:', err);
          }
        }, 5000);

        initializedRef.current = true;
        setIsLoading(false);
      } catch (err) {
        // BlockPy initialization error
        setIsLoading(false);
      }
    };

    initBlockPy();
  }, [mission]);

  // Example: Use chatbot API (can be integrated with UI later)
  // useEffect(() => {
  //   sendChatMessage({
  //     userId: user?.username,
  //     missionId: mission._id,
  //     question: 'Hello!',
  //   }).then(res => console.log('Chatbot response:', res));
  // }, [mission, user]);

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      {/* 🚀 Custom Header */}
      <header className="flex-shrink-0 h-20 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b-2 border-indigo-200 shadow-md z-50 px-6 flex items-center justify-between">
        {/* Left: Navigation */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <button
            onClick={() => router.push('/dashboard')}
            className="group relative p-3 rounded-xl bg-white hover:bg-gradient-to-br hover:from-indigo-500 hover:to-purple-600 text-gray-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-110 active:scale-95"
            title="Back to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform duration-300">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Center: Run Button */}
        <div className="flex-1 flex items-center justify-center px-4">
          <button
            onClick={handleRunCode}
            disabled={isSubmitting}
            className={`
              group relative flex items-center gap-3 px-8 py-3 rounded-full font-bold text-white shadow-xl transition-all duration-300 overflow-hidden
              ${isSubmitting
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed scale-95 shadow-gray-400/30'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/50 active:scale-95'
              }
            `}
          >
            {/* Animated background gradient */}
            {!isSubmitting && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
            )}

            <div className="relative z-10 flex items-center gap-3">
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-base tracking-wide">Running...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform duration-300">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-base tracking-wide font-extrabold">Run Code</span>
                  <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Right: User Stats */}
        <div className="flex items-center gap-3 min-w-[280px] justify-end">
          {/* XP */}
          <div className="group hidden md:flex items-center gap-2 bg-gradient-to-br from-amber-100 to-yellow-100 px-4 py-2 rounded-full border-2 border-amber-200 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer">
            <span className="text-xl group-hover:scale-110 transition-transform duration-300">⚡</span>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">XP</span>
              <span className="font-black text-amber-700 text-sm">{gamification?.xp || 0}</span>
            </div>
          </div>

          {/* Streak */}
          <div className="group hidden md:flex items-center gap-2 bg-gradient-to-br from-orange-100 to-red-100 px-4 py-2 rounded-full border-2 border-orange-200 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer">
            <span className="text-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">🔥</span>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-orange-600 font-bold uppercase tracking-wider">Streak</span>
              <span className="font-black text-orange-700 text-sm">{gamification?.streak || 0}</span>
            </div>
          </div>

          {/* Level Badge */}
          <div className="group flex items-center gap-2 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 px-4 py-2 rounded-full border-2 border-indigo-200 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
            <span className="text-xl group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300">👑</span>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">Level</span>
              <span className="text-sm font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{gamification?.level || 1}</span>
            </div>
          </div>

          {/* Avatar */}
          <div className="group relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 cursor-pointer animate-pulse">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                {user?.avatar || '👤'}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Left side: Blockly Editor */}
        <div className="flex-1 flex flex-col relative h-full">
          <div id="blockpy-editor" className="flex-1 w-full h-full" style={{ margin: 0, padding: 0 }} />

          {/* Loading state */}
          {(isLoading || !isToolboxReady) && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center" style={{ zIndex: 9999 }}>
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-indigo-900 font-bold text-lg animate-pulse">
                {isLoading ? 'Loading workspace...' : 'Preparing blocks...'}
              </p>
            </div>
          )}
        </div>

        {/* 🧠 Live AI Hint - Floating companion */}
        {liveHint && (
          <div className="fixed bottom-24 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-2xl p-5 max-w-sm z-50 animate-bounce-in">
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">🤖</div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">{liveHint}</p>
              </div>
              <button
                onClick={() => setLiveHint(null)}
                className="text-white hover:text-gray-200 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {/* Idle time indicator */}
            {idleTime > 20 && (
              <div className="mt-3 pt-3 border-t border-white/30 text-xs opacity-75">
                💭 Thinking time: {idleTime}s
              </div>
            )}
          </div>
        )}

        {/* 🧠 Activity indicator (shows when AI is observing) */}
        {blockActivity.length > 0 && (

          <div className="fixed bottom-6 left-6 bg-white/90 backdrop-blur border border-indigo-100 rounded-full px-4 py-2 shadow-lg z-40 flex items-center gap-2 animate-fade-in">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-indigo-600 font-bold">
              AI Companion Active • {blockActivity.length} updates
            </span>
          </div>
        )}

        {/* 💡 Proactive Hint Dialog */}
        {/* 💡 Proactive Hint Dialog */}
        {/* 💡 Proactive Hint Dialog */}
        {behaviorTracker.proactiveHint && !chatbot.isChatOpen && (
          <div className="fixed bottom-28 right-6 max-w-sm bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-indigo-100 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xl">
                  💡
                </div>
                <p className="text-gray-700 text-sm leading-relaxed font-medium pt-1">
                  {behaviorTracker.proactiveHint.message}
                </p>
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <button
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                  onClick={behaviorTracker.dismissHint}
                >
                  No thanks
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-indigo-500/30"
                  onClick={() => {
                    console.log('[BlocklyWorkspace] Yes please clicked!');
                    behaviorTracker.acceptHint();
                    chatbot.setIsChatOpen(true);

                    // Trigger proactive help with full context
                    if (behaviorTracker.chatbotContext) {
                      console.log('[BlocklyWorkspace] Triggering proactive help with context:', behaviorTracker.chatbotContext);
                      // Small delay to ensure chatbot is open and ready
                      setTimeout(() => {
                        chatbot.handleProactiveHelp(behaviorTracker.chatbotContext);
                      }, 100);
                    } else {
                      console.warn('[BlocklyWorkspace] No chatbot context available!');
                    }
                  }}
                >
                  Yes please! ✨
                </button>
              </div>
            </div>
            {/* Arrow pointing down */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-b border-r border-indigo-100 transform rotate-45"></div>
          </div>
        )}

        {/* 🤖 Floating Chatbot Button */}
        <button
          className={`fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40 hover:scale-110 hover:rotate-6 transition-all duration-300 z-50 flex items-center justify-center group ${behaviorTracker.proactiveHint ? 'animate-pulse' : ''
            }`}
          onClick={() => chatbot.setIsChatOpen(!chatbot.isChatOpen)}
          title="Ask me anything!"
        >
          <span className="text-3xl group-hover:animate-wiggle">🤖</span>
          {behaviorTracker.proactiveHint && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </button>

        {/* 🤖 Chatbot Modal/Popup */}
        <ChatInterface chatbot={chatbot} />

        {/* CSS for animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes bounce-in {
            0% {
              transform: translateY(100px);
              opacity: 0;
            }
            60% {
              transform: translateY(-10px);
              opacity: 1;
            }
            80% {
              transform: translateY(5px);
            }
            100% {
              transform: translateY(0);
            }
          }

          .animate-bounce-in {
            animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
        `}} />

        {/* Fun Console Modal */}
        <FunConsoleModal
          visible={showConsoleModal}
          pythonCode={consoleCode}
          expectedOutput={mission?.expectedOutput}
          missionId={mission?._id}
          userId={user?.username}
          onClose={() => setShowConsoleModal(false)}
          onMissionComplete={() => {
            // Mission completed! Return to dashboard
            setTimeout(() => {
              router.push('/dashboard');
            }, 500);
          }}
        />
      </div>
    </div >
  );
}
