import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collect, entity, generate } from './helpers/strategy.mjs';

const labelled = (id, area, overrides) => entity(id, area, { labels: ['dashboard'], ...overrides });
const entities = [
  labelled('light.kitchen', 'kitchen', { device_id: 'bedroom-device', labels: ['other', 'dashboard'] }),
  labelled('light.device_area', null, { device_id: 'bedroom-device' }),
  labelled('light.unassigned', null),
  entity('light.no_label', 'garage', { device_id: 'bedroom-device' }),
  entity('light.similar_label', 'garage', { labels: ['dashboard_other'] }),
  labelled('light.garage_hidden', 'garage', { hidden_by: 'user' }),
  labelled('light.hidden', 'kitchen', { hidden_by: 'user' }),
  labelled('light.disabled', 'kitchen', { disabled_by: 'user' }),
  labelled('light.diagnostic', 'kitchen', { entity_category: 'diagnostic' }),
  labelled('light.config', 'kitchen', { entity_category: 'config' }),
  labelled('light.custom_hidden', 'kitchen'),
];
const devices = [{ id: 'bedroom-device', area_id: 'bedroom', disabled_by: null, labels: ['dashboard'] }];
const options = { card_options: { 'light.custom_hidden': { hidden: true } } };
const areaPaths = (dashboard) =>
  dashboard.views
    .filter((view) => view.subview)
    .map((view) => view.path)
    .sort();
const homePaths = (dashboard) =>
  [
    ...new Set(
      collect(
        dashboard.views.find((view) => view.path === 'home'),
        (card) => card.tap_action?.action === 'navigate'
      ).map((card) => card.tap_action.navigation_path)
    ),
  ].sort();

test('label filtering matches entity label IDs exactly, retaining existing exclusions and area inheritance', async () => {
  const { dashboard, areaView } = await generate({
    entities,
    devices,
    options: {
      ...options,
      filter_label: 'dashboard',
      areas: { garage: { extra_cards: [{ type: 'markdown', content: 'Hidden with area' }] } },
    },
  });
  assert.deepEqual(areaPaths(dashboard), ['bedroom', 'kitchen', 'undisclosed']);
  assert.deepEqual(homePaths(dashboard), ['bedroom', 'kitchen', 'undisclosed']);
  const lights = dashboard.views.find((view) => view.path === 'lights');
  assert.deepEqual(
    collect(lights, (card) => card.type === 'custom:mushroom-light-card')
      .map((card) => card.entity)
      .sort(),
    ['light.device_area', 'light.kitchen', 'light.unassigned']
  );
  const kitchen = await areaView(dashboard.views.find((view) => view.path === 'kitchen'));
  assert.deepEqual(
    collect(kitchen, (card) => typeof card.entity === 'string').map((card) => card.entity),
    ['light.kitchen']
  );
  const templates = collect(lights, (card) => typeof card.subtitle === 'string')
    .map((card) => card.subtitle)
    .join();
  assert.deepEqual([...new Set(templates.match(/light\.[a-z_]+/g))].sort(), [
    'light.device_area',
    'light.kitchen',
    'light.unassigned',
  ]);
});

test('labelled entities do not reveal hidden areas', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    options: { ...options, filter_label: 'dashboard', areas: { bedroom: { hidden: true } } },
  });
  assert.deepEqual(areaPaths(dashboard), ['kitchen', 'undisclosed']);
  assert.deepEqual(homePaths(dashboard), ['kitchen', 'undisclosed']);
  const lights = dashboard.views.find((view) => view.path === 'lights');
  assert.deepEqual(
    collect(lights, (card) => card.type === 'custom:mushroom-light-card').map((card) => card.entity),
    ['light.kitchen', 'light.unassigned']
  );
});

test('without a nonempty label, keep empty areas, unlabelled entities and explicitly configured area cards', async () => {
  for (const filter_label of [undefined, '']) {
    const { dashboard, areaView } = await generate({
      entities,
      devices,
      options: {
        ...options,
        filter_label,
        areas: { empty: { extra_cards: [{ type: 'markdown', content: 'Keep me' }] } },
      },
    });
    assert.deepEqual(areaPaths(dashboard), ['bedroom', 'empty', 'garage', 'kitchen', 'undisclosed']);
    assert.deepEqual(homePaths(dashboard), ['bedroom', 'empty', 'garage', 'kitchen', 'undisclosed']);
    const empty = await areaView(dashboard.views.find((view) => view.path === 'empty'));
    assert.equal(collect(empty, (card) => card.type === 'markdown')[0].content, 'Keep me');
    const lights = dashboard.views.find((view) => view.path === 'lights');
    assert.ok(collect(lights, (card) => card.entity === 'light.no_label').length);
  }
});

test('a missing label hides automatic entity and area cards but retains explicitly configured content', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    options: {
      filter_label: 'missing',
      badges: { weather_entity: 'weather.unlabelled' },
      extra_cards: [{ type: 'custom:mushroom-light-card', entity: 'light.no_label' }],
      extra_views: [{ title: 'Manual', path: 'manual', cards: [{ type: 'markdown', content: 'Manual view' }] }],
    },
  });
  assert.deepEqual(areaPaths(dashboard), []);
  assert.deepEqual(homePaths(dashboard), []);
  assert.ok(!dashboard.views.some((view) => view.path === 'lights'));
  assert.equal(collect(dashboard, (card) => card.type === 'custom:mushroom-light-card')[0].entity, 'light.no_label');
  assert.equal(dashboard.views.find((view) => view.path === 'manual').cards[0].content, 'Manual view');
  assert.equal(collect(dashboard, (card) => card.type === 'entity')[0].entity, 'weather.unlabelled');
});
