'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TestConsoleModal from './TestConsoleModal';
import '../styles/kid-sidebar.css';
import { BookOpen, Target, Lightbulb, Clock, Terminal } from 'lucide-react';

// Reuse type definitions from BlocklyWorkspace
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
};

export type UserData = {
  id: string;
  username: string;
  avatar: string;
  ageRange: string;
  role: string;
  guardianEmail?: string;
};

interface TestBlocklyWorkspaceProps {
  mission: Mission;
  user: UserData | null;
}

export default function TestBlocklyWorkspace({
  mission,
  user,
}: TestBlocklyWorkspaceProps) {
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [consoleCode, setConsoleCode] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);

  // 🧪 Determine test type from mission title (Pre1-3 or Post1-3)
  const testType = mission.title.startsWith('Pre') ? 'PRE-TEST' : 'POST-TEST';

  useEffect(() => {
    if (initializedRef.current) return;

    const initBlockPy = () => {
      // Check for blockpy library (same as BlocklyWorkspace)
      if (!(window as any).blockpy) {
        setTimeout(initBlockPy, 100);
        return;
      }

      try {
        console.log('🧪 [TEST MODE] Initializing BlockPy...');
        
        const BlockPy = (window as any).blockpy.BlockPy;
        editorRef.current = new BlockPy({
          'attachment.point': '#test-blockpy-editor',
          // Assignment settings - start with text-only view
          'assignment.settings.start_view': 'text', // text-only mode
          'assignment.settings.can_blocks': 'false', // disable blocks
          'assignment.settings.hide_import_datasets_button': 'true',
          'assignment.settings.hide_files': 'true',
          // Editor configuration
          'text.width': 100, // Full width for text
          'blocks.width': 0, // No blocks
          // Mission-specific info
          'assignment.title': mission.title,
          'assignment.description': mission.description,
          'assignment.starting_code': mission.starterCode || '# Write your code here',
          'assignment.expected_output': mission.expectedOutput || '',
          'assignment.hints': mission.hints?.join('\n') || '',
          'assignment.objectives': mission.objectives?.join(', ') || '',
        });

        // Set starter code after initialization
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

        // Hide unwanted BlockPy elements (same as BlocklyWorkspace)
        setTimeout(() => {
          const style = document.createElement('style');
          style.innerHTML = `
            /* Hide the entire second row with console and feedback */
            #test-blockpy-editor div[data-bind*="ui.secondRow.width"] {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Hide header row with assignment description and quick menu */
            #test-blockpy-editor div.row[data-bind*="ui.smallLayout"] {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Hide header panels */
            #test-blockpy-editor .blockpy-header,
            #test-blockpy-editor .blockpy-quick-menu {
              display: none !important;
            }

            /* Hide the entire BlockPy toolbar (blue header with Run button) */
            #test-blockpy-editor .blockpy-python-toolbar,
            #test-blockpy-editor .blockpy-toolbar {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
              visibility: hidden !important;
            }

            /* Hide all BlockPy buttons including Run */
            #test-blockpy-editor .blockpy-run,
            #test-blockpy-editor .btn-success,
            #test-blockpy-editor button.btn-success,
            #test-blockpy-editor .blockpy-python-toolbar .btn-group {
              display: none !important;
              visibility: hidden !important;
            }

            /* Hide BlockPy status bar/footer at the bottom */
            #test-blockpy-editor .blockpy-status,
            #test-blockpy-editor .blockpy-footer,
            #test-blockpy-editor .blockpy-status-bar,
            #test-blockpy-editor div[data-bind*="status"],
            #test-blockpy-editor .blockpy-presentation-status {
              display: none !important;
              height: 0 !important;
              overflow: hidden !important;
              visibility: hidden !important;
            }

            /* Hide mode toggle buttons */
            #test-blockpy-editor .blockpy-mode-display,
            #test-blockpy-editor .btn-group-vertical,
            #test-blockpy-editor button[data-mode],
            #test-blockpy-editor .blockpy-mode-set-blocks {
              display: none !important;
            }

            /* Force text editor to take full space */
            #test-blockpy-editor .blockpy-content {
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
            }

            #test-blockpy-editor div[data-bind*="ui.editorRow.width"] {
              flex: 1 !important;
              height: 100% !important;
              display: flex !important;
            }
          `;
          document.head.appendChild(style);
        }, 1000);

        initializedRef.current = true;
        setIsLoading(false);
        console.log('✅ [TEST MODE] BlockPy initialized successfully');

      } catch (error) {
        console.error('❌ Failed to initialize test editor:', error);
        setIsLoading(false);
      }
    };

    initBlockPy();

    return () => {
      if (editorRef.current) {
        try {
          if (typeof editorRef.current.destroy === 'function') {
            editorRef.current.destroy();
          }
        } catch (e) {
          console.warn('⚠️ Error destroying editor:', e);
        }
      }
    };
  }, [mission]);

  const handleRunCode = async () => {
    if (!editorRef.current || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Get code from BlockPy editor using multiple methods (same as BlocklyWorkspace)
      let code = '';
      
      const pythonEditor = editorRef.current.components?.pythonEditor;
      const textEditor = pythonEditor?.bm?.textEditor;
      const bm = pythonEditor?.bm;

      if (bm) {
        // Try BlockMirror's getCode() first
        if (typeof bm.getCode === 'function') {
          code = bm.getCode();
        }
      }

      if (!code && textEditor) {
        // Try various CodeMirror methods
        if (typeof textEditor.getCode === 'function') {
          code = textEditor.getCode();
        } else if (textEditor.doc && typeof textEditor.doc.getValue === 'function') {
          code = textEditor.doc.getValue();
        } else if (typeof textEditor.getDoc === 'function') {
          const doc = textEditor.getDoc();
          if (doc && typeof doc.getValue === 'function') {
            code = doc.getValue();
          }
        } else if (textEditor.cm && typeof textEditor.cm.getValue === 'function') {
          code = textEditor.cm.getValue();
        } else if (textEditor.value) {
          code = textEditor.value;
        }
      }

      // Fallback to file contents
      if (!code) {
        const fileContents = pythonEditor?.file?.contents;
        if (fileContents && fileContents.trim()) {
          code = fileContents;
        }
      }

      if (!code || !code.trim()) {
        alert('⚠️ Please write some code before running!');
        setIsSubmitting(false);
        return;
      }

      console.log('🧪 [TEST MODE] Running test code...');
      setAttemptCount(prev => prev + 1);
      setConsoleCode(code);
      setShowConsoleModal(true);

    } catch (error) {
      console.error('❌ Error running code:', error);
      alert('Error running code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      {/* 🚀 Test Mode Header */}
      <header className="flex-shrink-0 h-20 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-b-2 border-yellow-300 shadow-md z-50 px-6 flex items-center justify-between">
        {/* Left: Navigation + Test Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="group relative p-3 rounded-xl bg-white hover:bg-gradient-to-br hover:from-orange-500 hover:to-red-600 text-gray-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-110 active:scale-95"
            title="Back to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform duration-300">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 🧪 Test Mode Badge */}
          <div className="flex items-center gap-2 px-5 py-2 bg-yellow-100 border-2 border-yellow-500 rounded-lg shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-700">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span className="font-bold text-sm text-yellow-800">{testType} MODE</span>
          </div>
        </div>

        {/* Center: Mission Title */}
        <div className="flex-1 flex items-center justify-center px-4">
          <h1 className="text-xl font-bold text-gray-800">{mission.title}</h1>
        </div>

        {/* Right: Run Button */}
        <button
          onClick={handleRunCode}
          disabled={isSubmitting}
          className={`
            group relative flex items-center gap-3 px-8 py-3 rounded-full font-bold text-white shadow-xl transition-all duration-300 overflow-hidden
            ${isSubmitting
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed scale-95'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 hover:scale-110 hover:shadow-2xl active:scale-95'
            }
          `}
        >
          <div className="relative z-10 flex items-center gap-3">
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-base tracking-wide">Running...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="text-base tracking-wide">RUN CODE</span>
              </>
            )}
          </div>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Mission Instructions Panel */}
        <div className="w-96 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Mission Description */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3">📋 Instructions</h2>
              <p className="text-gray-700 leading-relaxed">{mission.description}</p>
            </div>

            {/* Objectives */}
            {mission.objectives && mission.objectives.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="text-md font-bold text-gray-800">Objectives</h3>
                </div>
                <ul className="space-y-2">
                  {mission.objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-sm">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hints */}
            {mission.hints && mission.hints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-md font-bold text-gray-800">Hints</h3>
                </div>
                <ul className="space-y-2">
                  {mission.hints.map((hint, idx) => (
                    <li key={idx} className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg border-l-2 border-amber-400">
                      💡 {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Test Cases / Examples */}
            {mission.testCases && mission.testCases.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-5 h-5 text-green-600" />
                  <h3 className="text-md font-bold text-gray-800">Examples</h3>
                </div>
                <div className="space-y-3">
                  {mission.testCases.map((testCase, idx) => (
                    <div key={idx} className="bg-gray-900 rounded-lg p-3 text-xs font-mono">
                      <div className="text-blue-400 mb-1">
                        <span className="text-gray-500"># Example {idx + 1}</span>
                      </div>
                      <div className="text-yellow-300 mb-1">
                        Input: <span className="text-green-400">{testCase.input}</span>
                      </div>
                      <div className="text-yellow-300">
                        Output: <span className="text-green-400">{testCase.expectedOutput}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Output (if no test cases) */}
            {!mission.testCases && mission.expectedOutput && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-5 h-5 text-green-600" />
                  <h3 className="text-md font-bold text-gray-800">Expected Output</h3>
                </div>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg font-mono overflow-x-auto">
                  {mission.expectedOutput}
                </pre>
              </div>
            )}

            {/* Estimated Time */}
            {mission.estimatedTime && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Estimated time: {mission.estimatedTime} minutes</span>
              </div>
            )}

            {/* Attempt Counter */}
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
              <div className="text-center">
                <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">Current Attempts</p>
                <p className="text-3xl font-black text-purple-700">{attemptCount}</p>
              </div>
            </div>

            {/* Test Mode Notice */}
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ <strong>Test Mode:</strong> AI assistance is disabled. Write your solution independently using only the Python text editor.
              </p>
            </div>
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 flex flex-col relative h-full bg-white">
          <div id="test-blockpy-editor" className="flex-1 w-full h-full" style={{ margin: 0, padding: 0 }} />

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center" style={{ zIndex: 9999 }}>
              <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mb-4"></div>
              <p className="text-yellow-900 font-bold text-lg animate-pulse">
                Loading test editor...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Test Console Modal */}
      <TestConsoleModal
        visible={showConsoleModal}
        pythonCode={consoleCode}
        expectedOutput={mission?.expectedOutput}
        missionId={mission?._id}
        userId={user?.id}
        testProblemId={mission?.title} // Pre1, Pre2, etc.
        attemptCount={attemptCount}
        onClose={() => setShowConsoleModal(false)}
        onRetry={() => {
          setShowConsoleModal(false);
          setAttemptCount(prev => prev + 1);
        }}
        onTestComplete={() => {
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }}
      />
    </div>
  );
}
