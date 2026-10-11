import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const suites=['tests/host-bridge.mjs',
  'scenes/riverscape/tests/fish-behavior.mjs',
  'scenes/riverscape/tests/render-policy.mjs',
  'scenes/riverscape/tests/plant-budget.mjs',
  'scenes/reefscape/tests/behavior.mjs',
  'scenes/reefscape/tests/assets.mjs',
  'scenes/reefscape/tests/locomotion.mjs',
  'scenes/reefscape/tests/anemone.mjs',
  'scenes/reefscape/tests/fish-diversity.mjs',
  'scenes/reefscape/tests/fish-motion.mjs',
  'scenes/bettascape/tests/food.mjs'];
for(const suite of suites){
  const result=spawnSync(process.execPath,[suite],{cwd:root,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
console.log(`${suites.length} suites passed.`);
