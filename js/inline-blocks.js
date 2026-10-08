// Lesson prose writes blocks and names between backticks in plain words
// (`set Lives to 3`, `repeat until`, `Aliens Left`). That is not scratchblocks
// syntax, so inline items are shown as chips coloured by the Scratch category
// where a learner finds them. Finished code keeps the full block drawings.

export const CATEGORY_LABELS = {
  motion: 'Motion',
  looks: 'Looks',
  sound: 'Sound',
  events: 'Events',
  control: 'Control',
  sensing: 'Sensing',
  operators: 'Operators',
  variables: 'Variables',
  'my-blocks': 'My Blocks',
};

const FIRST_WORDS = [
  ['control', /^when i start as a clone\b/],
  ['events', /^(when\b|broadcast\b)/],
  ['motion', /^if on edge\b/],
  ['control', /^(if|else|repeat|forever|wait|create clone|delete this clone|stop)\b/],
  ['operators', /\s[=<>+*]\s|\s-\s|\s(and|or)\s|^(not|pick random|join|mod|round)\b|^(and|or|not|[-+*=<>])$/],
  ['motion', /^(go to|move|glide|point|turn|change [xy]\b|set [xy]\b|x position|y position|direction|set rotation)/],
  ['looks', /^(show|hide|switch (costume|backdrop)|say|think|set size|change size|size\b|next costume|costume (name|number)|go to front)/],
  ['sound', /^(play sound|start sound|stop all sounds)/],
  ['sensing', /^(touching|key |mouse|ask|answer|timer|distance)/],
  ['variables', /^(set|change|add|delete|replace item|item|length of|show variable|hide variable)\b/],
];

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Names a lesson defines in its finished code: My Blocks, variables, and lists.
export const collectLessonNames = (lesson) => {
  const myBlocks = new Set();
  const variables = new Set();
  for (const step of lesson.chapters.flatMap((chapter) => chapter.steps)) {
    for (const { code } of step.finishedCode ?? []) {
      for (const [, name] of code.matchAll(/^\s*define ([^(\n]+?)\s*(?:\(|$)/gm)) myBlocks.add(name.trim());
      for (const [, name] of code.matchAll(/\b(?:set|change) \[([^\]\n]+?) v\] (?:to|by)/g)) variables.add(name);
      for (const line of code.split('\n')) {
        if (!/\b(add .* to|delete all of|replace item|item .* of|length of)\s*\[/.test(line)) continue;
        for (const [, name] of line.matchAll(/\b(?:to|of) \[([^\]]+?) v\]/g)) variables.add(name);
      }
    }
  }
  return { myBlocks, variables };
};

export const inlineCategory = (source, names = { myBlocks: new Set(), variables: new Set() }) => {
  const text = source.trim();
  const lower = text.toLowerCase();
  if (lower.startsWith('define ')) return 'my-blocks';
  for (const name of names.myBlocks) {
    if (new RegExp(`^${escape(name.toLowerCase())}\\b`).test(lower)) return 'my-blocks';
  }
  for (const [category, pattern] of FIRST_WORDS) {
    if (pattern.test(lower)) return category;
  }
  if (names.variables.has(text)) return 'variables';
  return null;
};
