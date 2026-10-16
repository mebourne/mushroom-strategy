# Mushroom Dashboard Strategy 🍄✨

[![Release][releaseBadge]][releaseUrl]
[![HACS][hacsBadge]][hacsUrl]
[![Codacy][codacyBadge]][codacyUrl]

## Local patched fork

This fork at <https://github.com/mebourne/mushroom-strategy> keeps local changes
on `patched`, based on upstream `main` (the 3.2.0 source plus later dependency,
workflow and documentation updates). It does not publish GitHub Releases or
submit these changes upstream.

The local changes add entity-label filtering, a temperature-sensor view and a
strategy-level theme. The strategy and resource names remain unchanged.

### Switch an existing 3.2.0 installation

1. Back up Home Assistant, and save the dashboard's raw configuration and its
   JavaScript resource list before changing sources.
2. In this fork's **Settings → General → Default branch**, select `patched`.
   The branch must already have been pushed. Keep the fork without GitHub Releases.
3. In HACS, open the installed **DigiLive/mushroom-strategy** repository and choose
   **⋮ → Remove**. Remove only the strategy repository, not Mushroom cards,
   Mini Graph Card, or the dashboard itself.
4. In HACS's main **⋮ → Custom repositories** dialog, add
   `https://github.com/mebourne/mushroom-strategy` with type **Dashboard**
   (called Frontend in older HACS versions).
5. Open the fork, check the GitHub owner is `mebourne`, then download its
   default branch, `patched`. Keep only this source installed for the strategy.
   HACS installs the committed `dist/mushroom-strategy.js`; it does not build TypeScript.
6. Under **Settings → Dashboards → ⋮ → Resources**, keep exactly one strategy
   resource, a **JavaScript Module** pointing to
   `/hacsfiles/mushroom-strategy/mushroom-strategy.js`. HACS may append a cache-busting
   query string; keep it. Remove stale/duplicate strategy resource entries,
   including any old manually installed label-filter build. Keep the separate
   Mushroom and Mini Graph Card resources.
7. In the dashboard's raw configuration, keep existing options and use the
   standard `custom:mushroom-strategy` type. If it currently uses
   `custom:mushroom-strategy-label-filter`, change that type to the standard name.
   Add the following settings only where wanted, replacing the example label ID
   and theme name with your own:

   ```yaml
   strategy:
     type: custom:mushroom-strategy
     theme: Your existing theme
     options:
       filter_label: your_label_id
   views: []
   ```

8. Hard-refresh every browser showing the dashboard, or reload/reset the
   Companion App frontend cache. A Home Assistant Core restart is not normally
   required for this JavaScript-only change. Verify the dashboard, area navigation,
   temperature tab and browser console before considering the switch complete.

`filter_label` matches an entity's own label ID, not its label's display name or
labels inherited from devices/areas. Omit it to show all otherwise eligible
entities and preserve empty areas. While filtering is enabled, areas with no
remaining entities have neither home cards nor subviews. Explicit custom cards,
views and weather selections are not filtered; this is not an access-control boundary.
The **Temperatures** tab groups sensors with `°C`, `°F` or `K` units by area,
including unassigned sensors under **Other**, and disappears when none match.
Set `options.views.temperature.hidden: true` to hide the tab explicitly.
`strategy.theme` applies to all generated, extra and area views, overriding their
individual themes; omit it to retain normal per-view theme behavior.

### Updates and local builds

For future installed updates, use the fork's **⋮ → Update information**, then
install the update (or **Redownload → patched**) and refresh the browser/app.
The default-branch commit identifies the installed fork revision; the JavaScript
banner may still say 3.2.0. No release or version bump is required for this workflow.

Develop outside Home Assistant's live configuration directory. Run `npm ci`,
`npm test` (which also builds), and `npx tsc --noEmit` before publishing. Commit
source changes separately from the generated bundle, then include the tested
bundle on `patched` before pushing. The inherited pre-commit hook blocks `dist/`
because upstream uses CI to publish it; a fork-only distribution commit can use
`HUSKY=0 git commit` after staging **only** `dist/mushroom-strategy.js`.
Do not hand-edit the minified bundle, publish an unbuilt source-only update,
force-push `patched`, or enable the inherited upstream publishing workflows:
they require upstream secrets and contain upstream push URLs. Push only to this
fork. For rollback, publish a new commit restoring the known-good source and
bundle, then redownload through HACS.

---

**Effortlessly create stunning Home Assistant Dashboards with the Mushroom Dashboard Strategy!**

- Are you tired of manually configuring your Home Assistant dashboards?
  Do you love the elegant design of Mushroom cards but wish for a simpler way to organize your entities,
  devices, and areas?

The **Mushroom Dashboard Strategy** is your solution.
It automatically generates beautiful, organized dashboards for Home Assistant,
leveraging the power and aesthetics of Mushroom cards with minimal configuration.

---

## ⭐ **Why Choose Mushroom Dashboard Strategy?**

- **⚡️ Automatic Dashboard Generation:** Go from zero to a beautiful dashboard with just a few lines of YAML.
- **🏡 Intelligent Organization:** Automatically creates intuitive views for your devices, areas, and entities.
- **🎨 Highly Customizable:** Tailor your dashboard to your unique smart home setup with extensive options.
- **📈 Integrated Insights:** Seamlessly displays mini graph cards for your sensor data.

---

## 🚀 **Get Started in Minutes!**

Ready to transform your Home Assistant experience?

The **Mushroom Dashboard Strategy** is available through HACS (Home Assistant Community Store).

➡️ **[Explore the detailed documentation for Installation & Usage Guides!](https://digilive.github.io/mushroom-strategy/)**

---

## 📸 **Sneak Peek**

![Preview GIF](docs/images/preview.gif)

---

## 🤝 **Contributing & Support**

We welcome contributions and feedback!

- Have questions or need help?
  Check out our [Discussions](https://github.com/DigiLive/mushroom-strategy/discussions) page.

- Found a bug or have an idea?
  Open an [Issue](https://github.com/DigiLive/mushroom-strategy/issues).

- Enjoying the Mushroom Strategy?
  Consider giving our project a ⭐ [star on GitHub](https://github.com/DigiLive/mushroom-strategy) and exploring ways
  to ❤️ [sponsor the project](https://github.com/sponsors/DigiLive) to support its continued development!
  Your support helps us grow and improve.

---

<!-- Badge References -->

[codacyBadge]: https://app.codacy.com/project/badge/Grade/24de1e79aea445499917d9acd5ce9e04

[hacsBadge]: https://img.shields.io/badge/HACS-Default-blue

[releaseBadge]: https://img.shields.io/github/v/tag/digilive/mushroom-strategy?filter=v3.2.0&label=Release

<!-- Repository References -->

[releaseUrl]: https://github.com/DigiLive/mushroom-strategy/releases/tag/v3.2.0

<!-- Other References -->

[codacyUrl]: https://app.codacy.com/gh/DigiLive/mushroom-strategy/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade

[hacsUrl]: https://hacs.xyz
