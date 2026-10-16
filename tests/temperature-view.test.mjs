import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collect, entity, generate } from './helpers/strategy.mjs';

const entities = [
  entity('sensor.celsius', 'kitchen', { device_id: 'bedroom-device' }),
  entity('sensor.second', 'kitchen'),
  entity('sensor.fahrenheit', null, { device_id: 'bedroom-device' }),
  entity('sensor.kelvin', null),
  entity('sensor.humidity', 'kitchen'),
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
const devices = [{ id: 'bedroom-device', area_id: 'bedroom', disabled_by: null, labels: [] }];
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
const graphs = (view) => collect(view, (card) => card.type === 'custom:mini-graph-card');
const titles = (view) => collect(view, (card) => card.type === 'custom:mushroom-title-card');

test('temperature graphs select exact sensor units and group by entity area, device area or Other', async () => {
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
    graphs(view).map((card) => card.entities),
    [['sensor.fahrenheit'], ['sensor.celsius'], ['sensor.second'], ['sensor.kelvin']]
  );
  assert.deepEqual(
    titles(view).map((card) => card.title),
    ['All Temperatures', 'bedroom', 'kitchen', 'Other']
  );
  for (const [area, ids] of [
    ['bedroom', ['sensor.fahrenheit']],
    ['kitchen', ['sensor.celsius', 'sensor.second']],
    ['Other', ['sensor.kelvin']],
  ]) {
    const section = view.cards.find((card) => titles(card)[0]?.title === area);
    assert.deepEqual(
      graphs(section).map((card) => card.entity),
      ids
    );
  }
  const kitchen = view.cards.find((card) => titles(card)[0]?.title === 'kitchen');
  assert.deepEqual(
    kitchen.cards.filter((card) => graphs(card).length).map((row) => graphs(row).length),
    [1, 1]
  );
});

test('temperature graphs omit hidden entity areas, device areas and the undisclosed area', async () => {
  const { dashboard } = await generate({
    entities,
    devices,
    states,
    options: { ...options, areas: { bedroom: { hidden: true }, undisclosed: { hidden: true } } },
  });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.deepEqual(
    graphs(view).map((card) => card.entities),
    [['sensor.celsius'], ['sensor.second']]
  );
  assert.deepEqual(
    titles(view).map((card) => card.title),
    ['All Temperatures', 'kitchen']
  );
  const hidden = await generate({
    entities,
    devices,
    states,
    options: { ...options, areas: { _: { hidden: true }, undisclosed: { hidden: true } } },
  });
  assert.ok(!hidden.dashboard.views.some((view) => view.path === 'temperatures'));
});

test('temperature views respect custom headers, positions and device then entity graph options', async () => {
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
        'bedroom-device': { line_color: 'purple', hours_to_show: 6, entities: ['sensor.wrong'] },
        'sensor.celsius': { line_color: 'orange', entities: ['sensor.also_wrong'] },
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
    ['All Temperatures', 'Zone', 'Zone', 'Zone']
  );
  assert.deepEqual(
    titles(view)
      .slice(1)
      .map((card) => card.subtitle),
    ['Ordering position: 10', 'Ordering position: 40', 'Ordering position: Infinity']
  );
  const celsius = graphs(view).find((card) => card.entity === 'sensor.celsius');
  const fahrenheit = graphs(view).find((card) => card.entity === 'sensor.fahrenheit');
  assert.equal(celsius.line_color, 'orange');
  assert.equal(fahrenheit.line_color, 'purple');
  assert.equal(celsius.hours_to_show, 6);
  assert.deepEqual(celsius.entities, ['sensor.celsius']);
  assert.deepEqual(fahrenheit.entities, ['sensor.fahrenheit']);
  assert.ok(!collect(view, (card) => card.tap_action?.action === 'perform-action').length);
  const kitchen = view.cards.find((card) => graphs(card).some((graph) => graph.entity === 'sensor.celsius'));
  assert.ok(kitchen.cards.some((row) => row.cards?.length === 2 && graphs(row).length === 2));
  const fallback = await generate({
    entities,
    devices,
    states,
    options: { ...options, domains: { _: { stack_count: 2 } } },
  });
  const fallbackView = fallback.dashboard.views.find((view) => view.path === 'temperatures');
  const fallbackKitchen = fallbackView.cards.find((card) => titles(card)[0]?.title === 'kitchen');
  assert.ok(fallbackKitchen.cards.some((row) => row.cards?.length === 2 && graphs(row).length === 2));
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
  assert.equal(titles(view)[0].title, 'All Temperatures');
});

test('temperature headings fall back to English while existing headings use the selected language', async () => {
  const { dashboard } = await generate({ entities, devices, states, options, language: 'de' });
  const view = dashboard.views.find((view) => view.path === 'temperatures');
  assert.equal(view.title, 'Temperatures');
  assert.equal(titles(view)[0].title, 'All Temperatures');
  assert.equal(titles(view).at(-1).title, 'Sonstiges');
});
