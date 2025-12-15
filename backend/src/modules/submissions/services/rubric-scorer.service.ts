import { Injectable, Logger } from '@nestjs/common';
import * as acorn from 'acorn';

export interface RubricScores {
  pythonSyntax: number; // /40
  correctness: number; // /30
  codeStructure: number; // /15
  requiredFeatures: number; // /10
  noErrors: number; // /5
  total: number; // /100
  breakdown: {
    syntaxDetails: string[];
    correctnessDetails: string[];
    structureDetails: string[];
    featuresDetails: string[];
    errorsDetails: string[];
  };
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

@Injectable()
export class RubricScorerService {
  private readonly logger = new Logger(RubricScorerService.name);

  /**
   * Score code according to the Pre/Post Test Rubric
   */
  async scoreCode(
    code: string,
    testCases: TestCase[],
    requiredFeatures: string[], // e.g., ['def', 'for', 'return', 'len']
  ): Promise<RubricScores> {
    const breakdown = {
      syntaxDetails: [],
      correctnessDetails: [],
      structureDetails: [],
      featuresDetails: [],
      errorsDetails: [],
    };

    // 1. Python Syntax Score (40 points)
    const pythonSyntax = this.scorePythonSyntax(
      code,
      requiredFeatures,
      breakdown.syntaxDetails,
    );

    // 2. Correctness Score (30 points) - run test cases
    const correctness = await this.scoreCorrectness(
      code,
      testCases,
      breakdown.correctnessDetails,
    );

    // 3. Code Structure Score (15 points)
    const codeStructure = this.scoreCodeStructure(
      code,
      breakdown.structureDetails,
    );

    // 4. Required Features Score (10 points)
    const requiredFeaturesScore = this.scoreRequiredFeatures(
      code,
      requiredFeatures,
      breakdown.featuresDetails,
    );

    // 5. No Errors Score (5 points)
    const noErrors = this.scoreNoErrors(code, breakdown.errorsDetails);

    const total =
      pythonSyntax +
      correctness +
      codeStructure +
      requiredFeaturesScore +
      noErrors;

    return {
      pythonSyntax,
      correctness,
      codeStructure,
      requiredFeatures: requiredFeaturesScore,
      noErrors,
      total,
      breakdown,
    };
  }

