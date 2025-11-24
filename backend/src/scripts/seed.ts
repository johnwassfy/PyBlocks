import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { MissionsService } from '../modules/missions/missions.service';
import { ToolboxCategoryName } from '../modules/missions/schemas/mission.schema';

const sampleMissions = [
  // Beginner Missions - Step-based examples
  {
    title: 'Hello World',
    description: 'Learn to print messages in Python through progressive steps',
    difficulty: 'easy',
    tags: ['basics', 'print', 'strings'],
    objectives: ['Use the print() function', 'Understand string output'],
    xpReward: 30,
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
    toolboxConfig: {
      mode: 'restrict',
      categories: [
        {
          name: ToolboxCategoryName.OUTPUT_WITH_PLOTTING,
          allowedBlocks: ['print(___)'],
        },
        {
          name: ToolboxCategoryName.VALUES,
          allowedBlocks: ['""', '0', 'True'],
        },
      ],
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
        instructions: 'Store the result of 5 + 3 in a variable called "result" and print it',
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
        hints: ['Parentheses control order of operations', 'Calculate and print'],
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
    toolboxConfig: {
      mode: 'restrict',
      categories: [
        {
          name: ToolboxCategoryName.VARIABLES,
        },
        {
          name: ToolboxCategoryName.OUTPUT_WITH_PLOTTING,
          allowedBlocks: ['print(___)'],
        },
        {
          name: ToolboxCategoryName.CALCULATIONS,
          allowedBlocks: ['___ + ___', 'round(___)'],
        },
        {
          name: ToolboxCategoryName.VALUES,
        },
      ],
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
    toolboxConfig: {
      mode: 'restrict',
      categories: [
        {
          name: ToolboxCategoryName.ITERATION,
          allowedBlocks: ['for ___ in ___:'],
        },
        {
          name: ToolboxCategoryName.LISTS,
          allowedBlocks: ['range(0, 10)'],
        },
        {
          name: ToolboxCategoryName.OUTPUT_WITH_PLOTTING,
          allowedBlocks: ['print(___)'],
        },
        {
          name: ToolboxCategoryName.VALUES,
        },
      ],
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
