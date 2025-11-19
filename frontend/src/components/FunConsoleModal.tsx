import React, { Component } from 'react';
import { X, Terminal, Sparkles, Zap, Trophy, PartyPopper, Heart, Star, AlertCircle, Send, Loader } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import Confetti from 'react-confetti';
import { submitCode } from '../services/submissionsApi';
import { showMultipleAchievements } from './AchievementNotification';

interface Props {
  visible: boolean;
  pythonCode: string;
  expectedOutput?: string;
  missionId?: string;
  userId?: string;
  onClose(): void;
  onMissionComplete?(): void;
  creativeMode?: boolean; // If true, allow creative output (line count match)
}

interface State {
  output: string;
  error: string | null;
  executionTime: number;
  isRunning: boolean;
  aiHelper: string | null;
  isThinking: boolean;
  waitingForSubmission: boolean; // NEW: Waiting for backend submission/AI response
  userInput: string;
  waitingForInput: boolean;
  hasError: boolean;
  errorLine: number | null;
  collectedInputs: string[];
  totalInputsNeeded: number;
  currentInputIndex: number;
  inputPrompts: string[];
  isSuccess: boolean;
  showCelebration: boolean;
  encouragementMessage: string;
}

const ENCOURAGEMENT_MESSAGES = [
  "🌟 You're doing great! Keep going!",
  "💪 Almost there! You've got this!",
  "🎯 Nice work! Let's fix this together!",
  "🚀 You're learning so fast!",
  "⭐ Awesome effort! Try again!",
  "🎨 Creative thinking! Let's debug!",
  "🔥 You're on fire! Keep coding!",
];

const SUCCESS_MESSAGES = [
  "🎉 Amazing! You did it! Mission Complete!",
  "⭐ Brilliant work! You're a coding superstar!",
  "🏆 Perfect! You've mastered this mission!",
  "🌟 Incredible! You're getting better every day!",
  "💫 Fantastic job! Mission accomplished!",
];

