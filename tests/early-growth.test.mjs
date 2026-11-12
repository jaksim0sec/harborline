import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, hydrate, canExpandCoast, expandCoast, nextStep, SAVE_KEY} from '../src/model.js';

test('two deliveries and enough resources foreground the existing coastal growth goal', () => {
 const game=createGame();game.completed=2;game.resources.grain=50;
 const before=structuredClone(game);
 assert.equal(canExpandCoast(game).ok,true);
 const step=nextStep(game);
 assert.equal(step.action,'expand','a ready delivery should not bury available land growth');
 assert.match(step.message,/180/);assert.match(step.message,/8/);assert.match(step.message,/12/);
 assert.deepEqual(game,before,'a recommendation must never mutate saved game data');
});
test('insufficient expansion funds keep ordinary deliverable work actionable',()=>{
 const game=createGame();game.completed=2;game.resources.wood=7;game.resources.grain=50;
 assert.equal(canExpandCoast(game).ok,false);
 assert.equal(nextStep(game).action,'deliver');
});
test('expanding once returns the guidance to the existing delivery loop',()=>{
 const game=createGame();game.completed=2;game.resources.grain=50;
 assert.equal(expandCoast(game).ok,true);
 assert.equal(game.coastExpanded,true);
 assert.equal(nextStep(game).action,'deliver');
 assert.equal(canExpandCoast(game).ok,false);
});
test('legacy v1 save and current save remain valid with derived growth guidance',()=>{
 const game=createGame();game.completed=2;game.resources.grain=50;
 assert.equal(SAVE_KEY,'harborline.save.v1');
 const restored=hydrate(JSON.parse(JSON.stringify(game)));
 assert.equal(nextStep(restored).action,'expand');
 assert.equal(restored.coastExpanded,false);
});
