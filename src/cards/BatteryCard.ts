import { TemplateCardConfig } from '../types/lovelace-mushroom/cards/template-card-config';
import { EntityRegistryEntry } from '../types/homeassistant/data/entity_registry';
import AbstractCard from './AbstractCard';

/**
 * Battery Card Class
 *
 * Used to create a card for displaying a battery level sensor.
 *
 * The card is a Mushroom template card showing the sensor's name, its current level and a trend graph.
 * The icon and text colour is green above or at 50%, amber above or at 25% and red below that.
 *
 * @see https://github.com/piitaya/lovelace-mushroom/blob/main/docs/cards/template.md
 */
class BatteryCard extends AbstractCard {
  /**
   * Get the name to display for the entity, without a trailing "battery".
   *
   * Removing a trailing "battery" shortens names like "Kitchen Light Switch battery" to "Kitchen Light Switch", but a
   * name consisting of only that word is kept intact.
   *
   * @param {EntityRegistryEntry} entity The HASS entity to name.
   */
  protected static getDisplayName(entity: EntityRegistryEntry): string {
    const name = AbstractCard.getDisplayName(entity);

    return name.replace(/\s*battery$/i, '').trim() || name;
  }

  /** Returns the default configuration object for the card. */
  static getDefaultConfig(entity: EntityRegistryEntry): TemplateCardConfig {
    return {
      type: 'custom:mushroom-template-card',
      icon: "{{ state_attr(config.entity, 'icon') or 'mdi:battery' }}",
      color:
        '{% set level = states(config.entity) | float(0) %}{% if level >= 50 %}green{% elif level >= 25 %}amber{% else %}red{% endif %}',
      primary: BatteryCard.getDisplayName(entity),
      secondary: `{{ states(config.entity) }}{{ state_attr(config.entity, 'unit_of_measurement') }}`,
      features: [{ type: 'trend-graph' }],
      features_position: 'bottom',
    };
  }

  /**
   * Class constructor.
   *
   * @param {EntityRegistryEntry} entity The HASS entity to create a card configuration for.
   * @param {TemplateCardConfig} [customConfiguration] Custom card configuration.
   */
  constructor(entity: EntityRegistryEntry, customConfiguration?: TemplateCardConfig) {
    super(entity);

    this.configuration = { ...this.configuration, ...BatteryCard.getDefaultConfig(entity), ...customConfiguration };
  }
}

export default BatteryCard;
