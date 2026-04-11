/**
 * Demo seed script: Creates demo collections and assigns them to the demo user.
 * 
 * Run via: yarn seed:demo
 * 
 * This script:
 * 1. Creates a playground collection (editable in sessions)
 * 2. Creates sample read-only collections with example tokens
 * 3. Assigns all collections to demo@example.com user
 * 
 * Prerequisites:
 * - Demo user (demo@example.com) must exist with role 'Demo'
 * - Super admin must have created the demo user via /org/users
 */

import dbConnect from '../src/lib/mongodb';
import User from '../src/lib/db/models/User';
import CollectionPermission from '../src/lib/db/models/CollectionPermission';

async function seedDemo() {
  await dbConnect();

  // 1. Find demo user
  const demoUser = await User.findOne({ email: 'demo@example.com' });
  if (!demoUser) {
    console.error('❌ Demo user not found. Please create demo@example.com user first via /org/users');
    process.exit(1);
  }
  console.log(`✓ Found demo user: ${demoUser.email} (role: ${demoUser.role})`);

  // 2. Import TokenCollection model
  const { default: TokenCollection } = await import('../src/lib/db/models/TokenCollection');

  // 3. Create or update Playground collection
  let playgroundCollection = await TokenCollection.findOne({ name: 'Playground' });
  if (!playgroundCollection) {
    playgroundCollection = await TokenCollection.create({
      name: 'Playground',
      description: 'Experiment with tokens in this editable playground. Changes are session-based and will reset when you close your browser.',
      tags: ['demo', 'playground'],
      namespace: 'playground',
      colorFormat: 'hex',
      tokens: {},
      isPlayground: true,
      userId: null,
    });
    console.log('✓ Created Playground collection');
  } else {
    await TokenCollection.updateOne(
      { _id: playgroundCollection._id },
      { $set: { isPlayground: true } }
    );
    console.log('✓ Updated Playground collection (marked as playground)');
  }

  // 4. Create sample demo collections
  const demoCollections = [
    {
      name: 'Design System Basics',
      description: 'Fundamental design tokens including colors, spacing, and typography scales.',
      tags: ['demo', 'basics'],
      namespace: 'basics',
      colorFormat: 'hex' as const,
      tokens: {
        'colors': {
          type: 'group' as const,
          children: {
            'primary': {
              type: 'group' as const,
              children: {
                '50': { type: 'color' as const, value: '#eff6ff' },
                '100': { type: 'color' as const, value: '#dbeafe' },
                '200': { type: 'color' as const, value: '#bfdbfe' },
                '300': { type: 'color' as const, value: '#93c5fd' },
                '400': { type: 'color' as const, value: '#60a5fa' },
                '500': { type: 'color' as const, value: '#3b82f6' },
                '600': { type: 'color' as const, value: '#2563eb' },
                '700': { type: 'color' as const, value: '#1d4ed8' },
                '800': { type: 'color' as const, value: '#1e40af' },
                '900': { type: 'color' as const, value: '#1e3a8a' },
              }
            },
            'neutral': {
              type: 'group' as const,
              children: {
                '50': { type: 'color' as const, value: '#f9fafb' },
                '100': { type: 'color' as const, value: '#f3f4f6' },
                '200': { type: 'color' as const, value: '#e5e7eb' },
                '300': { type: 'color' as const, value: '#d1d5db' },
                '400': { type: 'color' as const, value: '#9ca3af' },
                '500': { type: 'color' as const, value: '#6b7280' },
                '600': { type: 'color' as const, value: '#4b5563' },
                '700': { type: 'color' as const, value: '#374151' },
                '800': { type: 'color' as const, value: '#1f2937' },
                '900': { type: 'color' as const, value: '#111827' },
              }
            }
          }
        },
        'spacing': {
          type: 'group' as const,
          children: {
            'xs': { type: 'dimension' as const, value: '4px' },
            'sm': { type: 'dimension' as const, value: '8px' },
            'md': { type: 'dimension' as const, value: '16px' },
            'lg': { type: 'dimension' as const, value: '24px' },
            'xl': { type: 'dimension' as const, value: '32px' },
            '2xl': { type: 'dimension' as const, value: '48px' },
          }
        },
        'typography': {
          type: 'group' as const,
          children: {
            'fontSize': {
              type: 'group' as const,
              children: {
                'xs': { type: 'dimension' as const, value: '12px' },
                'sm': { type: 'dimension' as const, value: '14px' },
                'base': { type: 'dimension' as const, value: '16px' },
                'lg': { type: 'dimension' as const, value: '18px' },
                'xl': { type: 'dimension' as const, value: '20px' },
                '2xl': { type: 'dimension' as const, value: '24px' },
              }
            }
          }
        }
      }
    },
    {
      name: 'Semantic Tokens',
      description: 'Semantic design tokens that reference base tokens for consistent theming.',
      tags: ['demo', 'semantic'],
      namespace: 'semantic',
      colorFormat: 'hex' as const,
      tokens: {
        'button': {
          type: 'group' as const,
          children: {
            'primary': {
              type: 'group' as const,
              children: {
                'background': { type: 'color' as const, value: '{colors.primary.600}' },
                'text': { type: 'color' as const, value: '#ffffff' },
                'border': { type: 'color' as const, value: '{colors.primary.700}' },
              }
            },
            'secondary': {
              type: 'group' as const,
              children: {
                'background': { type: 'color' as const, value: '{colors.neutral.100}' },
                'text': { type: 'color' as const, value: '{colors.neutral.900}' },
                'border': { type: 'color' as const, value: '{colors.neutral.300}' },
              }
            }
          }
        },
        'text': {
          type: 'group' as const,
          children: {
            'heading': { type: 'color' as const, value: '{colors.neutral.900}' },
            'body': { type: 'color' as const, value: '{colors.neutral.700}' },
            'muted': { type: 'color' as const, value: '{colors.neutral.500}' },
          }
        }
      }
    }
  ];

  const createdCollectionIds = [playgroundCollection._id.toString()];

  for (const collectionData of demoCollections) {
    let collection = await TokenCollection.findOne({ name: collectionData.name });
    if (!collection) {
      collection = await TokenCollection.create({
        ...collectionData,
        isPlayground: false,
        userId: null,
      });
      console.log(`✓ Created collection: ${collection.name}`);
    } else {
      console.log(`✓ Collection already exists: ${collection.name}`);
    }
    createdCollectionIds.push(collection._id.toString());
  }

  // 5. Assign all collections to demo user
  console.log('\nAssigning collections to demo user...');
  for (const collectionId of createdCollectionIds) {
    const existingGrant = await CollectionPermission.findOne({
      userId: demoUser._id.toString(),
      collectionId,
    });

    if (!existingGrant) {
      await CollectionPermission.create({
        userId: demoUser._id.toString(),
        collectionId,
        role: 'Editor', // Role is stored but Demo role permissions take precedence
      });
      const collection = await TokenCollection.findById(collectionId);
      console.log(`  ✓ Assigned: ${collection?.name}`);
    } else {
      const collection = await TokenCollection.findById(collectionId);
      console.log(`  ✓ Already assigned: ${collection?.name}`);
    }
  }

  console.log('\n✅ Demo seed complete!');
  console.log('\nDemo collections created:');
  console.log(`  • Playground (editable, session-based)`);
  console.log(`  • Design System Basics (read-only)`);
  console.log(`  • Semantic Tokens (read-only)`);
  console.log('\nDemo user has access to all collections.');
  console.log('Visit your demo site to test!');

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('❌ Demo seed failed:', err);
  process.exit(1);
});
