import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collect, entity, generate } from './helpers/strategy.mjs';

const entities = [
  entity('sensor.celsius', 'kitchen', { name: 'Kitchen temperature', device_id: 'bedroom-device' }),
  entity('sensor.second', 'kitchen', { name: 'Second temperature' }),
  entity('sensor.fahrenheit', null, {
    has_entity_name: true,
    original_name: 'Temperature',
    device_id: 'bedroom-device',
  }),
  entity('sensor.kelvin', null, { name: 'Kelvin temperature' }),
  entity('sensor.humidity', 'kitchen', { name: 'Humidity' }),
  entity('sensor.near_unit', 'kitchen'),
  entity('sensor.unitless', 'kitchen'),
  entity('sensor.no_state', 'kitchen'),
  entity('sensor.hidden', 'kitchen', { hidden_by: 'user' }),
  entity('sensor.disabled', 'kitchen', { disabled_by: 'user' }),
  entity('sensor.diagnostic', 'kitchen', { entity_category: 'diagnostic' }),
  entity('sensor.custom_hidden', 'kitchen'),
  entity('switch.heater', 'kitchen'),
  entity('fan.extractor', 'kitchen'),
  entity('climate.thermostat', 'kitchen'),
];
const devices = [{ id: 'bedroom-device', area_id: 'bedroom', disabled_by: null, labels: [], name: 'Bedroom' }];
const states = Object.fromEntries(
  entities
    .filter((entry) => entry.entity_id !== 'sensor.no_state')
    .map(({ entity_id }) => [
      entity_id,
      {
        entity_id,
        state: '21',
        attributes: {
          unit_of_measurement:
            {
              'sensor.fahrenheit': '°F',
              'sensor.kelvin': 'K',
              'sensor.humidity': '%',
              'sensor.near_unit': '°C ',
              'sensor.unitless': undefined,
            }[entity_id] ?? (entity_id === 'sensor.unitless' ? undefined : '°C'),
        },
      },
    ])
);
const options = { card_options: { 'sensor.custom_hidden': { hidden: true } } };
const cards = (view) => collect(view, (card) => card.type === 'custom:mushroom-template-card');
const titles = (view) => collect(view, (card) => card.type === 'custom:mushroom-title-card');

