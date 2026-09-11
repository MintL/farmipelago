import { createHybridOilPress } from '../world/buildings/oil-press-hybrid.js';
import { createHybridWorkshop } from '../world/buildings/workshop-hybrid.js';
import { createHybridBarn } from '../world/buildings/barn-hybrid.js';
import { createHybridSilo } from '../world/buildings/silo-hybrid.js';
import { createHybridCottage } from '../world/buildings/cottage-hybrid.js';
import { createHybridTrader } from '../world/buildings/trader-hybrid.js';

// Gallery descriptions for the hybrid designs also used by the game.
export const HYBRID_STUDIES = {
  'oil-press': {
    create: createHybridOilPress,
    status: 'Pressing oil',
    caption: 'Golden seed in. Golden oil out.',
    intro: 'A chunky teal press house.\nA screw, a flywheel and a pouring spout.',
    note: 'Stepped voxel architecture with an exposed screw press, seed hopper and oil collection jug.',
    steps: [
      ['Feed the press', 'The yellow hopper supplies the seed basket.'],
      ['Squeeze the seed', 'A turning flywheel and moving platen reveal the pressing mechanism.'],
      ['Collect the oil', 'A short copper spout pours oil straight from the press into the jug.'],
    ],
  },
  workshop: {
    create: createHybridWorkshop,
    status: 'Handling machinery',
    caption: 'Tools ready. Wheel on the hoist.',
    intro: 'Sawtooth skylights. A yellow gantry.\nA proper home for farm machinery.',
    note: 'Voxel workshop and skylights with a traveling wheel hoist, tire stack, vise and tool chest.',
    steps: [
      ['A clear service bay', 'The sawtooth roof brings light into the open workshop.'],
      ['Lift the heavy parts', 'A trolley carries a suspended tractor wheel along the gantry.'],
      ['Ready for repair', 'A vise, hanging tools, hose and rolling chest fill the work area.'],
    ],
  },
  'cattle-barn': {
    create: createHybridBarn,
    status: 'Milking',
    caption: 'Hay in the manger. Milk in the can.',
    intro: 'Red timber and a generous hayloft.\nAn open stall, ready for the herd.',
    note: 'Stepped barn and cupola with hay, milking equipment and a moving weather vane.',
    steps: [
      ['Shelter the herd', 'Red timber, a hayloft and an open stall identify the cattle barn.'],
      ['Keep the manger stocked', 'Loose hay, a rolled bale and a fork show the feeding routine.'],
      ['Collect the milk', 'The milking stand fills a bright can while the weather vane turns gently.'],
    ],
  },
  silo: {
    create: createHybridSilo,
    status: 'Moving grain',
    caption: 'Store the harvest. Load the next delivery.',
    intro: 'A tall stepped grain store.\nA busy yellow elevator along its side.',
    note: 'Voxel silo shell and cap with moving elevator buckets, fine handrails and an unloading spout.',
    steps: [
      ['Receive the grain', 'A yellow hopper feeds the elevator at ground level.'],
      ['Lift it into storage', 'Grain buckets travel up the open elevator channel.'],
      ['Unload when needed', 'The discharge spout pours grain into a receiving crate.'],
    ],
  },
  'home-blue': {
    create: () => createHybridCottage('blue'),
    status: 'Village life',
    caption: 'Bluebells on the sill. A warm light at home.',
    intro: 'A steep blue roof and an attic window.\nA small garden tended by hand.',
    note: 'Voxel cottage and dormer with fine window trim, bluebell pots, rain barrel and watering can.',
    steps: [
      ['A familiar home', 'Stepped roof, deep doorway and glowing evening windows.'],
      ['A cared-for garden', 'Bluebells, a rain barrel and a watering can add domestic detail.'],
      ['A little life', 'The shutter moves gently and chimney smoke drifts into the breeze.'],
    ],
  },
  'home-red': {
    create: () => createHybridCottage('red'),
    status: 'Village life',
    caption: 'A quiet porch at the end of the day.',
    intro: 'A low red roof. A sheltered veranda.\nFlowers, laundry and a rocking chair.',
    note: 'Voxel cottage and porch with a rocking chair, flowering pots, laundry and warm lantern.',
    steps: [
      ['Shelter the porch', 'The wide stepped roof shades an open timber veranda.'],
      ['Make a place to rest', 'A rocking chair, a small table and a cup suggest everyday life.'],
      ['Catch the breeze', 'Laundry and shutters stir while a thin chimney plume rises.'],
    ],
  },
  'old-miller': {
    create: () => createHybridTrader('old-miller'),
    status: 'Weighing flour',
    caption: 'Flour by the sack, weighed at the counter.',
    intro: 'A red-striped market canopy.\nFlour sacks and a brass balance.',
    note: 'Voxel stall and stepped striped canopy with detailed flour sacks, scoop and moving balance.',
    steps: [
      ['Spot the flour stall', 'A wheat shield and rows of cream sacks identify the merchant.'],
      ['Weigh the goods', 'A suspended balance gently tips with a sack in its pan.'],
      ['Ready to trade', 'Counter stock and a swinging sign keep the stall readable at a glance.'],
    ],
  },
  'oil-trader': {
    create: () => createHybridTrader('oil-trader'),
    status: 'Measuring oil',
    caption: 'Cans on the shelf. Oil at the pump.',
    intro: 'A teal-striped trader’s stall.\nA copper barrel and a measuring jug.',
    note: 'Voxel market stall with handled oil cans, a copper reserve barrel and animated counter pump.',
    steps: [
      ['Find the oil merchant', 'The oil-drop sign and golden cans make the product unmistakable.'],
      ['Measure a portion', 'A moving pump handle feeds oil into the counter jug.'],
      ['Collect the goods', 'Filled cans and side stock wait beneath the striped canopy.'],
    ],
  },
};
