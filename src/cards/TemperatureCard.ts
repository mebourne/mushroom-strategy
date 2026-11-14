import { TemplateCardConfig } from '../types/lovelace-mushroom/cards/template-card-config';
import { EntityRegistryEntry } from '../types/homeassistant/data/entity_registry';
import { Registry } from '../Registry';
import AbstractCard from './AbstractCard';

/**
 * Card_mod style template rendering a colour gradient behind the card, scaled to the entity's temperature.
 *
 * The gradient runs from the colour of a temperature two degrees lower to the colour of one three degrees higher,
 * keeping the card's colour stable while the temperature drifts.
 * Temperatures are mapped onto hues between 10°C (blue) and 40°C (red) and desaturated to half.
 */
const TemperatureGradientStyle = `ha-card {
  {% set temp = states(config.entity) | float(20) %}

  {# COLOR 1: Base Temperature #}
  {% set b1 = [[10, temp - 2] | max, 40] | min %}
  {% set h1 = 4.2 - ((b1 - 10) * 0.14) %}
  {% set x1 = (1 - ((h1 % 2) - 1) | abs) * 255 %}
  {% if h1 >= 3 %}{% set r1, g1, bl1 = 0, x1, 255 %}
  {% elif h1 >= 2 %}{% set r1, g1, bl1 = 0, 255, x1 %}
  {% elif h1 >= 1 %}{% set r1, g1, bl1 = x1, 255, 0 %}
  {% else %}{% set r1, g1, bl1 = 255, x1, 0 %}{% endif %}

  {# COLOR 2: RHS Temperature #}
  {% set b2 = [[10, temp + 3] | max, 40] | min %}
  {% set h2 = 4.2 - ((b2 - 10) * 0.14) %}
  {% set x2 = (1 - ((h2 % 2) - 1) | abs) * 255 %}
  {% if h2 >= 3 %}{% set r2, g2, bl2 = 0, x2, 255 %}
  {% elif h2 >= 2 %}{% set r2, g2, bl2 = 0, 255, x2 %}
  {% elif h2 >= 1 %}{% set r2, g2, bl2 = x2, 255, 0 %}
  {% else %}{% set r2, g2, bl2 = 255, x2, 0 %}{% endif %}

  {# Apply Saturation to Color 1 #}
  {% set sat = 0.5 %}
  {% set gray = 128 %}
  {% set r1 = (r1 * sat + gray * (1 - sat)) | int %}
  {% set g1 = (g1 * sat + gray * (1 - sat)) | int %}
  {% set bl1 = (bl1 * sat + gray * (1 - sat)) | int %}

  {# Apply Saturation to Color 2 #}
  {% set r2 = (r2 * sat + gray * (1 - sat)) | int %}
  {% set g2 = (g2 * sat + gray * (1 - sat)) | int %}
  {% set bl2 = (bl2 * sat + gray * (1 - sat)) | int %}

  background: linear-gradient(135deg, rgb({{r1}}, {{g1}}, {{bl1}}) 0%, rgb({{r2}}, {{g2}}, {{bl2}}) 100%) !important;
}`;

/**
 * Temperature Card Class
 *
 * Used to create a card for displaying a temperature sensor.
 *
 * The card is a Mushroom template card showing the sensor's name with the current temperature, a background colour
 * gradient matching that temperature, the sibling humidity sensor in the secondary info, a low-battery warning and a
 * trend graph. Sibling sensors are found by replacing "temperature" in the entity id with "humidity" or
 * "temperature_battery".
 *
 * The gradient requires the card-mod custom integration.
 *
 * @see https://github.com/piitaya/lovelace-mushroom/blob/main/docs/cards/template.md
 */
class TemperatureCard extends AbstractCard {
  /**
   * Get the name to display for the entity, without "temperature".
   *
   * The name is composed the way Home Assistant composes entity names: the entity's own name, or for entities named
   * after their device, the device's name followed by the entity's original name. An empty name falls back to the
   * device's name the same way, since Home Assistant treats an empty registry name as unset.
   * Removing "temperature" shortens names like "Office temperature" to "Office". A name consisting of only that word
   * carries no information, so such a card shows the device's name instead.
   *
   * @param {EntityRegistryEntry} entity The HASS entity to name.
   */
  private static getDisplayName(entity: EntityRegistryEntry): string {
    const device = entity.device_id ? Registry.devices.find((device) => device.id === entity.device_id) : undefined;
    const deviceName = device?.name_by_user ?? device?.name;
    const name =
      entity.name ||
      (entity.has_entity_name && deviceName ? `${deviceName} ${entity.original_name}` : entity.original_name) ||
      '?';
    const shortName = name.replace(/temperature/gi, '').trim();

    return shortName || deviceName || name;
  }

  /** Returns the default configuration object for the card. */
  static getDefaultConfig(entity: EntityRegistryEntry): TemplateCardConfig {
    return {
      type: 'custom:mushroom-template-card',
      icon: 'mdi:thermometer',
      color: 'black',
      primary: TemperatureCard.getDisplayName(entity),
      secondary: `{{ states(config.entity) }}{{ state_attr(config.entity, 'unit_of_measurement') }} {% set hum = config.entity | replace('temperature', 'humidity') | replace('Temperature', 'Humidity') %} {% if states(hum) not in ['unavailable', 'unknown'] %}
  💧{{ states(hum) }}%
{% endif %} {% set bat = config.entity | replace('temperature', 'temperature_battery') %} {% if states(bat) | float(100) < 30 %}
  🪫
{% endif %}`,
      features: [{ type: 'trend-graph' }],
      features_position: 'bottom',
      card_mod: { style: TemperatureGradientStyle },
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

    this.configuration = { ...this.configuration, ...TemperatureCard.getDefaultConfig(entity), ...customConfiguration };
  }
}

export default TemperatureCard;
