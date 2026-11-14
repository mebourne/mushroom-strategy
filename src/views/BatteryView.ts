// noinspection JSUnusedGlobalSymbols Class is dynamically imported.

import { Registry } from '../Registry';
import AbstractCard from '../cards/AbstractCard';
import BatteryCard from '../cards/BatteryCard';
import { EntityRegistryEntry } from '../types/homeassistant/data/entity_registry';
import { CustomCardConfig, StrategyArea } from '../types/strategy/strategy-generics';
import { ViewConfig } from '../types/strategy/strategy-views';
import { localize } from '../utilities/localize';
import AbstractView from './AbstractView';

/**
 * Battery View Class.
 *
 * Used to create a view for sensor entities with a battery device class.
 *
 * @class BatteryView
 * @extends AbstractView
 */
class BatteryView extends AbstractView {
  /** The domain of the entities that the view is representing. */
  static readonly domain = 'sensor' as const;

  /** Returns the default configuration object for the view. */
  static getDefaultConfig(): ViewConfig {
    return {
      title: localize('battery.batteries'),
      path: 'batteries',
      icon: 'mdi:battery',
      subview: false,
      headerCardConfiguration: {
        show_controls: false,
      },
    };
  }

  /** The view also shows areas hidden by the strategy options, since its cards are read-only. */
  protected override getAreas(): StrategyArea[] {
    return Registry.allAreas;
  }

  /** The view also shows entities the config and diagnostic filters exclude, since its cards are read-only. */
  protected override getRegistryEntities(): EntityRegistryEntry[] {
    return Registry.allEntities;
  }

  /** The view only groups its cards per area, so it has no Header card for all its entities. */
  protected override hasViewHeaderCard(): boolean {
    return false;
  }

  constructor(customConfiguration?: ViewConfig) {
    super();

    this.initializeViewConfig(BatteryView.getDefaultConfig(), customConfiguration, {});

    // Battery levels are read-only, even if sensor-domain controls are enabled.
    this.baseConfiguration.headerCardConfiguration = {
      ...this.baseConfiguration.headerCardConfiguration,
      show_controls: false,
    };
  }

  /** Select battery sensors while retaining the standard view's filtering and area rendering. */
  protected getEntities(): EntityRegistryEntry[] {
    return super
      .getEntities()
      .filter((entity) => Registry.hassStates[entity.entity_id]?.attributes.device_class === 'battery');
  }

  /** Create a battery card for the entity, instead of the sensor domain's graph card. */
  protected createCard(entity: EntityRegistryEntry): AbstractCard {
    return new BatteryCard(entity, this.getCardOptions(entity));
  }

  /** Apply device and entity options, keeping each card bound to its selected battery sensor. */
  protected getCardOptions(entity: EntityRegistryEntry): CustomCardConfig {
    return {
      ...(entity.device_id && Registry.strategyOptions.card_options?.[entity.device_id]),
      ...Registry.strategyOptions.card_options?.[entity.entity_id],
    };
  }
}

export default BatteryView;
