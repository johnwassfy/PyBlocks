import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { MissionsService } from '../modules/missions/missions.service';

const sampleMissions = [
  // Beginner Missions - Step-based examples
  {
    title: 'Hello World',
    description: 'Learn to print messages in Python through progressive steps',
    difficulty: 'easy',
    tags: ['basics', 'print', 'strings'],
    objectives: ['Use the print() function', 'Understand string output'],
    xpReward: 30, // Total XP for all steps
    order: 1,
    estimatedTime: 15,
    steps: [
      {
        title: 'Print a Simple Message',
        instructions: 'Use the print() function to display "Hello"',
        starterCode: '# Write your code here\n',
        expectedOutput: 'Hello',
        concepts: ['print', 'strings'],
        hints: ['Use print() function', 'Put text in quotes'],
        aiCheckpoints: true,
        xpReward: 10,
      },
      {
        title: 'Print with Exclamation',
        instructions: 'Now print "Hello!" with an exclamation mark',
        starterCode: '# Add an exclamation mark\n',
        expectedOutput: 'Hello!',
        concepts: ['print', 'strings'],
        hints: ['Include the ! inside the quotes'],
        aiCheckpoints: true,
        xpReward: 10,
      },
      {
        title: 'Complete Hello World',
        instructions: 'Print the complete message: "Hello, World!"',
        starterCode: '# Print the full message\n',
        expectedOutput: 'Hello, World!',
        concepts: ['print', 'strings'],
        hints: ['Include comma and space: ", "'],
        aiCheckpoints: true,
        xpReward: 10,
      },
    ],
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['print'],
    },
    config: {
      allowSkipSteps: false,
    },
  },
  {
    title: 'Simple Math',
    description: 'Learn arithmetic operations step by step',
    difficulty: 'easy',
    tags: ['basics', 'math', 'operators'],
    objectives: ['Use arithmetic operators', 'Print calculation results'],
    xpReward: 30,
    order: 3,
    estimatedTime: 15,
    concepts: ['math', 'operators', 'variables'],
    steps: [
      {
        title: 'Add Two Numbers',
        instructions: 'Calculate 5 + 3 and print the result',
        starterCode: '# Do the addition\n',
        expectedOutput: '8',
        concepts: ['math', 'operators'],
        hints: ['Add numbers using +', 'Print the result'],
        aiCheckpoints: true,
        xpReward: 10,
      },
      {
        title: 'Use a Variable',
        instructions:
          'Store the result of 5 + 3 in a variable called "result" and print it',
        starterCode: '# Create a variable and store the sum\n',
        expectedOutput: '8',
        concepts: ['math', 'operators', 'variables'],
        hints: ['Use = to assign: result = 5 + 3', 'Then print the variable'],
        aiCheckpoints: true,
        xpReward: 10,
      },
      {
        title: 'Multiple Operations',
        instructions: 'Calculate (10 + 5) - 7 and print the result',
        starterCode: '# Use parentheses for order\n',
        expectedOutput: '8',
        concepts: ['math', 'operators'],
        hints: [
          'Parentheses control order of operations',
          'Calculate and print',
        ],
        aiCheckpoints: true,
        xpReward: 10,
      },
    ],
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['math', 'operators'],
    },
    config: {
      allowSkipSteps: false,
    },
  },
  {
    title: 'Count to Five',
    description: 'Master loops by counting from 1 to 5',
    difficulty: 'easy',
    tags: ['basics', 'loops', 'for-loops'],
    objectives: ['Use for loops', 'Understand range()'],
    xpReward: 45,
    order: 5,
    estimatedTime: 20,
    concepts: ['for-loop', 'range'],
    steps: [
      {
        title: 'Print Numbers 1 to 3',
        instructions: 'Use a for loop to print numbers 1, 2, 3',
        starterCode: '# Use for i in range():\n',
        expectedOutput: '1\n2\n3',
        concepts: ['for-loop', 'range'],
        hints: ['Use for i in range(1, 4):', 'Remember to print i'],
        aiCheckpoints: true,
        xpReward: 15,
      },
      {
        title: 'Count to Five',
        instructions: 'Extend your loop to print 1 through 5',
        starterCode: '# Modify the range\n',
        expectedOutput: '1\n2\n3\n4\n5',
        concepts: ['for-loop', 'range'],
        hints: ['Use range(1, 6)', 'The end value is exclusive'],
        aiCheckpoints: true,
        xpReward: 15,
      },
      {
        title: 'Add a Message',
        instructions: 'Print "Number: " before each number (e.g., "Number: 1")',
        starterCode: '# Use string concatenation or f-strings\n',
        expectedOutput: 'Number: 1\nNumber: 2\nNumber: 3\nNumber: 4\nNumber: 5',
        concepts: ['for-loop', 'range', 'strings'],
        hints: ['Use f"Number: {i}" or "Number: " + str(i)'],
        aiCheckpoints: true,
        xpReward: 15,
      },
    ],
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['for-loop', 'range'],
    },
    config: {
      allowSkipSteps: false,
    },
  },

  // Traditional missions (backward compatibility)
  {
    title: 'Create a Variable',
    description: 'Create a variable named "age" and assign it your age',
    starterCode: '# Create your variable here\n',
    expectedOutput: '',
    difficulty: 'easy',
    tags: ['basics', 'variables'],
    objectives: ['Understand variables', 'Assign values to variables'],
    hints: ['Use = to assign values', 'Example: name = "John"'],
    concepts: ['variables'],
    xpReward: 10,
    order: 2,
    estimatedTime: 5,
    validationRules: {
      requiredConcepts: ['variables'],
    },
  },
  {
    title: 'Make a Decision',
    description: 'Check if a number is greater than 10',
    starterCode: 'number = 15\n# Add your if statement here\n',
    expectedOutput: 'Greater than 10',
    difficulty: 'easy',
    tags: ['basics', 'conditions', 'if-statements'],
    objectives: ['Use if statements', 'Compare numbers'],
    hints: ['Use if number > 10:', 'Remember to indent'],
    concepts: ['conditionals', 'comparison'],
    xpReward: 15,
    order: 4,
    estimatedTime: 10,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['conditionals'],
    },
  },
  {
    title: 'Even or Odd',
    description: 'Check if a number is even or odd',
    starterCode: 'number = 7\n# Check if even or odd\n',
    expectedOutput: 'Odd',
    difficulty: 'easy',
    tags: ['basics', 'conditions', 'modulo'],
    objectives: ['Use modulo operator', 'Use if-else statements'],
    hints: ['Use % (modulo) operator', 'If number % 2 == 0, it is even'],
    concepts: ['conditionals', 'modulo', 'variables'],
    xpReward: 15,
    order: 6,
    estimatedTime: 10,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['conditionals', 'modulo'],
    },
  },
  {
    title: 'Sum of Two Numbers',
    description: 'Create a program that adds two numbers',
    starterCode: 'a = 10\nb = 20\n# Calculate the sum\n',
    expectedOutput: '30',
    difficulty: 'easy',
    tags: ['basics', 'variables', 'math'],
    objectives: ['Use variables', 'Perform addition', 'Print results'],
    hints: ['Add a and b', 'Store in a variable', 'Print the result'],
    concepts: ['variables', 'math', 'operators'],
    xpReward: 10,
    order: 7,
    estimatedTime: 5,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['variables', 'math'],
    },
  },
  {
    title: 'Greeting Message',
    description: 'Create a personalized greeting',
    starterCode: 'name = "Student"\n# Create a greeting\n',
    expectedOutput: 'Hello, Student!',
    difficulty: 'easy',
    tags: ['basics', 'strings', 'concatenation'],
    objectives: ['Concatenate strings', 'Use variables in strings'],
    hints: ['Use + to join strings', 'Or use f-strings: f"Hello, {name}!"'],
    concepts: ['strings', 'variables', 'concatenation'],
    xpReward: 10,
    order: 8,
    estimatedTime: 8,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['strings', 'variables'],
    },
  },
  {
    title: 'Max of Two Numbers',
    description: 'Find the maximum of two numbers',
    starterCode: 'a = 25\nb = 30\n# Find the maximum\n',
    expectedOutput: '30',
    difficulty: 'easy',
    tags: ['basics', 'conditions', 'comparison'],
    objectives: ['Compare two numbers', 'Use if-else statements'],
    hints: ['Use if a > b:', 'Print the larger number'],
    concepts: ['conditionals', 'comparison', 'variables'],
    xpReward: 15,
    order: 9,
    estimatedTime: 10,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['conditionals', 'comparison'],
    },
  },
  {
    title: 'Countdown Timer',
    description: 'Create a countdown from 5 to 1',
    starterCode: '# Create a countdown\n',
    expectedOutput: '5\n4\n3\n2\n1',
    difficulty: 'easy',
    tags: ['basics', 'loops', 'range'],
    objectives: ['Use range() with reverse order', 'Use for loops'],
    hints: ['Use range(5, 0, -1)', 'The third parameter is the step'],
    concepts: ['for-loop', 'range'],
    xpReward: 15,
    order: 10,
    estimatedTime: 10,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['for-loop', 'range'],
    },
  },

  // Intermediate Missions
  {
    title: 'Create a Function',
    description: 'Create a function that returns the square of a number',
    starterCode: '# Define your function here\ndef square(n):\n    pass\n',
    expectedOutput: '',
    difficulty: 'medium',
    tags: ['functions', 'math', 'return'],
    objectives: ['Define functions', 'Use return statement', 'Call functions'],
    hints: ['Multiply n by n', 'Use return keyword'],
    concepts: ['functions', 'return', 'math'],
    xpReward: 20,
    order: 11,
    estimatedTime: 15,
    validationRules: {
      requiredConcepts: ['functions', 'return'],
    },
  },
  {
    title: 'List Operations',
    description: 'Create a list and add an element to it',
    starterCode: 'fruits = ["apple", "banana"]\n# Add "orange" to the list\n',
    expectedOutput: "['apple', 'banana', 'orange']",
    difficulty: 'medium',
    tags: ['lists', 'data-structures'],
    objectives: ['Create lists', 'Use append() method', 'Print lists'],
    hints: ['Use .append() method', 'Print the updated list'],
    concepts: ['lists', 'methods'],
    xpReward: 20,
    order: 12,
    estimatedTime: 12,
    validationRules: {
      requiredConcepts: ['lists'],
    },
  },
  {
    title: 'Sum a List',
    description: 'Calculate the sum of all numbers in a list',
    starterCode: 'numbers = [1, 2, 3, 4, 5]\n# Calculate the sum\n',
    expectedOutput: '15',
    difficulty: 'medium',
    tags: ['lists', 'loops', 'math'],
    objectives: ['Iterate through lists', 'Calculate sum', 'Use loops'],
    hints: ['Use a for loop', 'Keep a running total', 'Or use sum() function'],
    concepts: ['lists', 'for-loop', 'math'],
    xpReward: 20,
    order: 13,
    estimatedTime: 15,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['lists', 'for-loop'],
    },
  },
  {
    title: 'Find the Largest',
    description: 'Find the largest number in a list',
    starterCode: 'numbers = [23, 45, 12, 67, 34]\n# Find the largest\n',
    expectedOutput: '67',
    difficulty: 'medium',
    tags: ['lists', 'loops', 'max'],
    objectives: ['Iterate through lists', 'Compare values', 'Track maximum'],
    hints: [
      'Keep track of the largest so far',
      'Compare each number',
      'Or use max() function',
    ],
    concepts: ['lists', 'for-loop', 'comparison'],
    xpReward: 20,
    order: 14,
    estimatedTime: 15,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['lists'],
    },
  },
  {
    title: 'Reverse a String',
    description: 'Reverse the order of characters in a string',
    starterCode: 'text = "hello"\n# Reverse the string\n',
    expectedOutput: 'olleh',
    difficulty: 'medium',
    tags: ['strings', 'slicing'],
    objectives: ['Use string slicing', 'Understand negative indices'],
    hints: ['Use [::-1] for reversal', 'This is called string slicing'],
    concepts: ['strings', 'slicing'],
    xpReward: 20,
    order: 15,
    estimatedTime: 12,
    validationRules: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['strings', 'slicing'],
    },
  },
];

async function seed() {
  console.log('🌱 Starting database seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const missionsService = app.get(MissionsService);

  try {
    // Create sample missions
    console.log('📚 Creating sample missions...');
    let missionCount = 0;
    for (const mission of sampleMissions) {
      try {
        await missionsService.create(mission);
        missionCount++;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Mission might already exist, skip
      }
    }
    console.log(`✅ Created ${missionCount} missions`);

    // Create sample users
    console.log('👤 Creating sample users...');
    const sampleUsers = [
      { username: 'demo', password: 'demo123', ageRange: '14+', avatar: '🦊' },
    ];

    let userCount = 0;
    for (const user of sampleUsers) {
      try {
        await usersService.create(user);
        userCount++;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // User might already exist, skip
      }
    }
    console.log(`✅ Created ${userCount} users`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Credentials:');
    console.log('   Username: demo');
    console.log('   Password: demo123');
    console.log('\n🚀 You can now start the backend with: npm run start:dev');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await app.close();
  }
}

void seed();
