import React, { Component } from 'react';
import { X, Terminal, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';

interface Props {
  visible: boolean;
  pythonCode: string;
  expectedOutput?: string;
  missionId?: string;
  onClose(): void;
}

interface State {
  output: string;
  error: string | null;
  executionTime: number;
  isRunning: boolean;
  aiAnalysis: string | null;
  isAnalyzing: boolean;
  userInput: string;
  waitingForInput: boolean;
  inputPrompt: string;
  hasError: boolean;
  errorLine: number | null;
  showComparison: boolean;
  collectedInputs: string[];
  totalInputsNeeded: number;
  currentInputIndex: number;
  inputPrompts: string[];  // Store the prompts from input() calls
}

export default class ConsoleModal extends Component<Props, State> {
  private escapeListener = (e: KeyboardEvent) => {
    if (e.keyCode === 27) {
      this.close();
    }
  };

  private inputRef: React.RefObject<HTMLInputElement>;
  private outputEndRef: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.state = {
      output: '',
      error: null,
      executionTime: 0,
      isRunning: false,
      aiAnalysis: null,
      isAnalyzing: false,
      userInput: '',
      waitingForInput: false,
      inputPrompt: '',
      hasError: false,
      errorLine: null,
      showComparison: false,
      collectedInputs: [],
      totalInputsNeeded: 0,
      currentInputIndex: 0,
      inputPrompts: [],
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

  public componentDidUpdate(prevProps: Props) {
    if (this.props.visible && !prevProps.visible) {
      this.executeCode();
    }
    
    // Auto-scroll to bottom
    if (this.outputEndRef.current) {
      this.outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.escapeListener);
  }

  private async executeCode() {
    this.setState({ 
      isRunning: true, 
      output: '>>> Running your code...\n\n',
      error: null,
      aiAnalysis: null,
      hasError: false,
      errorLine: null,
      showComparison: false,
      collectedInputs: [],
      totalInputsNeeded: 0,
      currentInputIndex: 0,
      waitingForInput: false,
    });

    const startTime = performance.now();

    try {
      // First, check if code needs input
      const checkResponse = await fetch('http://localhost:8000/api/v1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.props.pythonCode,
          inputs: [],  // Empty inputs to check if needed
        }),
      });

      const checkResult = await checkResponse.json();
      
      // If code needs input, set up interactive input mode
      if (checkResult.needs_input) {
        this.setState({
          isRunning: false,
          waitingForInput: true,
          totalInputsNeeded: checkResult.input_count,
          currentInputIndex: 0,
          output: checkResult.input_prompts?.[0] || '',  // Show first prompt immediately
          inputPrompts: checkResult.input_prompts || [],
        });
        
        // Focus input field
        setTimeout(() => {
          if (this.inputRef.current) {
            this.inputRef.current.focus();
          }
        }, 100);
      } else {
        // No input needed, just show results
        const executionTime = performance.now() - startTime;

        this.setState({
          output: checkResult.output || '',
          error: checkResult.error || null,
          executionTime,
          isRunning: false,
          hasError: !!checkResult.error,
          errorLine: checkResult.error_line || null,
        });

        // Check if output matches expected output
        if (this.props.expectedOutput && !checkResult.error) {
          const actualOutput = checkResult.output?.trim() || '';
          const expectedOutput = this.props.expectedOutput.trim();
          
          if (actualOutput !== expectedOutput) {
            this.setState({ showComparison: true });
            await this.getAIAnalysis(checkResult.output, checkResult.error);
          }
        } else if (checkResult.error) {
          await this.getAIAnalysis(checkResult.output, checkResult.error);
        }
      }

    } catch (err: any) {
      this.setState({
        error: `Connection error: ${err.message}`,
        isRunning: false,
        hasError: true,
      });
    }
  }

  private async getAIAnalysis(output: string, error: string | null) {
    if (!error && !this.state.showComparison) return;

    this.setState({ isAnalyzing: true });

    try {
      const response = await fetch('http://localhost:8000/api/v1/analyze-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.props.pythonCode,
          output: output,
          error: error,
          expected_output: this.props.expectedOutput,
          mission_id: this.props.missionId,
        }),
      });

      const result = await response.json();
      
      this.setState({
        aiAnalysis: result.analysis || result.hint || 'No analysis available',
        isAnalyzing: false,
      });

    } catch (err: any) {
      this.setState({
        aiAnalysis: 'Unable to get AI assistance at this time.',
        isAnalyzing: false,
      });
    }
  }

  private handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { userInput, collectedInputs, totalInputsNeeded, currentInputIndex, inputPrompts } = this.state;
    
    if (!userInput.trim()) return;
    
    // Add current input to collected inputs
    const newCollectedInputs = [...collectedInputs, userInput];
    const newIndex = currentInputIndex + 1;
    
    // Update output to show the input (like a real console)
    const currentOutput = this.state.output;
    const inputLine = userInput + '\n';
    const nextPrompt = newIndex < totalInputsNeeded ? (inputPrompts[newIndex] || '') : '';
    
    this.setState({
      collectedInputs: newCollectedInputs,
      currentInputIndex: newIndex,
      userInput: '',
      output: currentOutput + inputLine + nextPrompt,
    });
    
    // If we have all inputs, execute the code
    if (newIndex >= totalInputsNeeded) {
      this.setState({ 
        waitingForInput: false,
        isRunning: true,
      });
      
      const startTime = performance.now();
      
      try {
        const response = await fetch('http://localhost:8000/api/v1/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: this.props.pythonCode,
            inputs: newCollectedInputs,
          }),
        });

        const result = await response.json();
        const executionTime = performance.now() - startTime;

        this.setState({
          output: result.output || '',
          error: result.error || null,
          executionTime,
          isRunning: false,
          hasError: !!result.error,
          errorLine: result.error_line || null,
        });

        // Check if output matches expected output
        if (this.props.expectedOutput && !result.error) {
          const actualOutput = result.output?.trim() || '';
          const expectedOutput = this.props.expectedOutput.trim();
          
          if (actualOutput !== expectedOutput) {
            this.setState({ showComparison: true });
            await this.getAIAnalysis(result.output, result.error);
          }
        } else if (result.error) {
          await this.getAIAnalysis(result.output, result.error);
        }

      } catch (err: any) {
        this.setState({
          error: `Connection error: ${err.message}`,
          isRunning: false,
          hasError: true,
        });
      }
    }
  };

  public close() {
    this.props.onClose();
  }

  public render() {
    const { visible } = this.props;
    const { 
      output, 
      error, 
      executionTime, 
      isRunning, 
      aiAnalysis, 
      isAnalyzing,
      hasError,
      errorLine,
      showComparison,
    } = this.state;

    if (!visible) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
        <Card className="w-full max-w-6xl h-[90vh] flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Python Console</h2>
              {executionTime > 0 && (
                <span className="text-sm text-slate-400">
                  ({executionTime.toFixed(0)}ms)
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => this.close()}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="console" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-4 bg-slate-800 border border-slate-700">
                <TabsTrigger value="console" className="data-[state=active]:bg-slate-700">
                  <Terminal className="w-4 h-4 mr-2" />
                  Console
                </TabsTrigger>
                {(hasError || showComparison) && (
                  <TabsTrigger value="ai" className="data-[state=active]:bg-slate-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Assistant
                  </TabsTrigger>
                )}
                {showComparison && (
                  <TabsTrigger value="comparison" className="data-[state=active]:bg-slate-700">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Output Comparison
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Console Tab */}
              <TabsContent value="console" className="flex-1 m-4 mt-2 overflow-hidden">
                <div className="h-full flex flex-col bg-black rounded-lg border border-slate-700 overflow-hidden">
                  {/* Output Area */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                    {isRunning ? (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                        <span>Executing...</span>
                      </div>
                    ) : (
                      <>
                        {/* Success/Error Indicator */}
                        {!hasError && !showComparison && output && (
                          <Alert className="mb-4 bg-green-900/20 border-green-500/50">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <AlertDescription className="text-green-300">
                              Code executed successfully!
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {hasError && (
                          <Alert className="mb-4 bg-red-900/20 border-red-500/50">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-300">
                              {errorLine ? `Error on line ${errorLine}` : 'Execution error'}
                              {' - Check the AI Assistant tab for help!'}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Output */}
                        <pre className="text-green-400 whitespace-pre-wrap break-words">
                          {output}
                        </pre>

                        {/* Error */}
                        {error && (
                          <pre className="text-red-400 mt-4 whitespace-pre-wrap break-words">
                            {error}
                          </pre>
                        )}

                        <div ref={this.outputEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  <form onSubmit={this.handleInputSubmit} className="border-t border-slate-700 p-3 bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-mono">{'>>>'}</span>
                      <input
                        ref={this.inputRef}
                        type="text"
                        value={this.state.userInput}
                        onChange={(e) => this.setState({ userInput: e.target.value })}
                        placeholder={this.state.waitingForInput ? "" : ""}
                        className="flex-1 bg-transparent text-green-400 font-mono outline-none border-none placeholder:text-slate-600"
                        disabled={isRunning && !this.state.waitingForInput}
                      />
                    </div>
                  </form>
                </div>
              </TabsContent>

              {/* AI Assistant Tab */}
              <TabsContent value="ai" className="flex-1 m-4 mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30 p-6 overflow-y-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">AI Analysis & Hints</h3>
                  </div>

                  {isAnalyzing ? (
                    <div className="flex items-center gap-3 text-purple-300">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent"></div>
                      <span>Analyzing your code...</span>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {aiAnalysis}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">
                      No analysis available yet.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Output Comparison Tab */}
              {showComparison && (
                <TabsContent value="comparison" className="flex-1 m-4 mt-2 overflow-hidden">
                  <div className="h-full grid grid-cols-2 gap-4">
                    {/* Your Output */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 overflow-y-auto">
                      <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Your Output
                      </h3>
                      <pre className="text-slate-300 text-sm font-mono whitespace-pre-wrap break-words">
                        {output || '(no output)'}
                      </pre>
                    </div>

                    {/* Expected Output */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 overflow-y-auto">
                      <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Expected Output
                      </h3>
                      <pre className="text-slate-300 text-sm font-mono whitespace-pre-wrap break-words">
                        {this.props.expectedOutput || '(no expected output)'}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              💡 Tip: Press ESC to close this window
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => this.executeCode()}
                disabled={isRunning}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRunning ? 'Running...' : 'Run Again'}
              </Button>
              <Button
                onClick={() => this.close()}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Close
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }
}
