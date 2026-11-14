import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collect, entity, generate } from './helpers/strategy.mjs';

const entities = [
  entity('sensor.battery_level', 'kitchen', { name: 'Battery Level' }),
  entity('sensor.bedroom_battery', 'bedroom', {
    has_entity_name: true,
    original_name: 'Battery',
    device_id: 'bedroom-device',
  }),
  entity('sensor.diagnostic_battery', 'kitchen', { entity_category: 'diagnostic', name: 'Diagnostic battery' }),
  entity('sensor.esp_battery', 'garage', {
    name: '',
    has_entity_name: true,
    original_name: 'Battery',
    device_id: 'esp-device',
  }),
  entity('sensor.phone_battery', null, { name: 'Pixel 6 Pro Battery' }),
  entity('sensor.humidity', 'kitchen', { name: 'Humidity' }),
  entity('sensor.no_state', 'kitchen', { name: 'No state battery' }),
  entity('sensor.hidden', 'kitchen', { name: 'Hidden battery', hidden_by: 'user' }),
  entity('sensor.disabled', 'kitchen', { name: 'Disabled battery', disabled_by: 'user' }),
  entity('sensor.custom_hidden', 'kitchen', { name: 'Config hidden battery' }),
  entity('switch.charger', 'kitchen'),
];
const devices = [
  { id: 'bedroom-device', area_id: 'bedroom', disabled_by: null, labels: [], name: 'Bedroom' },
  { id: 'esp-device', area_id: 'garage', disabled_by: null, labels: [], name: 'Garage ESP' },
];
const states = Object.fromEntries(
  entities
    .filter((entry) => entry.entity_id !== 'sensor.no_state')
    .map(({ entity_id }) => [
      entity_id,
      {
        entity_id,
        state: '64',
        attributes: {
          device_class: entity_id === 'sensor.battery_level' || entity_id.endsWith('battery') ? 'battery' : undefined,
        },
      },
    ])
);
const options = { card_options: { 'sensor.custom_hidden': { hidden: true } } };
const cards = (view) => collect(view, (card) => card.type === 'custom:mushroom-template-card');
const titles = (view) => collect(view, (card) => card.type === 'custom:mushroom-title-card');

test('battery cards select battery sensors and group by entity area, device area or Other', async () => {
  const { dashboard } = await generate({ entities, devices, states, options });
  const view = dashboard.views.find((view) => view.path === 'batteries');
  assert.equal(view.title, 'Batteries');
  assert.equal(view.icon, 'mdi:battery');
  assert.deepEqual(
    cards(view).map((card) => card.entity),
    [
      'sensor.bedroom_battery',
      'sensor.esp_battery',
      'sensor.battery_level',
      'sensor.diagnostic_battery',
      'sensor.phone_battery',
    ]
  );
  // Names are composed from the registry (device name plus entity name) and a trailing "battery" is removed.
  // An entity with an empty name falls back to its device's name.
  assert.deepEqual(
    cards(view).map((card) => card.primary),
    ['Bedroom', 'Garage ESP', 'Battery Level', 'Diagnostic', 'Pixel 6 Pro']
  );
  for (const card of cards(view)) {
    assert.equal(card.icon, "{{ state_attr(config.entity, 'icon') or 'mdi:battery' }}");
    assert.match(card.color, /float\(0\)/);
    assert.match(card.color, /green/);
    assert.match(card.color, /amber/);
    assert.match(card.color, /red/);
    assert.deepEqual(card.features, [{ type: 'trend-graph' }]);
    assert.equal(card.features_position, 'bottom');
    assert.equal(card.secondary, "{{ states(config.entity) }}{{ state_attr(config.entity, 'unit_of_measurement') }}");
    assert.equal(card.card_mod, undefined);
    assert.ok(!collect(card, (card) => card.tap_action?.action === 'perform-action').length);
  }
  for (const [area, ids] of [
    ['bedroom', ['sensor.bedroom_battery']],
    ['garage', ['sensor.esp_battery']],
    ['kitchen', ['sensor.battery_level', 'sensor.diagnostic_battery']],
    ['Other', ['sensor.phone_battery']],
  ]) {
    const section = view.cards.find((card) => titles(card)[0]?.title === area);
    assert.deepEqual(
      cards(section).map((card) => card.entity),
      ids
    );
  }
  const kitchen = view.cards.find((card) => titles(card)[0]?.title === 'kitchen');
  assert.deepEqual(
    kitchen.cards.filter((card) => cards(card).length).map((row) => cards(row).length),
    [1, 1]
  );
});

