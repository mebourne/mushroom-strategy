import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import vm from 'node:vm';

const bundle = readFileSync(new URL('../../dist/mushroom-strategy.js', import.meta.url), 'utf8');

export function entity(entity_id, area_id, overrides = {}) {
  return { entity_id, area_id, labels: [], hidden_by: null, disabled_by: null, device_id: null, ...overrides };
}

// Exercise the same public strategy API Home Assistant calls, without importing private implementation details.
export async function generate({
  entities = [],
  devices = [],
  states = {},
  options = {},
  theme,
  language = 'en',
} = {}) {
  const elements = new Map();
  const context = vm.createContext({
    HTMLTemplateElement: class {},
    customElements: { define: (name, element) => elements.set(name, element) },
  });
  vm.runInContext(bundle, context);
  const strategy = elements.get('ll-strategy-mushroom-strategy');
  const registries = {
    'config/entity_registry/list': entities,
    'config/device_registry/list': devices,
    'config/area_registry/list': ['kitchen', 'bedroom', 'garage', 'empty'].map((area_id) => ({
      area_id,
      name: area_id,
      floor_id: null,
      labels: ['dashboard'],
    })),
  };
  const info = {
    config: { strategy: { options, theme } },
    hass: {
      locale: { language },
      states,
      callWS: async ({ type }) => JSON.parse(JSON.stringify(registries[type])),
    },
  };
  // Normalize cross-realm objects before asserting observable configurations.
  const normalize = (value) => JSON.parse(JSON.stringify(value));
  return {
    dashboard: normalize(await strategy.generateDashboard(info)),
    areaView: async (view) =>
      normalize(
        await strategy.generateView({ config: { views: [] }, view: { strategy: view.strategy }, hass: info.hass })
      ),
  };
}

export function collect(value, predicate) {
  if (!value || typeof value !== 'object') return [];
  return [...(predicate(value) ? [value] : []), ...Object.values(value).flatMap((child) => collect(child, predicate))];
}
