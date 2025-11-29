/**
 * URGENT: Restore mode field and other toolboxConfig fields
 * This script restores the mode field that was accidentally removed
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pyblocks';

async function restoreModeField() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // First, let's check what fields are missing
        const sampleMission = await mongoose.connection.db.collection('missions').findOne({});
        console.log('Sample mission toolboxConfig:', JSON.stringify(sampleMission.toolboxConfig, null, 2));

        // The mode field should be restored to all missions
        // Based on typical Blockly configurations, the mode is usually "categories"
        const result = await mongoose.connection.db.collection('missions').updateMany(
            {
                'toolboxConfig': { $exists: true },
                'toolboxConfig.mode': { $exists: false } // Only update if mode is missing
            },
            {
                $set: {
                    'toolboxConfig.mode': 'categories' // Restore the mode field
                }
            }
        );

        console.log(`\n📊 Restore Results:`);
        console.log(`   Matched: ${result.matchedCount} missions (missing mode field)`);
        console.log(`   Modified: ${result.modifiedCount} missions`);

        if (result.modifiedCount > 0) {
            console.log('\n✅ Successfully restored mode field!');
        } else {
            console.log('\n⚠️  No missions needed the mode field restored');
        }

        // Verify the fix
        const verifyMission = await mongoose.connection.db.collection('missions').findOne({});
        console.log('\n✅ Verification - Sample mission toolboxConfig after restore:');
        console.log(JSON.stringify(verifyMission.toolboxConfig, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

restoreModeField();
