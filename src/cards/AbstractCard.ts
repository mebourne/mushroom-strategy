import { Registry } from '../Registry';
import { LovelaceCardConfig } from '../types/homeassistant/data/lovelace/config/card';
import { EntityRegistryEntry } from '../types/homeassistant/data/entity_registry';
import { AbstractCardConfig } from '../types/strategy/strategy-cards';
import { isEntityRegistryEntry, isSupportedDomain, RegistryEntry } from '../types/strategy/strategy-generics';
import { logMessage, lvlFatal } from '../utilities/debug';

/**
 * Abstract Card Class
 *
 * To create a card configuration, this class should be extended by a child class.
 * Child classes should override the default configuration so the card correctly reflects the entity.
 *
 * @remarks
 * Before using this class, the Registry module must be initialized by calling {@link Registry.initialize}.
 */
abstract class AbstractCard {
  /** The registry entry this card represents. */
  readonly entity: RegistryEntry;

  /**
   * The card configuration for this entity.
   *
   * Child classes should override this property to reflect their own card type and options.
   */
  protected configuration: LovelaceCardConfig = {
    type: 'custom:mushroom-entity-card',
    icon: 'mdi:help-circle',
  };

  /**
   * Class constructor.
   *
   * @param {RegistryEntry} entity The registry entry to create a card configuration for.
   *
   * @remarks
   * Before this class can be used, the Registry module must be initialized by calling {@link Registry.initialize}.
   */
  protected constructor(entity: RegistryEntry) {
    if (!Registry.initialized) {
      logMessage(lvlFatal, 'Registry is not initialized!');
    }

    this.entity = entity;
  }

  /**
   * Get the name of the entity's device.
   *
   * @param {EntityRegistryEntry} entity The HASS entity whose device to name.
   *
   * @returns {string | undefined} The device's user-defined name, or its default name, or undefined without a device.
   */
  protected static getDeviceName(entity: EntityRegistryEntry): string | undefined {
    if (!entity.device_id) {
      return undefined;
    }

    const device = Registry.devices.find((device) => device.id === entity.device_id);

    return device?.name_by_user ?? device?.name ?? undefined;
  }

  /**
   * Get the name to display for the entity.
   *
   * The name is composed the way Home Assistant composes entity names: the entity's own name, or for entities named
   * after their device, the device's name followed by the entity's original name.
   * An empty name falls back to the device's name the same way.
   *
   * @param {EntityRegistryEntry} entity The HASS entity to name.
   */
  protected static getDisplayName(entity: EntityRegistryEntry): string {
    const deviceName = AbstractCard.getDeviceName(entity);

    return (
      entity.name ||
      (entity.has_entity_name && deviceName ? `${deviceName} ${entity.original_name}` : entity.original_name) ||
      '?'
    );
  }

  /**
   * Get a card configuration.
   *
   * The configuration should be set by any of the child classes so the card correctly reflects an entity.
   */
  getCard(): AbstractCardConfig {
    // Set the card visibility based on the entity's availability.
    if (isEntityRegistryEntry(this.entity)) {
      const entityDomain = this.entity.entity_id.split('.', 1)[0] ?? '';
      const domain = isSupportedDomain(entityDomain) ? entityDomain : 'default';
      const domainOptions = {
        ...Registry.strategyOptions.domains['_'],
        ...Registry.strategyOptions.domains[domain],
      };

      if (domainOptions.hide_unavailable_entities) {
        this.configuration.visibility = [
          {
            condition: 'state',
            state_not: 'unavailable',
          },
        ];
      }
    }

    return {
      ...this.configuration,
      entity: 'entity_id' in this.entity ? this.entity.entity_id : undefined,
    };
  }
}

export default AbstractCard;