test('battery cards include areas hidden by the strategy options, which other views still omit', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    states,
    options: { ...options, areas: { bedroom: { hidden: true }, undisclosed: { hidden: true } } },
  });
  const view = dashboard.views.find((view) => view.path === 'batteries');
  assert.deepEqual(
    cards(view).map((card) => card.entity),
    [
      'sensor.bedroom_battery',
      'sensor.esp_battery',
      'sensor.battery_level',
      'sensor.diagnostic_battery',
      'sensor.phone_battery',
    ]
  );
  // The control views keep omitting the hidden areas.
  const switches = dashboard.views.find((view) => view.path === 'switches');
  assert.deepEqual(
    titles(switches).map((card) => card.title),
    ['All Switches', 'kitchen']
  );
  // Even a dashboard-wide hidden areas option does not suppress the battery view.
  const allHidden = await generate({
    entities,
    devices,
    states,
    options: { ...options, areas: { _: { hidden: true }, undisclosed: { hidden: true } } },
  });
  const allHiddenView = allHidden.dashboard.views.find((view) => view.path === 'batteries');
  assert.equal(cards(allHiddenView).length, 5);
});

test('battery views respect custom headers, positions and device then entity card options', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    states,
    options: {
      ...options,
      show_positions: true,
      domains: { sensor: { stack_count: 2, show_controls: true } },
      views: {
        battery: {
          title: 'My batteries',
          icon: 'mdi:battery-alert',
          order: 15,
          headerCardConfiguration: { title: 'Zone' },
        },
      },
      card_options: {
        ...options.card_options,
        'bedroom-device': { icon: 'mdi:battery-charging', primary: 'Wrong', line_color: 'purple' },
        'sensor.battery_level': { icon: 'mdi:battery-heart', primary: 'Custom' },
      },
    },
  });
  const view = dashboard.views.find((view) => view.path === 'batteries');
  assert.equal(view.title, 'My batteries: 15');
  assert.equal(view.icon, 'mdi:battery-alert');
  assert.deepEqual(
    titles(view).map((card) => card.title),
    ['Zone', 'Zone', 'Zone', 'Zone']
  );
  // The view has no all-entities Header card; each area header carries its own subtitle.
  assert.deepEqual(
    titles(view).map((card) => card.subtitle),
    ['Ordering position: 10', 'Ordering position: 30', 'Ordering position: 40', 'Ordering position: Infinity']
  );
  const level = cards(view).find((card) => card.entity === 'sensor.battery_level');
  const bedroom = cards(view).find((card) => card.entity === 'sensor.bedroom_battery');
  assert.equal(level.icon, 'mdi:battery-heart');
  assert.equal(bedroom.icon, 'mdi:battery-charging');
  assert.equal(level.primary, 'Custom');
  assert.equal(bedroom.primary, 'Wrong');
  // Entity options override device options, and each card stays bound to its selected sensor.
  assert.match(level.secondary, /states\(config\.entity\)/);
  assert.ok(!collect(view, (card) => card.tap_action?.action === 'perform-action').length);
  const kitchen = view.cards.find((card) => cards(card).some((card) => card.entity === 'sensor.battery_level'));
  assert.ok(kitchen.cards.some((row) => row.cards?.length === 2 && cards(row).length === 2));
  const fallback = await generate({
    entities,
    devices,
    states,
    options: { ...options, domains: { _: { stack_count: 2 } } },
  });
  const fallbackView = fallback.dashboard.views.find((view) => view.path === 'batteries');
  const fallbackKitchen = fallbackView.cards.find((card) => titles(card)[0]?.title === 'kitchen');
  assert.ok(fallbackKitchen.cards.some((row) => row.cards?.length === 2 && cards(row).length === 2));
});

test('battery tabs are absent when hidden or when no eligible battery sensors exist', async () => {
  for (const input of [
    { entities, devices, states, options: { ...options, views: { battery: { hidden: true } } } },
    { entities: [entity('sensor.humidity', 'kitchen')], states },
    { entities, devices, states: {} },
  ]) {
    const { dashboard } = await generate(input);
    assert.ok(!dashboard.views.some((view) => view.path === 'batteries'));
  }
});

test('battery headings use the normal English translation fallback for unsupported locales', async () => {
  const { dashboard } = await generate({ entities, devices, states, options, language: 'xx' });
  const view = dashboard.views.find((view) => view.path === 'batteries');
  assert.equal(view.title, 'Batteries');
  assert.equal(titles(view)[0].title, 'bedroom');
});

test('battery headings fall back to English while existing headings use the selected language', async () => {
  const { dashboard } = await generate({ entities, devices, states, options, language: 'de' });
  const view = dashboard.views.find((view) => view.path === 'batteries');
  assert.equal(view.title, 'Batteries');
  assert.equal(titles(view)[0].title, 'bedroom');
  assert.equal(titles(view).at(-1).title, 'Sonstiges');
});
