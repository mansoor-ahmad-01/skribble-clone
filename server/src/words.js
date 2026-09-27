/** Word list with >100 nouns. */
export const WORDS = [
  'apple', 'bridge', 'cactus', 'dragon', 'elephant',
  'feather', 'guitar', 'hammer', 'igloo', 'jellyfish',
  'kettle', 'lantern', 'mushroom', 'needle', 'octopus',
  'penguin', 'quilt', 'rainbow', 'snowflake', 'telescope',
  'umbrella', 'volcano', 'waterfall', 'xylophone', 'zebra',
  'astronaut', 'balloon', 'castle', 'diamond', 'engine',
  'forest', 'galaxy', 'helicopter', 'island', 'jungle',
  'kangaroo', 'lemon', 'mountain', 'ninja', 'ocean',
  'piano', 'queen', 'rocket', 'submarine', 'tiger',
  'unicorn', 'vampire', 'wizard', 'yacht', 'zombie',
  'anchor', 'bicycle', 'camera', 'dolphin', 'eagle',
  'fire truck', 'glasses', 'house', 'ice cream', 'jacket',
  'kite', 'lion', 'magnet', 'notebook', 'owl',
  'pizza', 'quarter', 'robot', 'snowman', 'tree',
  'unicycle', 'violin', 'whale', 'x-ray', 'yoyo',
  'zeppelin', 'acorn', 'butterfly', 'clock', 'dinosaur',
  'envelope', 'flag', 'globe', 'hospital', 'insect',
  'jigsaw', 'key', 'ladder', 'microscope', 'nest',
  'ostrich', 'parachute', 'quail', 'radio', 'spider',
  'train', 'umpire', 'vacuum', 'window', 'yogurt',
  'zipper', 'airplane', 'beach', 'computer', 'desk'
];

/**
 * Returns n unique words chosen at random from WORDS.
 * Safe to call with n > WORDS.length — silently caps at list size.
 */
export function pickRandomWords(n = 3) {
  const pool = [...WORDS];
  const count = Math.min(n, pool.length);
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