test('temperature cards select exact sensor units and group by entity area, device area or Other', async () => {
  const { dashboard } = await generate({ entities, devices, states, options });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.equal(view.title, 'Temperatures');
  assert.deepEqual(
    dashboard.views
      .filter((view) => ['fans', 'switches', 'temperatures', 'climates'].includes(view.path))
      .map((view) => view.path),
    ['fans', 'switches', 'temperatures', 'climates']
  );
  assert.deepEqual(
    cards(view).map((card) => card.entity),
    ['sensor.fahrenheit', 'sensor.celsius', 'sensor.second', 'sensor.kelvin']
  );
  // Names are composed from the registry (device name plus entity name) and "temperature" is removed.
  assert.deepEqual(
    cards(view).map((card) => card.primary),
    ['Bedroom', 'Kitchen', 'Second', 'Kelvin']
  );
  for (const card of cards(view)) {
    assert.equal(card.icon, 'mdi:thermometer');
    assert.equal(card.color, 'black');
    assert.deepEqual(card.features, [{ type: 'trend-graph' }]);
    assert.equal(card.features_position, 'bottom');
    assert.match(card.card_mod.style, /states\(config\.entity\)/);
    assert.match(card.card_mod.style, /linear-gradient\(135deg/);
    assert.match(card.secondary, /unit_of_measurement/);
    assert.match(card.secondary, /replace\('temperature', 'humidity'\)/);
    assert.match(card.secondary, /replace\('temperature', 'temperature_battery'\)/);
  }
  assert.deepEqual(
    titles(view).map((card) => card.title),
    ['bedroom', 'kitchen', 'Other']
  );
  for (const [area, ids] of [
    ['bedroom', ['sensor.fahrenheit']],
    ['kitchen', ['sensor.celsius', 'sensor.second']],
    ['Other', ['sensor.kelvin']],
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

test('temperature cards omit hidden entity areas, device areas and the undisclosed area', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    states,
    options: { ...options, areas: { bedroom: { hidden: true }, undisclosed: { hidden: true } } },
  });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.deepEqual(
    cards(view).map((card) => card.entity),
    ['sensor.celsius', 'sensor.second']
  );
  assert.deepEqual(
    titles(view).map((card) => card.title),
    ['kitchen']
  );
  const hidden = await generate({
    entities,
    devices,
    states,
    options: { ...options, areas: { _: { hidden: true }, undisclosed: { hidden: true } } },
  });
  assert.ok(!hidden.dashboard.views.some((view) => view.path === 'temperatures'));
});

test('temperature views respect custom headers, positions and device then entity card options', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    states,
    options: {
      ...options,
      show_positions: true,
      domains: { sensor: { stack_count: 2, show_controls: true } },
      views: {
        temperature: {
          title: 'My temperatures',
          icon: 'mdi:home-thermometer',
          order: 15,
          headerCardConfiguration: { title: 'Zone' },
        },
      },
      card_options: {
        ...options.card_options,
        'bedroom-device': { icon: 'mdi:snowflake', primary: 'Wrong', line_color: 'purple' },
        'sensor.celsius': { icon: 'mdi:home-thermometer', primary: 'Custom' },
      },
    },
  });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.equal(view.title, 'My temperatures: 15');
  assert.equal(view.icon, 'mdi:home-thermometer');
  assert.deepEqual(
    dashboard.views
      .filter((view) => ['fans', 'switches', 'temperatures', 'climates'].includes(view.path))
      .map((view) => view.path),
    ['temperatures', 'fans', 'switches', 'climates']
  );
  assert.deepEqual(
    titles(view).map((card) => card.title),
    ['Zone', 'Zone', 'Zone']
  );
  // The view has no all-entities Header card; each area header carries its own subtitle.
  assert.deepEqual(
    titles(view).map((card) => card.subtitle),
    ['Ordering position: 10', 'Ordering position: 40', 'Ordering position: Infinity']
  );
  const celsius = cards(view).find((card) => card.entity === 'sensor.celsius');
  const fahrenheit = cards(view).find((card) => card.entity === 'sensor.fahrenheit');
  assert.equal(celsius.icon, 'mdi:home-thermometer');
  assert.equal(fahrenheit.icon, 'mdi:snowflake');
  assert.equal(celsius.primary, 'Custom');
  assert.equal(fahrenheit.primary, 'Wrong');
  // Entity options override device options, and each card stays bound to its selected sensor.
  assert.match(fahrenheit.secondary, /states\(config\.entity\)/);
  assert.ok(!collect(view, (card) => card.tap_action?.action === 'perform-action').length);
  const kitchen = view.cards.find((card) => cards(card).some((card) => card.entity === 'sensor.celsius'));
  assert.ok(kitchen.cards.some((row) => row.cards?.length === 2 && cards(row).length === 2));
  const fallback = await generate({
    entities,
    devices,
    states,
    options: { ...options, domains: { _: { stack_count: 2 } } },
  });
  const fallbackView = fallback.dashboard.views.find((view) => view.path === 'temperatures');
  const fallbackKitchen = fallbackView.cards.find((card) => titles(card)[0]?.title === 'kitchen');
  assert.ok(fallbackKitchen.cards.some((row) => row.cards?.length === 2 && cards(row).length === 2));
});

test('temperature tabs are absent when hidden or when no eligible temperature sensors exist', async () => {
  for (const input of [
    { entities, devices, states, options: { ...options, views: { temperature: { hidden: true } } } },
    { entities: [entity('sensor.humidity', 'kitchen')], states },
    { entities, devices, states: {} },
  ]) {
    const { dashboard } = await generate(input);
    assert.ok(!dashboard.views.some((view) => view.path === 'temperatures'));
  }
});

test('temperature headings use the normal English translation fallback for unsupported locales', async () => {
  const { dashboard } = await generate({ entities, devices, states, options, language: 'xx' });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.equal(view.title, 'Temperatures');
  assert.equal(titles(view)[0].title, 'bedroom');
});

test('temperature headings fall back to English while existing headings use the selected language', async () => {
  const { dashboard } = await generate({ entities, devices, states, options, language: 'de' });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.equal(view.title, 'Temperatures');
  assert.equal(titles(view)[0].title, 'bedroom');
  assert.equal(titles(view).at(-1).title, 'Sonstiges');
});