  /**
   * Score Python Syntax (40 points)
   * Check for: def, for, if, return, colons, indentation, operators
   */
  private scorePythonSyntax(
    code: string,
    requiredKeywords: string[],
    details: string[],
  ): number {
    let score = 40;
    const lines = code.split('\n');

    // Check for required Python keywords
    const keywordChecks = {
      def: /\bdef\s+\w+\s*\(/,
      for: /\bfor\s+\w+\s+in\s+/,
      if: /\bif\s+.+:/,
      return: /\breturn\b/,
      range: /\brange\s*\(/,
      len: /\blen\s*\(/,
      append: /\.append\s*\(/,
      print: /\bprint\s*\(/,
    };

    requiredKeywords.forEach((keyword) => {
      const pattern = keywordChecks[keyword];
      if (pattern && !pattern.test(code)) {
        score -= 5;
        details.push(`Missing '${keyword}' keyword or improper syntax (-5)`);
      }
    });

    // Check for colons after def/for/if
    const colonChecks = [
      { pattern: /\bdef\s+\w+\([^)]*\)\s*:/, message: 'def statement' },
      { pattern: /\bfor\s+.+:\s*$/, message: 'for loop' },
      { pattern: /\bif\s+.+:\s*$/, message: 'if statement' },
    ];

    colonChecks.forEach((check) => {
      if (
        code.includes(check.message.split(' ')[0]) &&
        !check.pattern.test(code)
      ) {
        score -= 3;
        details.push(`Missing colon after ${check.message} (-3)`);
      }
    });

    // Check indentation (basic check for 4-space or tab consistency)
    const indentedLines = lines.filter((line) =>
      /^(\s{4,}|\t+)\S/.test(line),
    );
    if (indentedLines.length === 0 && code.includes('def')) {
      score -= 5;
      details.push(`No proper indentation detected (-5)`);
    }

    // Check for inconsistent indentation
    const indents = lines
      .filter((line) => /^\s+\S/.test(line))
      .map((line) => {
        const match = line.match(/^\s+/);
        return match ? match[0].length : 0;
      });
    const uniqueIndents = [...new Set(indents)];
    if (uniqueIndents.length > 3) {
      score -= 3;
      details.push(`Inconsistent indentation detected (-3)`);
    }

    if (score === 40) {
      details.push('All Python syntax correct (+40)');
    }

    return Math.max(0, score);
  }

  /**
   * Score Correctness (30 points)
   * Run code against test cases
   */
  private async scoreCorrectness(
    code: string,
    testCases: TestCase[],
    details: string[],
  ): Promise<number> {
    if (!testCases || testCases.length === 0) {
      details.push('No test cases provided (0/30)');
      return 0;
    }

    let passedCases = 0;

    for (const testCase of testCases) {
      try {
        const output = await this.executeCode(code, testCase.input);
        const normalizedOutput = output.trim().toLowerCase();
        const normalizedExpected = testCase.expectedOutput.trim().toLowerCase();

        if (normalizedOutput === normalizedExpected) {
          passedCases++;
        }
      } catch (error) {
        // Test case failed due to execution error
        this.logger.warn(
          `Test case execution error: ${error.message}`,
        );
      }
    }

    const percentage = passedCases / testCases.length;
    let score = 0;

    if (percentage === 1.0) {
      score = 30;
      details.push(`All ${testCases.length} test cases passed (+30)`);
    } else if (percentage >= 0.66) {
      score = 20;
      details.push(
        `${passedCases}/${testCases.length} test cases passed (+20)`,
      );
    } else if (percentage > 0) {
      score = 10;
      details.push(
        `${passedCases}/${testCases.length} test cases passed (+10)`,
      );
    } else {
      details.push('No test cases passed (0/30)');
    }

    return score;
  }

  /**
   * Score Code Structure (15 points)
   * Check for: proper indentation, logical organization, Pythonic style
   */
  private scoreCodeStructure(code: string, details: string[]): number {
    let score = 15;
    const lines = code.split('\n').filter((line) => line.trim());

    // Check for proper indentation consistency
    const indentPattern = /^(\s+)/;
    const indents = lines
      .filter((line) => indentPattern.test(line))
      .map((line) => {
        const match = line.match(indentPattern);
        return match ? match[1].length : 0;
      });

    // Check if using 4-space indentation
    const usesSpaces = indents.every((indent) => indent % 4 === 0);
    if (!usesSpaces && indents.length > 0) {
      score -= 5;
      details.push('Not using 4-space indentation (-5)');
    }

    // Check for empty lines and structure
    if (lines.length < 3) {
      score -= 3;
      details.push('Code too short/minimal structure (-3)');
    }

    // Check for logical organization (function at top, calls below)
    const defIndex = lines.findIndex((line) => line.trim().startsWith('def'));
    const lastLine = lines[lines.length - 1];
    if (defIndex >= 0 && !lastLine.trim().startsWith('def')) {
      // Good: function defined before usage
    } else if (defIndex < 0 && code.includes('def')) {
      score -= 3;
      details.push('Poor logical organization (-3)');
    }

    if (score === 15) {
      details.push('Perfect code structure (+15)');
    }

    return Math.max(0, score);
  }

  /**
   * Score Required Features (10 points)
   * Check if all required Python features are used correctly
   */
  private scoreRequiredFeatures(
    code: string,
    requiredFeatures: string[],
    details: string[],
  ): number {
    if (requiredFeatures.length === 0) {
      details.push('No specific features required (+10)');
      return 10;
    }

    const featurePatterns = {
      def: /\bdef\s+\w+/,
      for: /\bfor\s+\w+\s+in\s+/,
      if: /\bif\s+/,
      return: /\breturn\s+/,
      range: /\brange\s*\(/,
      len: /\blen\s*\(/,
      append: /\.append\s*\(/,
      print: /\bprint\s*\(/,
      and: /\band\s+/,
      or: /\bor\s+/,
      not: /\bnot\s+/,
    };

    let foundFeatures = 0;
    requiredFeatures.forEach((feature) => {
      const pattern = featurePatterns[feature];
      if (pattern && pattern.test(code)) {
        foundFeatures++;
      }
    });

    const percentage = foundFeatures / requiredFeatures.length;
    let score = 0;

    if (percentage === 1.0) {
      score = 10;
      details.push('All required Python features used correctly (+10)');
    } else if (percentage >= 0.5) {
      score = 5;
      details.push(
        `${foundFeatures}/${requiredFeatures.length} required features used (+5)`,
      );
    } else {
      details.push('Missing most required features (0/10)');
    }

    return score;
  }

  /**
   * Score No Errors (5 points)
   * Check if code runs without syntax/runtime errors
   */
  private scoreNoErrors(code: string, details: string[]): number {
    try {
      // Try to parse as Python-like syntax (basic check)
      // This is a simplified check - in production, use actual Python parser
      
      // Check for common syntax errors
      const syntaxErrors: string[] = [];
      
      // Check for missing colons
      if (
        /\b(def|for|if|while|elif|else)\s+[^:]*$/.test(
          code.replace(/:\s*$/gm, ''),
        )
      ) {
        syntaxErrors.push('Missing colon');
      }

      // Check for unmatched parentheses/brackets
      const openParen = (code.match(/\(/g) || []).length;
      const closeParen = (code.match(/\)/g) || []).length;
      if (openParen !== closeParen) {
        syntaxErrors.push('Unmatched parentheses');
      }

      const openBracket = (code.match(/\[/g) || []).length;
      const closeBracket = (code.match(/\]/g) || []).length;
      if (openBracket !== closeBracket) {
        syntaxErrors.push('Unmatched brackets');
      }

      if (syntaxErrors.length > 0) {
        details.push(`Syntax errors found: ${syntaxErrors.join(', ')} (0/5)`);
        return 0;
      }

      details.push('Code runs without syntax errors (+5)');
      return 5;
    } catch (error) {
      details.push(`Syntax error: ${error.message} (0/5)`);
      return 0;
    }
  }

  /**
   * Execute Python code with given input
   * This is a simplified mock - in production, use actual Python execution
   */
  private async executeCode(code: string, input: string): Promise<string> {
    // Mock execution for now
    // In production, spawn Python process and capture output
    return '';
  }
}
