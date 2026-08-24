# luci-theme-nyaawrt

A Cyberpunk-themed LuCI theme for OpenWrt and NyaaWrt OS builds, featuring vibrant neon styling, a clean interface, custom wallpapers, and responsive design.

## Features
- **Cyberpunk Aesthetics**: Sleek dark mode with vibrant neon pink, cyan, and yellow accents.
- **Custom Logo**: High-quality transparent NyaaWrt neon branding.
- **Anime Backgrounds**: Integrated Cyberpunk-themed wallpapers for login and dashboard pages.
- **Optimized UI**: Sharp progress bars, high contrast styling, and responsive layout for mobile and desktop screens.
- **Based on Material and Bootstrap frameworks**.

## Screenshots
<div align="center">
  <img src="https://raw.githubusercontent.com/Xperimental-lain/luci-theme-nyaawrt/main/luasrc/brand.png" alt="NyaaWrt Logo" width="400">
</div>

## Installation

To install the theme on your OpenWrt device:

1. Clone or download the repository.
2. Build the package or manually copy the file structure:
   - Copy `luasrc/` content to `/www/luci-static/nyaawrt/`
   - Copy `template/` files to `/usr/share/ucode/luci/template/themes/nyaawrt/`
   - Copy `js/` files to `/www/luci-static/resources/`
   - Copy `root/` files to the root system folder `/`

3. Activate the theme via LuCI settings or execute:
   ```bash
   uci set luci.themes.NyaaWrt='/luci-static/nyaawrt'
   uci set luci.main.mediaurlbase='/luci-static/nyaawrt'
   uci commit luci
   /etc/init.d/uhttpd restart
   /etc/init.d/rpcd restart
   ```

## Development & Credits
- Based on the Bootstrap framework and Material theme references.
- Maintained and customized by **Xperimental-lain**.
