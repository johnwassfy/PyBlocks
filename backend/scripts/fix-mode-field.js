/**
 * Fix the mode field - it should be 'full', 'restrict', or 'hide', not 'categories'
 * We'll set it based on whether the mission has categories defined
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pyblocks';

async function fixModeField() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all missions
        const missions = await mongoose.connection.db.collection('missions').find({}).toArray();

        console.log(`Found ${missions.length} missions\n`);

        let updatedCount = 0;

        for (const mission of missions) {
            let correctMode = 'full'; // default

            // If the mission has categories defined in toolboxConfig, it should be 'restrict'
            if (mission.toolboxConfig &&
                mission.toolboxConfig.categories &&
                Array.isArray(mission.toolboxConfig.categories) &&
                mission.toolboxConfig.categories.length > 0) {
                correctMode = 'restrict';
            }

            // Update the mode field
            await mongoose.connection.db.collection('missions').updateOne(
                { _id: mission._id },
                { $set: { 'toolboxConfig.mode': correctMode } }
            );

            updatedCount++;

            if (updatedCount <= 5) {
                console.log(`Mission: "${mission.title}"`);
                console.log(`  Mode set to: ${correctMode}`);
                console.log(`  Has categories: ${mission.toolboxConfig?.categories?.length || 0}`);
                console.log();
            }
        }

        console.log(`\n📊 Update Results:`);
        console.log(`   Total missions: ${missions.length}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log('\n✅ Mode field corrected!');
        console.log('   - Missions with categories → mode: "restrict"');
        console.log('   - Missions without categories → mode: "full"');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

fixModeField();
