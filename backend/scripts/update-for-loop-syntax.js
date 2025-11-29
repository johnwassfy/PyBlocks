/**
 * Script to update for loop syntax in missions
 * Changes "for ___ in ___:pass" to "for ___ in ___: pass"
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pyblocks';

async function updateMissions() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Use updateMany with aggregation pipeline to update all matching documents
        const result = await mongoose.connection.db.collection('missions').updateMany(
            {
                // Find documents where toolboxConfig contains the old syntax
                'toolboxConfig': { $exists: true }
            },
            [
                {
                    $set: {
                        toolboxConfig: {
                            $cond: {
                                if: { $isArray: '$toolboxConfig.categories' },
                                then: {
                                    categories: {
                                        $map: {
                                            input: '$toolboxConfig.categories',
                                            as: 'category',
                                            in: {
                                                $mergeObjects: [
                                                    '$$category',
                                                    {
                                                        blocks: {
                                                            $cond: {
                                                                if: { $isArray: '$$category.blocks' },
                                                                then: {
                                                                    $map: {
                                                                        input: '$$category.blocks',
                                                                        as: 'block',
                                                                        in: {
                                                                            $cond: {
                                                                                if: { $eq: [{ $type: '$$block' }, 'string'] },
                                                                                then: {
                                                                                    $replaceAll: {
                                                                                        input: '$$block',
                                                                                        find: 'for ___ in ___:pass',
                                                                                        replacement: 'for ___ in ___: pass'
                                                                                    }
                                                                                },
                                                                                else: '$$block'
                                                                            }
                                                                        }
                                                                    }
                                                                },
                                                                else: '$$category.blocks'
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                },
                                else: '$toolboxConfig'
                            }
                        }
                    }
                }
            ]
        );

        console.log(`\n📊 Update Results:`);
        console.log(`   Matched: ${result.matchedCount} missions`);
        console.log(`   Modified: ${result.modifiedCount} missions`);

        if (result.modifiedCount > 0) {
            console.log('\n✅ Successfully updated missions!');
        } else {
            console.log('\n⚠️  No missions were modified (they may already have the correct syntax)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

updateMissions();
