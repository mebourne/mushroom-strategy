// noinspection JSUnusedGlobalSymbols Class is dynamically imported.

import { Registry } from '../Registry';
import { LovelaceBadgeConfig } from '../types/homeassistant/data/lovelace/config/badge';
import AbstractBadge from './AbstractBadge';

/**
 * Battery Badge class.
 *
 * Used to create a badge configuration to indicate how many batteries are low and to navigate to the battery view.
 *
 * A battery counts as low when its state is below the battery low level of the strategy options. States that aren't
 * numbers, like `unavailable`, count as full instead, so a battery that isn't reporting never triggers the badge.
 */
class BatteryBadge extends AbstractBadge {
  /**
   * Class Constructor.
   *
   * @param {LovelaceBadgeConfig} [customConfiguration] Custom badge configuration.
   */
  constructor(customConfiguration?: LovelaceBadgeConfig) {
    super();

    this.configuration = { ...this.configuration, ...BatteryBadge.getDefaultConfig(), ...customConfiguration };
  }

  /** Returns the default configuration object for the badge. */
  static getDefaultConfig(): LovelaceBadgeConfig {
    const lowLevel = Registry.strategyOptions.badges.battery_low_level;

    // A state that isn't a number becomes the fallback 100, so only numeric states below the level are counted.
    const count =
      `[${Registry.getBatteryEntities()
        .map((entity) => `states['${entity.entity_id}']`)
        .toString()}]` + ` | map(attribute='state') | map('float', 100) | select('lt', ${lowLevel}) | list | count`;

    return {
      type: 'custom:mushroom-template-badge',
      color: `{% set low = ${count} %}{{ 'red' if low > 0 else 'green' }}`,
      icon: `{% set low = ${count} %}{{ 'mdi:battery-alert' if low > 0 else 'mdi:battery-80' }}`,
      content: `{% set low = ${count} %}{{ low }}`,
      tap_action: {
        action: 'navigate',
        navigation_path: 'batteries',
      },
    };
  }
}

export default BatteryBadge;
