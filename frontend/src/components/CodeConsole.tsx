'use client';

import { useEffect, useRef, useState } from 'react';

export interface ConsoleOutput {
  type: 'output' | 'error' | 'info' | 'input';
  content: string;
  timestamp?: Date;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  error_line?: number;
  error_type?: string;
  hint?: string;
  execution_time?: number;
  has_test_cases?: boolean;
  test_results?: Array<{
    test_number: number;
    input: string;
    expected: string;
    passed: boolean;
  }>;
}

interface CodeConsoleProps {
  executionResult?: ExecutionResult | null;
  isRunning?: boolean;
  onClear?: () => void;
  expectedOutput?: string;
  showComparison?: boolean;
}

export default function CodeConsole({
  executionResult,
  isRunning = false,
  onClear,
  expectedOutput,
  showComparison = false,
}: CodeConsoleProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [consoleLines, setConsoleLines] = useState<ConsoleOutput[]>([]);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLines]);

  // Update console when execution result changes
  useEffect(() => {
    if (!executionResult) return;

    const newLines: ConsoleOutput[] = [];

    // Add execution start message
    newLines.push({
      type: 'info',
      content: '>>> Running your code...',
      timestamp: new Date(),
    });

    // Add output if available
    if (executionResult.output) {
      const outputLines = executionResult.output.split('\n');
      outputLines.forEach((line) => {
        if (line.trim()) {
          newLines.push({
            type: 'output',
            content: line,
            timestamp: new Date(),
          });
        }
      });
    }

    // Add error if available
    if (!executionResult.success && executionResult.error) {
      newLines.push({
        type: 'error',
        content: `❌ ${executionResult.error_type || 'Error'}${
          executionResult.error_line ? ` on line ${executionResult.error_line}` : ''
        }:`,
        timestamp: new Date(),
      });
      newLines.push({
        type: 'error',
        content: executionResult.error,
        timestamp: new Date(),
      });

      // Add friendly hint
      if (executionResult.hint) {
        newLines.push({
          type: 'info',
          content: `\n💡 Hint: ${executionResult.hint}`,
          timestamp: new Date(),
        });
      }
    }

    // Add execution time
    if (executionResult.execution_time !== undefined) {
      newLines.push({
        type: 'info',
        content: `\n✓ Executed in ${(executionResult.execution_time * 1000).toFixed(0)}ms`,
        timestamp: new Date(),
      });
    }

    setConsoleLines(newLines);
  }, [executionResult]);

  const handleClear = () => {
    setConsoleLines([]);
    if (onClear) onClear();
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-mono text-sm">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="ml-2 text-gray-400 font-semibold">Console</span>
        </div>
        <div className="flex gap-2">
          {isRunning && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-400 border-t-transparent"></div>
              <span className="text-xs">Running...</span>
            </div>
          )}
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Clear console"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Console Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {consoleLines.length === 0 && !isRunning && (
          <div className="text-gray-500 text-center py-8">
            <p>Console is ready! 🚀</p>
            <p className="text-xs mt-2">
              Click the <span className="text-green-400 font-bold">Run</span> button to see your code output here.
            </p>
          </div>
        )}

        {consoleLines.map((line, index) => (
          <div
            key={index}
            className={`leading-relaxed ${
              line.type === 'error'
                ? 'text-red-400'
                : line.type === 'info'
                ? 'text-blue-400'
                : line.type === 'input'
                ? 'text-green-400'
                : 'text-gray-100'
            }`}
          >
            {line.content}
          </div>
        ))}

        <div ref={consoleEndRef} />
      </div>

      {/* Output Comparison (if mission has expected output) */}
      {showComparison && executionResult && expectedOutput && (
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="text-xs text-gray-400 mb-2 font-bold">📊 Output Comparison:</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-400 mb-1 font-semibold">Your Output:</div>
              <div className="bg-gray-900 p-2 rounded max-h-32 overflow-y-auto font-mono">
                {executionResult.output || <span className="text-gray-600">(no output)</span>}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1 font-semibold">Expected Output:</div>
              <div className="bg-gray-900 p-2 rounded max-h-32 overflow-y-auto font-mono">
                {expectedOutput}
              </div>
            </div>
          </div>
          {executionResult.output?.trim() === expectedOutput?.trim() ? (
            <div className="mt-2 text-green-400 text-center font-semibold">
              ✅ Perfect match! Your output is correct!
            </div>
          ) : (
            <div className="mt-2 text-yellow-400 text-center text-xs">
              ⚠️ Your output doesn't match the expected output yet. Keep trying!
            </div>
          )}
        </div>
      )}

      {/* Test Results (if mission has test cases) */}
      {executionResult?.has_test_cases && executionResult.test_results && (
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="text-xs text-gray-400 mb-2 font-bold">🧪 Test Results:</div>
          <div className="space-y-2">
            {executionResult.test_results.map((test, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-xs ${
                  test.passed ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{test.passed ? '✅' : '❌'}</span>
                  <span className="font-semibold">Test {test.test_number}</span>
                </div>
                {!test.passed && (
                  <div className="ml-6 text-gray-400">
                    <div>Input: {test.input || '(none)'}</div>
                    <div>Expected: {test.expected}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
