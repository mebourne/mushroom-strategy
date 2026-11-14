import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collect, entity, generate } from './helpers/strategy.mjs';

const entities = [
  entity('sensor.low_battery_one', 'kitchen', { name: 'Kitchen battery' }),
  entity('sensor.low_battery_two', 'bedroom', { name: 'Bedroom battery' }),
  entity('sensor.full_battery', 'kitchen', { name: 'Full battery' }),
  entity('sensor.unavailable_battery', 'kitchen', { name: 'Unavailable battery' }),
  entity('sensor.humidity', 'kitchen', { name: 'Humidity' }),
  entity('sensor.registry_hidden', 'kitchen', { name: 'Registry hidden battery', hidden_by: 'user' }),
  entity('sensor.options_hidden', 'kitchen', { name: 'Options hidden battery' }),
];
const batteryIds = [
  'sensor.low_battery_one',
  'sensor.low_battery_two',
  'sensor.full_battery',
  'sensor.unavailable_battery',
  'sensor.registry_hidden',
  'sensor.options_hidden',
];
const states = Object.fromEntries(
  entities.map(({ entity_id }) => [
    entity_id,
    {
      entity_id,
      state: entity_id === 'sensor.low_battery_one' ? '15' : entity_id === 'sensor.low_battery_two' ? '10' : '60',
      attributes: { device_class: batteryIds.includes(entity_id) ? 'battery' : undefined },
    },
  ])
);
states['sensor.unavailable_battery'].state = 'unavailable';
const options = { card_options: { 'sensor.options_hidden': { hidden: true } } };

const home = (dashboard) => dashboard.views.find((view) => view.path === 'home');
const badges = (dashboard) =>
  collect(home(dashboard)?.badges, (badge) => badge.type === 'custom:mushroom-template-badge');
const batteryBadge = (dashboard) =>
  badges(dashboard).find((badge) => badge.tap_action?.navigation_path === 'batteries');

test('the battery badge counts low batteries and navigates to the battery view', async () => {
  const { dashboard } = await generate({ entities, states, options });
  const badge = batteryBadge(dashboard);

  assert.ok(badge);
  assert.match(badge.content, /\| list \| count/);
  assert.match(badge.content, /select\('lt', 20\)/);
  assert.match(badge.icon, /mdi:battery-alert.*mdi:battery-80/s);
  assert.match(badge.color, /'red' if .* else 'green'/);
  assert.equal(badge.tap_action.action, 'navigate');
  assert.equal(badge.tap_action.navigation_path, 'batteries');
});

test('the battery badge counts exactly the battery view sensors below the level', async () => {
  const { dashboard } = await generate({ entities, states, options });
  const badge = batteryBadge(dashboard);

  // Only the visible battery sensors are listed; hidden and non-battery sensors are left out.
  for (const entity_id of ['sensor.low_battery_one', 'sensor.low_battery_two', 'sensor.full_battery']) {
    assert.ok(badge.content.includes(`states['${entity_id}']`), badge.content);
  }
  for (const entity_id of ['sensor.humidity', 'sensor.registry_hidden', 'sensor.options_hidden']) {
    assert.ok(!badge.content.includes(`states['${entity_id}']`), badge.content);
  }
});

test('the low level follows the battery_low_level option', async () => {
  const { dashboard } = await generate({
    entities,
    states,
    options: { ...options, badges: { battery_low_level: 30 } },
  });
  const badge = batteryBadge(dashboard);

  assert.ok(badge.content.includes("select('lt', 30)"));
});

test('the battery badge is absent when disabled, the battery view is hidden or no battery sensors exist', async () => {
  const disabled = await generate({ entities, states, options: { ...options, badges: { battery_count: false } } });
  const hiddenView = await generate({
    entities,
    states,
    options: { ...options, views: { battery: { hidden: true } } },
  });
  const noBatteries = await generate({
    entities: [entity('sensor.humidity', 'kitchen', { name: 'Humidity' })],
    states,
  });

  assert.ok(!batteryBadge(disabled.dashboard));
  assert.ok(!batteryBadge(hiddenView.dashboard));
  assert.ok(!batteryBadge(noBatteries.dashboard));
});

test('the battery badge coexists with the other badges', async () => {
  const { dashboard } = await generate({
    entities: [...entities, entity('switch.charger', 'kitchen')],
    states: {
      ...states,
      'switch.charger': { entity_id: 'switch.charger', state: 'on', attributes: {} },
    },
    options: {
      ...options,
      badges: { extra_badges: [{ type: 'custom:mushroom-template-badge', content: 'extra' }] },
    },
  });

  const badgeContents = badges(dashboard).map((badge) => badge.content);

  assert.ok(badgeContents.includes('extra'));
  assert.ok(badgeContents.some((content) => content.includes("selectattr('state','eq','on')")));
  assert.equal(badgeContents.filter((content) => content.includes("navigation_path: 'batteries'")).length, 0);
  assert.equal(badges(dashboard).filter((badge) => badge.tap_action?.navigation_path === 'batteries').length, 1);
});