export default class FunConsoleModal extends Component<Props, State> {
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
      aiHelper: null,
      isThinking: false,
      waitingForSubmission: false, // NEW
      userInput: '',
      waitingForInput: false,
      hasError: false,
      errorLine: null,
      collectedInputs: [],
      totalInputsNeeded: 0,
      currentInputIndex: 0,
      inputPrompts: [],
      isSuccess: false,
      showCelebration: false,
      encouragementMessage: '',
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
    if (this.celebrationTimer) {
      clearTimeout(this.celebrationTimer);
    }
  }

  private getRandomEncouragement(): string {
    return ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
  }

  private getRandomSuccess(): string {
    return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
  }

  private async executeCode() {
    this.setState({ 
      isRunning: false,
      output: '',
      error: null,
      aiHelper: null,
      hasError: false,
      errorLine: null,
      collectedInputs: [],
      totalInputsNeeded: 0,
      currentInputIndex: 0,
      waitingForInput: false,
      isSuccess: false,
      showCelebration: false,
    });

    const startTime = performance.now();

    try {
      // First, check if code needs input by using the legacy /execute endpoint
      const checkResponse = await fetch('http://localhost:8000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.props.pythonCode,
          inputs: [],
        }),
      });

      const checkResult = await checkResponse.json();
      
      // If code needs input, set up interactive input mode
      if (checkResult.needs_input) {
        this.setState({
          waitingForInput: true,
          totalInputsNeeded: checkResult.input_count,
          currentInputIndex: 0,
          output: checkResult.input_prompts?.[0] || '',
          inputPrompts: checkResult.input_prompts || [],
          aiHelper: `💡 Your program needs ${checkResult.input_count} input${checkResult.input_count > 1 ? 's' : ''}. Type your answer and press Enter!`,
        });
        
        setTimeout(() => {
          if (this.inputRef.current) {
            this.inputRef.current.focus();
          }
        }, 100);
      } else {
        const executionTime = performance.now() - startTime;

        this.setState({
          output: checkResult.output || '',
          error: checkResult.error || null,
          executionTime,
          isRunning: false,
          hasError: !!checkResult.error,
          errorLine: checkResult.error_line || null,
        });

        // ALWAYS submit to backend for validation (let backend determine success/failure)
        // Backend uses validation mode logic to properly evaluate objectives
        if (this.props.missionId && !checkResult.error) {
          console.log('📤 Submitting to backend for validation...');
          
          // Show loading message while waiting for AI
          this.setState({
            waitingForSubmission: true,
            aiHelper: '🤖 Analyzing your code and generating feedback...',
            isThinking: true,
          });
          
          try {
            const result = await submitCode({
              missionId: this.props.missionId,
              code: this.props.pythonCode,
              output: checkResult.output || '',
              attempts: 1,
              timeSpent: executionTime / 1000,
            });

            console.log('📥 Backend validation result:', {
              isSuccessful: result.submission?.isSuccessful,
              score: result.submission?.score,
              feedback: result.submission?.feedback
            });

            // Check if mission was successful based on BACKEND validation
            if (result.submission?.isSuccessful) {
              // SUCCESS! 🎉
              console.log('✅ Mission completed successfully!');
              
              // 🏆 Show achievement notifications
              if (result.newAchievements && result.newAchievements.length > 0) {
                console.log('🎉 Achievements unlocked:', result.newAchievements);
                showMultipleAchievements(result.newAchievements);
              }

              // 📈 Log XP and level up
              if (result.xpGained > 0) {
                console.log(`✨ Gained ${result.xpGained} XP!`);
              }
              if (result.leveledUp) {
                console.log('🎊 Level up!');
              }

              this.celebrateMissionComplete();
            } else {
              // Not successful - show AI feedback
              console.log('⚠️ Mission not completed, showing feedback');
              this.setState({ waitingForSubmission: false });
              await this.getSmartAIHelp(checkResult.output, null, 'wrong_output');
            }
          } catch (err) {
            console.error('Error submitting to backend:', err);
            // Fallback: show encouragement
            this.setState({
              waitingForSubmission: false,
              aiHelper: `🤖 Oops! Couldn't connect to the validation server. Your code ran successfully though! ${this.getRandomEncouragement()}`,
              isThinking: false,
            });
          }
        } else if (checkResult.error) {
          // Error - get AI help
          await this.getSmartAIHelp(checkResult.output, checkResult.error, 'error');
        } else if (!this.props.missionId) {
          // Free play mode (no mission) - show encouragement
          this.setState({
            aiHelper: `✨ ${this.getRandomEncouragement()} Your code ran successfully!`,
          });
        }
      }

    } catch (err: any) {
      this.setState({
        error: `Oops! Can't connect to the code runner. ${err.message}`,
        isRunning: false,
        hasError: true,
        aiHelper: "🤖 Don't worry! Let's try running your code again in a moment.",
      });
    }
  }

  private async getSmartAIHelp(output: string, error: string | null, context: 'error' | 'wrong_output') {
    this.setState({ isThinking: true, aiHelper: '🤔 Let me think about this...' });

    // Always use the backend submissions API for AI feedback
    try {
      const result = await submitCode({
        missionId: this.props.missionId || '',
        code: this.props.pythonCode,
        output: output || '',
        attempts: 1,
        timeSpent: this.state.executionTime,
      });

      // 🏆 Show achievement notifications if any were unlocked
      if (result.newAchievements && result.newAchievements.length > 0) {
        console.log('🎉 Achievements unlocked:', result.newAchievements);
        showMultipleAchievements(result.newAchievements);
      }

      // 📈 Log XP and level up
      if (result.xpGained > 0) {
        console.log(`✨ Gained ${result.xpGained} XP!`);
      }
      if (result.leveledUp) {
        console.log('🎊 Level up!');
      }

      let aiResponse = '';

      if (result.aiResult) {
        if (result.aiResult.feedback) {
          aiResponse = result.aiResult.feedback;
        }

        if (result.aiResult.hints && result.aiResult.hints.length > 0) {
          aiResponse += '\n\n💡 Hints:\n';
          result.aiResult.hints.forEach((hint: string) => {
            aiResponse += `  • ${hint}\n`;
          });
        }

        if (result.aiResult.suggestions && result.aiResult.suggestions.length > 0) {
          aiResponse += '\n\n🎯 Suggestions:\n';
          result.aiResult.suggestions.forEach((suggestion: string) => {
            aiResponse += `  • ${suggestion}\n`;
          });
        }
      } else if (result.submission?.feedback) {
        aiResponse = result.submission.feedback;
      }

      // Clean up markdown
      aiResponse = aiResponse.replace(/^#{1,6}\s+/gm, '');
      aiResponse = aiResponse.replace(/```[\w]*\n?/g, '');
      aiResponse = aiResponse.replace(/`([^`]+)`/g, '$1');
      aiResponse = aiResponse.replace(/(\*\*|__)(.*?)\1/g, '$2');
      aiResponse = aiResponse.replace(/(\*|_)(.*?)\1/g, '$2');
      aiResponse = aiResponse.replace(/^\s*[-*+]\s+/gm, '  • ');
      aiResponse = aiResponse.replace(/^[-*_]{3,}$/gm, '');
      aiResponse = aiResponse.replace(/\n{3,}/g, '\n\n');
      aiResponse = aiResponse.replace(/#{1,3}\s*📊\s*Output Comparison[\s\S]*?(?=#{1,3}\s*[🔍💡🌟💪🎯🚀]|$)/gi, '');

      this.setState({
        aiHelper: aiResponse.trim() || this.getRandomEncouragement(),
        isThinking: false,
        waitingForSubmission: false,
        encouragementMessage: this.getRandomEncouragement(),
      });
    } catch (err: any) {
      console.error('Error getting AI help from backend:', err);

      // Final fallback message
      let contextualHelp = '';

      if (context === 'error') {
        contextualHelp = "🐛 I see you have an error! Let's fix it together. Check the line number and read the error message carefully.";
      } else {
        contextualHelp = `🎯 Your output is close, but not quite right!\n\n`;
        contextualHelp += `💡 Look at the comparison on the left to see what's different.\n\n`;
        contextualHelp += `💭 Think about: Are you missing something? Did you print everything you need to? 🤔`;
      }

      this.setState({
        aiHelper: contextualHelp,
        isThinking: false,
        waitingForSubmission: false,
      });
    }
  }

  private celebrateMissionComplete() {
    this.setState({
      isSuccess: true,
      showCelebration: true,
      aiHelper: this.getRandomSuccess(),
    });
  }

  private handleReturnToDashboard = () => {
    if (this.props.onMissionComplete) {
      this.props.onMissionComplete();
    }
    this.close();
  };

  private handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { userInput, collectedInputs, totalInputsNeeded, currentInputIndex, inputPrompts } = this.state;
    
    if (!userInput.trim()) return;
    
    const newCollectedInputs = [...collectedInputs, userInput];
    const newIndex = currentInputIndex + 1;
    
    const currentOutput = this.state.output;
    const inputLine = userInput + '\n';
    const nextPrompt = newIndex < totalInputsNeeded ? (inputPrompts[newIndex] || '') : '';
    
    this.setState({
      collectedInputs: newCollectedInputs,
      currentInputIndex: newIndex,
      userInput: '',
      output: currentOutput + inputLine + nextPrompt,
    });
    
    if (newIndex >= totalInputsNeeded) {
      this.setState({ 
        waitingForInput: false,
        isRunning: true,
        aiHelper: '⚡ Running your code now...',
      });
      
      const startTime = performance.now();
      
      try {
        const response = await fetch('http://localhost:8000/execute', {
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

        // ALWAYS submit to backend for validation (let backend determine success/failure)
        if (this.props.missionId && !result.error) {
          console.log('📤 Submitting to backend for validation (with inputs)...');
          this.setState({ waitingForSubmission: true, isThinking: true });
          try {
            const submitResult = await submitCode({
              missionId: this.props.missionId,
              code: this.props.pythonCode,
              output: result.output || '',
              attempts: 1,
              timeSpent: executionTime / 1000,
            });

            console.log('📥 Backend validation result:', {
              isSuccessful: submitResult.submission?.isSuccessful,
              score: submitResult.submission?.score
            });

            // Check if mission was successful based on BACKEND validation
            if (submitResult.submission?.isSuccessful) {
              console.log('✅ Mission with input completed successfully!');
              
              if (submitResult.newAchievements && submitResult.newAchievements.length > 0) {
                showMultipleAchievements(submitResult.newAchievements);
              }
              if (submitResult.xpGained > 0) {
                console.log(`✨ Gained ${submitResult.xpGained} XP!`);
              }
              
              this.celebrateMissionComplete();
            } else {
              console.log('⚠️ Mission not completed, showing feedback');
              this.setState({ waitingForSubmission: false });
              await this.getSmartAIHelp(result.output, null, 'wrong_output');
            }
          } catch (err) {
            console.error('Error submitting to backend:', err);
            this.setState({
              waitingForSubmission: false,
              aiHelper: `🤖 Couldn't connect to validation server, but your code ran successfully!`,
              isThinking: false,
            });
          }
        } else if (result.error) {
          await this.getSmartAIHelp(result.output, result.error, 'error');
        } else if (!this.props.missionId) {
          this.setState({
            aiHelper: `✨ Great job! Your code ran perfectly!`,
          });
        }

      } catch (err: any) {
        this.setState({
          error: `Connection error: ${err.message}`,
          isRunning: false,
          hasError: true,
          aiHelper: "🤖 Oops! Something went wrong. Let's try again!",
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
      aiHelper, 
      isThinking,
      hasError,
      showCelebration,
      isSuccess,
      encouragementMessage,
    } = this.state;

    if (!visible) return null;

    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-pink-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        {showCelebration && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
          />
        )}
        
        <Card className="w-full max-w-7xl h-[90vh] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/30 shadow-2xl shadow-purple-500/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal className="w-7 h-7 text-green-400" />
                {isRunning && (
                  <div className="absolute -top-1 -right-1">
                    <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Python Console</h2>
                {executionTime > 0 && (
                  <span className="text-xs text-purple-300">
                    ⚡ Ran in {executionTime.toFixed(0)}ms
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => this.close()}
              className="text-purple-300 hover:text-white hover:bg-purple-600/30"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Content - Split View */}
          <div className="flex-1 overflow-hidden flex">
            {/* Console Area (Left) */}
            <div className="flex-1 flex flex-col bg-slate-950/50">
              <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                {isRunning ? (
                  <div className="flex items-center gap-3 text-yellow-400 animate-pulse">
                    <Zap className="w-5 h-5" />
                    <span>Running your amazing code...</span>
                  </div>
                ) : (
                  <>
                    {/* Output */}
                    <pre className="text-green-400 whitespace-pre-wrap break-words">
                      {output}
                    </pre>

                    {/* Error */}
                    {error && (
                      <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Oops! Error Found:</span>
                        </div>
                        <pre className="text-red-300 whitespace-pre-wrap break-words text-xs">
                          {error}
                        </pre>
                      </div>
                    )}

                    {/* Success */}
                    {isSuccess && (
                      <div className="mt-4 p-6 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-400/50 rounded-xl">
                        <div className="flex items-center gap-3 text-green-400 font-bold text-xl mb-4">
                          <Trophy className="w-8 h-8 animate-bounce" />
                          <span>Mission Complete!</span>
                          <PartyPopper className="w-8 h-8 animate-bounce" />
                        </div>
                        <Button
                          onClick={this.handleReturnToDashboard}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all"
                        >
                          🏠 Return to Dashboard
                        </Button>
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
                    placeholder=""
                    className="flex-1 bg-transparent text-green-400 font-mono text-lg outline-none border-none placeholder:text-slate-600"
                    disabled={isRunning && !this.state.waitingForInput}
                  />
                </div>
              </form>
            </div>

            {/* AI Helper Area (Right) */}
            <div className="w-96 border-l border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                  {isThinking && (
                    <div className="absolute inset-0 animate-ping">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">AI Helper</h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isThinking || this.state.waitingForSubmission ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <div className="relative">
                      <Star className="w-12 h-12 text-purple-400 animate-spin" />
                      <Heart className="w-6 h-6 text-pink-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-purple-300 text-center animate-pulse">
                      {this.state.waitingForSubmission ? "Analyzing your code..." : "Thinking..."}
                    </p>
                  </div>
                ) : aiHelper ? (
                  <div className="space-y-4">
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4">
                      <p className="text-white leading-relaxed whitespace-pre-wrap">
                        {aiHelper}
                      </p>
                    </div>

                    {encouragementMessage && !isSuccess && (
                      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl p-4">
                        <p className="text-pink-200 text-sm leading-relaxed">
                          {encouragementMessage}
                        </p>
                      </div>
                    )}

                    {hasError && this.state.errorLine && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-300 text-sm">
                          💡 <strong>Tip:</strong> Check line {this.state.errorLine} in your code!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                    <Sparkles className="w-16 h-16 text-purple-400/50" />
                    <p className="text-purple-300/70">
                      I'm here to help! Run your code and I'll give you tips and encouragement!
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Tips */}
              <div className="mt-4 pt-4 border-t border-purple-500/20">
                <p className="text-purple-300 text-xs flex items-center gap-2">
                  <Heart className="w-3 h-3" />
                  <span>You're doing great! Keep coding! 🚀</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }
}
