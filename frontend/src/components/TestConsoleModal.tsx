import React, { Component } from 'react';
import { X, Terminal, Trophy, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import Confetti from 'react-confetti';
import { submitCode } from '../services/submissionsApi';

interface Props {
  visible: boolean;
  pythonCode: string;
  expectedOutput?: string;
  missionId?: string;
  userId?: string;
  testProblemId?: string; // Pre1, Pre2, Pre3, Post1, Post2, Post3
  attemptCount?: number; // Current attempt count
  onClose(): void;
  onRetry?(): void; // Called when user clicks "Try Again"
  onTestComplete?(): void;
}

interface State {
  output: string;
  error: string | null;
  executionTime: number;
  isRunning: boolean;
  userInput: string;
  waitingForInput: boolean;
  collectedInputs: string[];
  totalInputsNeeded: number;
  currentInputIndex: number;
  inputPrompts: string[];
  isSuccess: boolean;
  showCelebration: boolean;
  hasError: boolean;
  rubricScores: {
    pythonSyntax: number;
    correctness: number;
    codeStructure: number;
    requiredFeatures: number;
    noErrors: number;
    total: number;
  } | null;
  showScores: boolean;
}

export default class TestConsoleModal extends Component<Props, State> {
  private escapeListener = (e: KeyboardEvent) => {
    if (e.keyCode === 27 && !this.state.showCelebration) {
      this.close();
    }
  };

  private inputRef: React.RefObject<HTMLInputElement>;
  private outputEndRef: React.RefObject<HTMLDivElement>;
  private celebrationTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      output: '',
      error: null,
      executionTime: 0,
      isRunning: false,
      userInput: '',
      waitingForInput: false,
      collectedInputs: [],
      totalInputsNeeded: 0,
      currentInputIndex: 0,
      inputPrompts: [],
      isSuccess: false,
      showCelebration: false,
      hasError: false,
      rubricScores: null,
      showScores: false,
    };
    
    this.inputRef = React.createRef();
    this.outputEndRef = React.createRef();
  }

  public componentDidMount() {
    window.addEventListener('keydown', this.escapeListener);
    if (this.props.visible) {
      this.executeCode();
    }
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.escapeListener);
    if (this.celebrationTimer) {
      clearTimeout(this.celebrationTimer);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.visible && !prevProps.visible) {
      this.executeCode();
    }

    if (this.state.waitingForInput && this.inputRef.current) {
      this.inputRef.current.focus();
    }

    if (this.outputEndRef.current) {
      this.outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private close = () => {
    this.props.onClose();
    this.setState({
      output: '',
      error: null,
      executionTime: 0,
      isRunning: false,
      userInput: '',
      waitingForInput: false,
      collectedInputs: [],
      totalInputsNeeded: 0,
      currentInputIndex: 0,
      inputPrompts: [],
      isSuccess: false,
      showCelebration: false,
      rubricScores: null,
      showScores: false,
    });
  };

  private async executeCode() {
    this.setState({
      isRunning: true,
      output: '',
      error: null,
      hasError: false,
      collectedInputs: [],
      currentInputIndex: 0,
      waitingForInput: false,
      rubricScores: null,
      showScores: false,
    });

    const startTime = Date.now();

    try {
      // Count input() calls
      const inputCount = (this.props.pythonCode.match(/input\s*\(/g) || []).length;
      this.setState({ totalInputsNeeded: inputCount });

      if (inputCount > 0) {
        this.setState({ 
          waitingForInput: true,
          output: this.state.output + '>>> Waiting for input...\n'
        });
        return;
      }

      await this.runPython(this.props.pythonCode, []);

    } catch (error: unknown) {
      console.error('Execution error:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Unknown error',
        hasError: true,
        isRunning: false,
      });
    }

    const executionTime = Date.now() - startTime;
    this.setState({ executionTime });
  }

  private async runPython(code: string, inputs: string[]) {
    return new Promise<void>((resolve, reject) => {
      if (typeof (window as Window & { Sk?: unknown }).Sk === 'undefined') {
        reject(new Error('Skulpt not loaded'));
        return;
      }

      interface SkullptWindow extends Window {
        Sk: {
          configure: (config: {
            output: (text: string) => void;
            read: (filename: string) => string;
            inputfun: () => string;
          }) => void;
          builtinFiles?: { files?: Record<string, string> };
          misceval: {
            asyncToPromise: (fn: () => unknown) => Promise<unknown>;
          };
          importMainWithBody: (name: string, dumpJS: boolean, body: string, canSuspend: boolean) => unknown;
        };
      }

      (window as unknown as SkullptWindow).Sk.configure({
        output: (text: string) => {
          this.setState(prev => ({ output: prev.output + text }));
        },
        read: (filename: string) => {
          const skWindow = window as unknown as { Sk: { builtinFiles?: { files?: Record<string, string> } } };
          if (skWindow.Sk.builtinFiles?.files?.[filename]) {
            return skWindow.Sk.builtinFiles.files[filename];
          }
          throw new Error(`File not found: ${filename}`);
        },
        inputfun: () => {
          const input = inputs.shift();
          if (input !== undefined) {
            this.setState(prev => ({ output: prev.output + input + '\n' }));
            return input;
          }
          throw new Error('No input provided');
        },
      });

      const skWindow = window as unknown as SkullptWindow;
      skWindow.Sk.misceval
        .asyncToPromise(() => skWindow.Sk.importMainWithBody('<stdin>', false, code, true))
        .then(() => {
          this.setState({ isRunning: false }, () => {
            this.checkSuccess();
          });
          resolve();
        })
        .catch((err: unknown) => {
          const errorMsg = String(err);
          this.setState({ 
            error: errorMsg,
            hasError: true,
            isRunning: false
          }, () => {
            this.submitTestResult();
          });
          resolve();
        });
    });
  }

  private handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userInput, collectedInputs, currentInputIndex, totalInputsNeeded } = this.state;

    if (!userInput.trim()) return;

    const newInputs = [...collectedInputs, userInput];
    const newIndex = currentInputIndex + 1;

    this.setState(prev => ({ 
      output: prev.output + userInput + '\n',
      collectedInputs: newInputs,
      currentInputIndex: newIndex,
      userInput: '',
    }));

    if (newIndex >= totalInputsNeeded) {
      this.setState({ waitingForInput: false });
      await this.runPython(this.props.pythonCode, newInputs);
    } else {
      this.setState({ 
        output: this.state.output + '>>> Waiting for next input...\n'
      });
    }
  };

  private checkSuccess = () => {
    const { output } = this.state;
    const { expectedOutput } = this.props;

    if (!expectedOutput) {
      this.submitTestResult();
      return;
    }

    const normalizeOutput = (str: string) =>
      str.trim().replace(/\s+/g, ' ').toLowerCase();

    const isCorrect = normalizeOutput(output) === normalizeOutput(expectedOutput);

    if (isCorrect) {
      this.setState({ isSuccess: true });
    }

    this.submitTestResult();
  };

  private async submitTestResult() {
    try {
      console.log('🧪 Submitting test result...');
      
      const result = await submitCode({
        missionId: this.props.missionId || '',
        code: this.props.pythonCode,
        output: this.state.output || '',
        attempts: this.props.attemptCount || 1,
        timeSpent: this.state.executionTime,
      });

      console.log('📊 Test submission result:', result);

      // Check if rubric scores were returned (test mode)
      if (result.rubricScores) {
        this.setState({
          rubricScores: result.rubricScores,
          showScores: true,
          showCelebration: result.rubricScores.total >= 70,
        });

        if (result.rubricScores.total >= 70) {
          this.celebrationTimer = setTimeout(() => {
            this.setState({ showCelebration: false });
          }, 5000);
        }
      }

    } catch (error) {
      console.error('❌ Failed to submit test result:', error);
    }
  }

  private handleReturnToDashboard = () => {
    if (this.props.onTestComplete) {
      this.props.onTestComplete();
    }
    this.close();
  };

  private handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.close();
  };

  render() {
    if (!this.props.visible) return null;

    const { output, error, isRunning, showCelebration, rubricScores, showScores } = this.state;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-6">
        {showCelebration && <Confetti recycle={false} numberOfPieces={500} />}
        
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl border border-purple-500/30 w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
            <div className="flex items-center gap-3">
              <Terminal className="w-7 h-7 text-yellow-400" />
              <h2 className="text-2xl font-black text-white">
                🧪 Test Console
              </h2>
            </div>
            <button
              onClick={this.close}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Output Area (Left) */}
            <div className="flex-1 flex flex-col border-r border-purple-500/30">
              <div className="p-4 bg-purple-900/20 border-b border-purple-500/30">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Output
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50 font-mono text-sm">
                {isRunning ? (
                  <div className="flex items-center gap-3 text-yellow-400 animate-pulse">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    <span>Running your code...</span>
                  </div>
                ) : (
                  <>
                    <pre className="text-green-400 whitespace-pre-wrap break-words">
                      {output}
                    </pre>

                    {error && (
                      <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Error:</span>
                        </div>
                        <pre className="text-red-300 whitespace-pre-wrap break-words text-xs">
                          {error}
                        </pre>
                      </div>
                    )}

                    <div ref={this.outputEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={this.handleInputSubmit} className="border-t border-purple-500/30 p-3 bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-mono text-lg">{'>>>'}</span>
                  <input
                    ref={this.inputRef}
                    type="text"
                    value={this.state.userInput}
                    onChange={(e) => this.setState({ userInput: e.target.value })}
                    placeholder={this.state.waitingForInput ? "Enter input..." : ""}
                    className="flex-1 bg-transparent text-green-400 font-mono text-lg outline-none border-none placeholder:text-slate-600"
                    disabled={isRunning && !this.state.waitingForInput}
                  />
                </div>
              </form>
            </div>

            {/* Score Panel (Right) */}
            <div className="w-96 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Test Results</h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                {showScores && rubricScores ? (
                  <div className="space-y-4">
                    {/* Total Score */}
                    <div className="bg-yellow-900/30 border-2 border-yellow-500/50 rounded-xl p-6">
                      <div className="text-center mb-4">
                        <div className="text-5xl font-black mb-2">
                          <span className={rubricScores.total >= 70 ? 'text-green-400' : 'text-orange-400'}>
                            {rubricScores.total}
                          </span>
                          <span className="text-2xl text-gray-400">/100</span>
                        </div>
                        <p className="text-yellow-200 font-semibold">
                          {rubricScores.total >= 90 ? '🌟 Excellent!' :
                           rubricScores.total >= 70 ? '✨ Good Job!' :
                           rubricScores.total >= 50 ? '💪 Keep Going!' :
                           '📚 Keep Practicing!'}
                        </p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-gray-300 font-medium">Python Syntax</span>
                        <span className="text-white font-bold">{rubricScores.pythonSyntax}/40</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-gray-300 font-medium">Correctness</span>
                        <span className="text-white font-bold">{rubricScores.correctness}/30</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-gray-300 font-medium">Code Structure</span>
                        <span className="text-white font-bold">{rubricScores.codeStructure}/15</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-gray-300 font-medium">Required Features</span>
                        <span className="text-white font-bold">{rubricScores.requiredFeatures}/10</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-gray-300 font-medium">No Errors</span>
                        <span className="text-white font-bold">{rubricScores.noErrors}/5</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 mt-6">
                      {rubricScores.total >= 70 ? (
                        <Button
                          onClick={this.handleReturnToDashboard}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all"
                        >
                          🏆 Submit & Complete
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={this.handleReturnToDashboard}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
                          >
                            💾 Submit Anyway
                          </Button>
                          <Button
                            onClick={this.handleRetry}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
                          >
                            🔄 Try Again (Attempt {(this.props.attemptCount || 0) + 1})
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className="text-4xl">⏳</div>
                    <p className="text-purple-300">
                      {isRunning ? 'Running your code...' : 'Run your code to see results'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
