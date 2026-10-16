// noinspection JSUnusedGlobalSymbols Class is dynamically imported.

import { Registry } from '../Registry';
import { EntityRegistryEntry } from '../types/homeassistant/data/entity_registry';
import { CustomHeaderCardConfig } from '../types/strategy/strategy-cards';
import { CustomCardConfig } from '../types/strategy/strategy-generics';
import { ViewConfig } from '../types/strategy/strategy-views';
import { localize } from '../utilities/localize';
import AbstractView from './AbstractView';

/**
 * Temperature View Class.
 *
 * Used to create a view for sensor entities with temperature units.
 *
 * @class TemperatureView
 * @extends AbstractView
 */
class TemperatureView extends AbstractView {
  /** The domain of the entities that the view is representing. */
  static readonly domain = 'sensor' as const;

  /** Returns the default configuration object for the view. */
  static getDefaultConfig(): ViewConfig {
    return {
      title: localize('temperature.temperatures'),
      path: 'temperatures',
      icon: 'mdi:thermometer',
      subview: false,
      headerCardConfiguration: {
        show_controls: false,
      },
    };
  }

  /** Returns the default configuration of the view's Header card. */
  static getViewHeaderCardConfig(): CustomHeaderCardConfig {
    return {
      title: localize('temperature.all_temperatures'),
      show_controls: false,
    };
  }

  constructor(customConfiguration?: ViewConfig) {
    super();

    this.initializeViewConfig(
      TemperatureView.getDefaultConfig(),
      customConfiguration,
      TemperatureView.getViewHeaderCardConfig()
    );

    // Temperature graphs are read-only, even if sensor-domain controls are enabled.
    this.baseConfiguration.headerCardConfiguration = {
      ...this.baseConfiguration.headerCardConfiguration,
      show_controls: false,
    };
  }

  /** Select temperature sensors while retaining the standard view's filtering and area rendering. */
  protected getEntities(): EntityRegistryEntry[] {
    return super.getEntities().filter((entity) => {
      const unit = Registry.hassStates[entity.entity_id]?.attributes.unit_of_measurement;
      return unit === '°C' || unit === '°F' || unit === 'K';
    });
  }

  /** Apply device and entity options, keeping each graph bound to its selected temperature sensor. */
  protected getCardOptions(entity: EntityRegistryEntry): CustomCardConfig {
    return {
      ...(entity.device_id && Registry.strategyOptions.card_options?.[entity.device_id]),
      ...Registry.strategyOptions.card_options?.[entity.entity_id],
      entities: [entity.entity_id],
    };
  }
}

export default TemperatureView;
