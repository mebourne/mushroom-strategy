# 👀 View Options

Mushroom strategy includes several views to control/view entities of a specific domain.<br>
Hidden/Disabled entities or linked to a hidden area are excluded from the view.

The following views are supported and enabled by default:

| View          | name         | Ordering Position | Type   | Description                    |
|:--------------|:-------------|:-----------------:|:-------|:-------------------------------|
| `home`        | Home         |     -Infinity     | object | The strategy's Home View.      |
| `light`       | Lights       |        10         | object | View to control lights.        |
| `fan`         | Fans         |        20         | object | View to control fans.          |
| `cover`       | Covers       |        30         | object | View to control covers.        |
| `switch`      | Switches     |        40         | object | View to control switches.      |
| `temperature` | Temperatures |        45         | object | Graphs of temperature sensors. |
| `climate`     | Climates     |        50         | object | View to control climates.      |
| `camera`      | Cameras      |        60         | object | View to control cameras.       |
| `vacuum`      | Vacuums      |        70         | object | View to control vacuums.       |
| `scene`       | Scenes       |        80         | object | View to control scenes.        |
| `lock`        | Locks        |        90         | object | View to control locks.         |
| `valve`       | Valves       |        100        | object | View to control valves.        |

The `views` group enables you to specify the configuration of a view.
Each configuration is identified by a view name and can have the following options:

| name     | type    | Default                              | description                                                                                    |
|:---------|:--------|:-------------------------------------|:-----------------------------------------------------------------------------------------------|
| `hidden` | boolean | `false`                              | Set to `true` to exclude the view from the dashboard                                           |
| `icon`   | string  | domain specific                      | Icon of the view in the navigation bar.                                                        |
| `order`  | number  | domain specific<br>(See table above) | Ordering position of the view in the navigation bar.                                           |
| `title`  | string  | domain specific                      | Title of the view in the navigation bar. (Shown when no icon is defined or hovering above it.) |

## Dashboard Theme

Set `theme` directly under `strategy` to apply an existing Home Assistant theme to every generated view,
including home, domain and area views, as well as `extra_views`:

```yaml
strategy:
  type: custom:mushroom-strategy
  theme: My existing theme
```

This dashboard-wide setting **overrides individual view themes**. Omit it, or use an empty string, to preserve
individual view themes and Home Assistant's normal theme selection. It does not install or define the named theme,
and does not override themes configured directly on cards.

On older Home Assistant versions, an `extra_views` entry using another view strategy must also return its theme
from that strategy.

## Temperature View

The `temperature` view displays `sensor` entities whose current `unit_of_measurement` is exactly `°C`, `°F` or `K`.
Each sensor gets a Mini Graph Card. The tab disappears when no eligible sensors remain.
Sensors are grouped by their entity area, falling back to the device's area, or **Other** when neither is assigned.

Graph options come from `card_options`: device options apply first, then entity options override them.
Each graph's `entities` list is always the selected sensor; it cannot be replaced with unrelated entities through
these options. Row layout uses `domains.sensor.stack_count`, falling back to `domains._.stack_count`.
Temperature headers are read-only and do not offer sensor service controls.

## Sorting Views

The `order` property gives you control over how views are arranged in the top of the dashboard.

To make the most of this, it helps to understand how the strategy prioritizes these elements, as explained in chapter
[Element Positioning](index.md#element-positioning).

Possible values for `order` are:

- Any number, with lower values appearing first. For example, a view with `order: 10` will appear before an area with
  `order: 20`.
- `undefined` or missing `order` property, which will follow your prioritized list, sorted alphabetically by name.
- `Infinity` or `-Infinity` to always show a view last or first, respectively.

!!! note

    By default…

    - The strategy pre-assigns a position to the build-in views, regardless if the view is hidden or not.
    - The Home view is assigned the lowest possible `order` value, ensuring it appears first in the list.

## Example

```yaml
strategy:
  type: custom:mushroom-strategy
  show_positions: true
  options:
    views:
      light:
        order: 10
        title: illumination
      switch:
        order: 20
        hidden: true
        icon: mdi:toggle-switch
      fan:
        order: 30
        icon: mdi:fan
views: []
```

## Extra Views

The `extra_views` group enables you to specify the configuration of additional views.
Each view can have the options as described in the [Home Assistant documentation][viewDocUrl]{: target="_blank"}.

!!! tip

    You can build your view in a temporary dashboard and copy the `views` group from the YAML of that dashboard into
    group `extra_views` of the strategy configuration. The YAML can be found in the Raw configuration editor.

### Example

```yaml
strategy:
  type: custom:mushroom-strategy
  options:
    extra_views:
      - theme: Backend-selected
        title: cool view
        path: cool-view
        order: Infinity
        icon: mdi:emoticon-cool
        badges: []
        cards:
          - type: markdown
            content: I am cool
```

<!-- references -->

[viewDocUrl]: https://www.home-assistant.io/dashboards/views/#views
