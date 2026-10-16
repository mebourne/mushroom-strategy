import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collect, entity, generate } from './helpers/strategy.mjs';

const entities = [entity('light.kitchen', 'kitchen')];
const options = {
  views: { light: { theme: 'view-theme' } },
  card_options: { 'light.kitchen': { theme: 'card-theme' } },
  extra_views: [{ title: 'Extra', path: 'extra', cards: [], theme: 'extra-theme' }],
};

test('a strategy theme overrides generated, extra and area view themes', async () => {
  const { dashboard, areaView } = await generate({ entities, options, theme: 'strategy-theme' });
  assert.ok(dashboard.views.some((view) => view.path === 'lights'));
  assert.ok(dashboard.views.some((view) => view.path === 'extra'));
  assert.ok(dashboard.views.some((view) => view.subview));
  assert.ok(dashboard.views.every((view) => view.theme === 'strategy-theme'));
  for (const descriptor of dashboard.views.filter((view) => view.subview)) {
    assert.equal((await areaView(descriptor)).theme, 'strategy-theme');
  }
  const kitchen = await areaView(dashboard.views.find((view) => view.path === 'kitchen'));
  assert.equal(collect(kitchen, (card) => card.entity === 'light.kitchen')[0].theme, 'card-theme');
  assert.equal(collect(dashboard, (card) => card.entity === 'light.kitchen')[0].theme, 'card-theme');
});

test('an absent or empty strategy theme preserves per-view themes and Home Assistant defaults', async () => {
  for (const theme of [undefined, '']) {
    const { dashboard, areaView } = await generate({ entities, options, theme });
    assert.equal(dashboard.views.find((view) => view.path === 'lights').theme, 'view-theme');
    assert.equal(dashboard.views.find((view) => view.path === 'extra').theme, 'extra-theme');
    assert.equal(dashboard.views.find((view) => view.path === 'home').theme, undefined);
    assert.ok(dashboard.views.filter((view) => view.subview).every((view) => view.theme === undefined));
    for (const descriptor of dashboard.views.filter((view) => view.subview)) {
      assert.ok(!Object.hasOwn(await areaView(descriptor), 'theme'));
    }
    const kitchen = await areaView(dashboard.views.find((view) => view.path === 'kitchen'));
    assert.equal(collect(kitchen, (card) => card.entity === 'light.kitchen')[0].theme, 'card-theme');
  }
});
