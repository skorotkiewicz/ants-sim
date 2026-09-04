// ==========================================
// THE SIMS 2: ANT COLONY OBJECT CATALOG
// Buy Mode Furniture & Amenities
// ==========================================

import { ObjectCatalogItem } from './types';

export const CATALOG: ObjectCatalogItem[] = [
  // COMFORT
  {
    type: 'leaf_hammock',
    name: 'Suspended Leaf Hammock',
    category: 'Comfort',
    cost: 45,
    description: 'A cozy suspended cradle made of cured dandelion leaf. Great for mid-shift naps.',
    icon: '🍃',
    width: 2,
    height: 1,
    motiveEffects: { energy: 12, fun: 2 },
  },
  {
    type: 'moss_mattress',
    name: 'Sphagnum Moss Bed',
    category: 'Comfort',
    cost: 85,
    description: 'Thick velvety moss imported from the forest floor. Premium rest for weary mandibles.',
    icon: '🛏️',
    width: 2,
    height: 1,
    motiveEffects: { energy: 20, grooming: 4 },
  },
  {
    type: 'royal_petal_cushion',
    name: 'Rose Petal Divan',
    category: 'Comfort',
    cost: 220,
    description: 'A decadent couch of crushed fragrant crimson rose petals. Fit for an Empress.',
    icon: '🌹',
    width: 2,
    height: 1,
    motiveEffects: { energy: 25, colonyDuty: 10, fun: 8 },
  },

  // FOOD & FARMING
  {
    type: 'sugar_pantry',
    name: 'Colony Sugar Basin',
    category: 'Food',
    cost: 60,
    description: 'Stores gathered sugar crumbs and melon chunks. Hungry ants can eat autonomously.',
    icon: '🍯',
    width: 2,
    height: 1,
    motiveEffects: { hunger: 25 },
  },
  {
    type: 'fungus_garden',
    name: 'Leafcutter Fungus Incubator',
    category: 'Food',
    cost: 130,
    description: 'Nurtures symbiotic mushroom mycelium. Constantly produces nutritious fungal mash.',
    icon: '🍄',
    width: 3,
    height: 2,
    motiveEffects: { hunger: 30, colonyDuty: 5 },
  },
  {
    type: 'aphid_pen',
    name: 'Domesticated Aphid Corral',
    category: 'Food',
    cost: 180,
    description: 'Tamed aphids that produce sweet honeydew when milked. Boosts both Food and Fun.',
    icon: '🐛',
    width: 3,
    height: 2,
    motiveEffects: { hunger: 20, fun: 15 },
  },

  // FUN & RECREATION
  {
    type: 'spore_radio',
    name: '"Retro-Spore" Colony Radio',
    category: 'Fun',
    cost: 160,
    description: 'Vibrates soothing chittering jazz through the tunnels. Ants will spontaneously dance!',
    icon: '📻',
    width: 2,
    height: 1,
    motiveEffects: { fun: 25, social: 12 },
  },
  {
    type: 'pebble_table',
    name: 'Pebble Bowling & Games',
    category: 'Fun',
    cost: 95,
    description: 'Ants roll polished river pebbles at dried acorn caps. High social interaction.',
    icon: '🎯',
    width: 2,
    height: 1,
    motiveEffects: { fun: 20, social: 18 },
  },
  {
    type: 'dewdrop_mirror',
    name: 'Grooming Dewdrop Vanity',
    category: 'Fun',
    cost: 75,
    description: 'A spherical dewdrop for inspecting chitin shine and practicing mandible charisma.',
    icon: '🪞',
    width: 1,
    height: 2,
    motiveEffects: { grooming: 25, fun: 8 },
  },

  // DECOR & LIGHTING
  {
    type: 'biolum_shroom',
    name: 'Bioluminescent Spore Lantern',
    category: 'Decor',
    cost: 40,
    description: 'Glows with a warm, serene fungal light. Brightens gloomy tunnels.',
    icon: '💡',
    width: 1,
    height: 1,
    motiveEffects: { colonyDuty: 5 },
  },
  {
    type: 'snail_shell_arch',
    name: 'Spiral Snail Shell Gate',
    category: 'Decor',
    cost: 140,
    description: 'A weathered garden snail shell sculpted into a magnificent triumphal archway.',
    icon: '🐚',
    width: 3,
    height: 2,
    motiveEffects: { colonyDuty: 15 },
  },

  // QUEEN & ROYALTY
  {
    type: 'queen_throne',
    name: 'Imperial Anthill Throne',
    category: 'Queen',
    cost: 450,
    description: 'Carved from petrified sap and encrusted with quartz dust. The seat of the Matriarch.',
    icon: '👑',
    width: 3,
    height: 2,
    motiveEffects: { colonyDuty: 35, social: 15 },
  },
];
