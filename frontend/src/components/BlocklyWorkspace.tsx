'use client';

import { useEffect, useRef, useState } from 'react';

// Type definitions (move to top)
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
  config?: any;
  concepts: string[];
  analytics?: any;
};
export type UserData = {
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
  completedMissions: string[];
  totalSubmissions: number;
  successfulSubmissions: number;
  avgAccuracy: number;
  xp: number;
  level: number;
  badges: string[];
  skillScores: Record<string, number>;
  lastActive?: string;
};

interface BlocklyWorkspaceProps {
  mission: Mission;
  user: UserData | null;
  profile: ProfileData | null;
  sendChatMessage: (request: any) => Promise<any>;
  getPredefinedPrompts: () => Promise<any>;
  checkAIServiceHealth: () => Promise<boolean>;
}

export default function BlocklyWorkspace({
  mission,
  user,
  profile,
  sendChatMessage,
  getPredefinedPrompts,
  checkAIServiceHealth,
}: BlocklyWorkspaceProps) {
  const editorRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

    // Reset editor to starter code when mission changes
    useEffect(() => {
      if (editorRef.current?.components?.editor?.python?.bm?.textEditor && mission?.starterCode !== undefined) {
        editorRef.current.components.editor.python.bm.textEditor.setValue(mission.starterCode || '');
      }
    }, [mission?.starterCode]);
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
    
    // Load sidebar styles
    const sidebarStyles = document.createElement('link');
    sidebarStyles.rel = 'stylesheet';
    sidebarStyles.href = '/css/kid-sidebar.css';
    document.head.appendChild(sidebarStyles);
    
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
      document.head.removeChild(sidebarStyles);
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
            } else {
              console.log('❌ Toolbar not found yet');
            }
          }, 1000);
        }, 500);
        
        initializedRef.current = true;
        setIsLoading(false);
      } catch (err) {
        console.error('BlockPy init error:', err);
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
    <div className="h-full w-full" style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Blockly Editor only, mission info panel removed */}
      <div id="blockpy-editor" className="h-full w-full" style={{ margin: 0, padding: 0, flex: 1 }} />
      {isLoading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center">
          <p>Loading BlockPy...</p>
        </div>
      )}
    </div>
  );
}
