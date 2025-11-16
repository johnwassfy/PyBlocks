'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitCode, type SubmissionResponse } from '../services/submissionsApi';
import { useChatbot } from './KidSidebar';
import { useBehaviorTracker } from '../hooks/useBehaviorTracker';
import FunConsoleModal from './FunConsoleModal';
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

  // 🤖 Chatbot integration
  const chatbot = useChatbot();

  // 🧠 Behavior Tracking for Proactive Hints
  const behaviorTracker = useBehaviorTracker({
    userId: user?.id || 'anonymous',  // Fixed: use user.id instead of user.username
    missionId: mission?._id || 'free-play',
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
          
          // Get the toolbar height (the buttons row)
          const toolbar = document.querySelector('.blockpy-python-toolbar');
          const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 60;
          
          // Calculate available height: window height - toolbar - some padding
          const availableHeight = window.innerHeight - toolbarHeight - 20;
          
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
          
          // Update height on window resize
          window.addEventListener('resize', updateEditorHeight);
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
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Hide status panel at the bottom */
            .blockpy-status {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Make editor area expand to fill space */
            .blockpy-editor-area {
              flex: 1 !important;
              height: 100% !important;
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
            
            /* Ensure Run button and its group are always visible */
            .blockpy-python-toolbar .btn-group:first-of-type,
            .btn-success,
            button.btn-success,
            .blockpy-run {
              display: inline-block !important;
              visibility: visible !important;
            }
            
            /* Make sure the toolbar doesn't collapse */
            .blockpy-python-toolbar {
              display: flex !important;
            }
            
            /* Make toolbar smaller in height */
            .blockpy-python-toolbar {
              padding: 8px 15px !important;
              min-height: auto !important;
            }
            
            /* Make buttons smaller */
            .blockpy-python-toolbar .btn {
              padding: 6px 16px !important;
              font-size: 14px !important;
            }
          `;
          document.head.appendChild(style);
          
          // Hide all buttons except Run button after toolbar is created
          setTimeout(() => {
            const toolbar = document.querySelector('.blockpy-python-toolbar');
            if (toolbar) {
              // Hide all button groups except the first one (Run button group)
              const btnGroups = toolbar.querySelectorAll('.btn-group');
              btnGroups.forEach((group: any, index: number) => {
                if (index > 0) { // Keep first group (Run), hide all others
                  group.style.display = 'none';
                }
              });
              
              // Also hide any standalone buttons that aren't Run
              const allButtons = toolbar.querySelectorAll('button');
              allButtons.forEach((button: any) => {
                const parent = button.parentElement;
                const text = button.textContent?.toLowerCase() || '';
                const classList = button.className || '';
                
                // Check if this is the Run button
                const isRunButton = classList.includes('blockpy-run') || 
                                   text.includes('run') || 
                                   classList.includes('btn-success');
                
                // If it's not the Run button and not in the first btn-group, hide it
                if (!isRunButton && !parent?.classList.contains('btn-group')) {
                  button.style.display = 'none';
                }
              });
            }
          }, 1000);
        }, 500);
        
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
    <div className="h-full w-full flex" style={{ margin: 0, padding: 0 }}>
      {/* Left side: Blockly Editor */}
      <div className="flex-1 flex flex-col" style={{ margin: 0, padding: 0 }}>
        <div id="blockpy-editor" className="flex-1" style={{ margin: 0, padding: 0 }} />
        
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <p>Loading BlockPy...</p>
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
        <div className="fixed bottom-4 left-4 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 shadow-lg z-40 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-blue-700 font-medium">
            AI is watching... {blockActivity.length} edit{blockActivity.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* 💡 Proactive Hint Dialog */}
      {behaviorTracker.proactiveHint && (
        <div className="proactive-hint-dialog">
          <div className="proactive-hint-content">
            <p className="proactive-hint-message">
              {behaviorTracker.proactiveHint.message}
            </p>
            <div className="proactive-hint-actions">
              <button 
                className="proactive-hint-button proactive-hint-dismiss"
                onClick={behaviorTracker.dismissHint}
              >
                No thanks
              </button>
              <button 
                className="proactive-hint-button proactive-hint-accept"
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
                Yes please! 💡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 Floating Chatbot Button */}
      <button
        className={`chatbot-float-button ${behaviorTracker.proactiveHint ? 'has-notification' : ''}`}
        onClick={() => chatbot.setIsChatOpen(true)}
        title="Ask me anything!"
      >
        <span className="chatbot-icon-large">🤖</span>
        <span className="chatbot-pulse"></span>
      </button>

      {/* 🤖 Chatbot Modal/Popup */}
      {chatbot.isChatOpen && (
        <div className="chatbot-modal-overlay" onClick={() => chatbot.setIsChatOpen(false)}>
          <div className="chatbot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chatbot-modal-header">
              <div className="chatbot-header-content">
                <span className="chatbot-header-icon">🤖</span>
                <h2 className="chatbot-header-title">Ask Me Anything!</h2>
              </div>
              <button 
                className="chatbot-close-button"
                onClick={() => chatbot.setIsChatOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="chatbot-modal-body">
              {/* Quick Prompt Buttons */}
              <div className="chatbot-quick-prompts">
                {chatbot.quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    className="chatbot-prompt-button"
                    onClick={() => chatbot.handlePromptClick(prompt.text)}
                  >
                    <span className="chatbot-prompt-emoji">{prompt.emoji}</span>
                    <span className="chatbot-prompt-text">{prompt.text}</span>
                  </button>
                ))}
              </div>

              {/* Chat Messages */}
              <div className="chatbot-messages">
                {chatbot.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`chatbot-message ${message.isUser ? 'chatbot-message-user' : 'chatbot-message-bot'}`}
                  >
                    <div className="chatbot-message-avatar">
                      {message.isUser ? '😊' : '🤖'}
                    </div>
                    <div className="chatbot-message-bubble">
                      {message.text}
                    </div>
                  </div>
                ))}
                {chatbot.isTyping && (
                  <div className="chatbot-message chatbot-message-bot">
                    <div className="chatbot-message-avatar">🤖</div>
                    <div className="chatbot-message-bubble">
                      <div className="chatbot-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatbot.messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="chatbot-input-container">
                <input
                  type="text"
                  className="chatbot-input"
                  placeholder="Type your question here... ✨"
                  value={chatbot.inputValue}
                  onChange={(e) => chatbot.setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && chatbot.handleSendMessage()}
                />
                <button className="chatbot-send-button" onClick={chatbot.handleSendMessage}>
                  <span className="chatbot-send-icon">📤</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style dangerouslySetInnerHTML={{__html: `
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
  );
}
