import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { MissionsService } from '../modules/missions/missions.service';

const sampleMissions = [
  // Beginner Missions
  {
    title: 'Hello World',
    description: 'Print "Hello, World!" to the console',
    starterCode: '# Write your code here\n',
    expectedOutput: 'Hello, World!',
    difficulty: 'easy',
    tags: ['basics', 'print', 'strings'],
    objectives: ['Use the print() function', 'Understand string output'],
    hints: ['Use print() function', 'Put text in quotes'],
    xpReward: 10,
    order: 1,
    estimatedTime: 5,
  },
  {
    title: 'Create a Variable',
    description: 'Create a variable named "age" and assign it your age',
    starterCode: '# Create your variable here\n',
    expectedOutput: '',
    difficulty: 'easy',
    tags: ['basics', 'variables'],
    objectives: ['Understand variables', 'Assign values to variables'],
    hints: ['Use = to assign values', 'Example: name = "John"'],
    xpReward: 10,
    order: 2,
    estimatedTime: 5,
  },
  {
    title: 'Simple Math',
    description: 'Calculate 5 + 3 and print the result',
    starterCode: '# Do the math\n',
    expectedOutput: '8',
    difficulty: 'easy',
    tags: ['basics', 'math', 'operators'],
    objectives: ['Use arithmetic operators', 'Print calculation results'],
    hints: ['Add numbers using +', 'Print the result'],
    xpReward: 10,
    order: 3,
    estimatedTime: 5,
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
    xpReward: 15,
    order: 4,
    estimatedTime: 10,
  },
  {
    title: 'Count to Five',
    description: 'Use a loop to print numbers 1 to 5',
    starterCode: '# Use a for loop here\n',
    expectedOutput: '1\n2\n3\n4\n5',
    difficulty: 'easy',
    tags: ['basics', 'loops', 'for-loops'],
    objectives: ['Use for loops', 'Understand range()'],
    hints: ['Use for i in range(1, 6):', 'Print each number'],
    xpReward: 15,
    order: 5,
    estimatedTime: 10,
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
    xpReward: 15,
    order: 6,
    estimatedTime: 10,
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
    xpReward: 10,
    order: 7,
    estimatedTime: 5,
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
    xpReward: 10,
    order: 8,
    estimatedTime: 8,
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
    xpReward: 15,
    order: 9,
    estimatedTime: 10,
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
    xpReward: 15,
    order: 10,
    estimatedTime: 10,
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
    xpReward: 20,
    order: 11,
    estimatedTime: 15,
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
    xpReward: 20,
    order: 12,
    estimatedTime: 12,
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
    xpReward: 20,
    order: 13,
    estimatedTime: 15,
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
    xpReward: 20,
    order: 14,
    estimatedTime: 15,
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
    xpReward: 20,
    order: 15,
    estimatedTime: 12,
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
      { username: 'student1', password: 'password123', ageRange: '8-10', avatar: '🐱' },
      { username: 'student2', password: 'password123', ageRange: '11-13', avatar: '🐶' },
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
