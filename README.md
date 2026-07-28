# AzerothCore Dashboard

> **Disclaimer:** This project has been *vibe coded* based on my personal needs. I'm making it publicly available in case someone else finds it useful or wants to use it. This dashboard is intended for personal servers or playing with friends, not as a professional private server administration tool.

A system tray dashboard for managing your AzerothCore server. Built with Electron, it provides a retro World of Warcraft styled GUI to monitor services, run console commands, manage accounts, edit database records, and keep common server tasks out of the terminal.

![Main Dashboard](assets/screenshot-07.png)

## Features

- **Service Management** - Start, stop, and restart Database, Worldserver, and Authserver services
- **Real-time Console** - Execute GM commands directly from the dashboard, with quick commands and clear output
- **Account Management** - Create accounts, change passwords, and assign GM privileges from the UI
- **Live Logs** - View logs from any service (Database, Worldserver, Authserver)
- **Configuration Editor** - Edit `docker-compose.override.yml` environment variables through the UI
- **Realm Settings** - Modify realm name and address in the database
- **Database Item Browser** - Search and edit `item_template` records, including direct Wowhead item links
- **Module Browser** - View installed modules and their documentation
- **Expansion Themes** - Switch between Vanilla, Burning Crusade, and Wrath of the Lich King artwork
- **Optional Theme Music** - Play local expansion music with a built-in volume control
- **System Tray Integration** - Keep the dashboard running in the background
- **Auto-Update** - Built-in update notifications and one-click installation
- **Player & Uptime Monitoring** - See connected players and compact `HH:MM:SS` server uptime at a glance

## Screenshots

![Services Tab](assets/screenshot-07.png)
*Manage all your AzerothCore services from one place*

![Console](assets/screenshot-06.png)
*Run server commands with quick actions and clear console output*

![Accounts](assets/screenshot-02.png)
*Create accounts and update existing account credentials or GM privileges*

![Logs Viewer](assets/screenshot-05.png)
*View real-time logs from any service*

![Configuration](assets/screenshot-04.png)
*Edit server configuration through the UI*

![Realm Settings](assets/screenshot-03.png)
*Manage your realm settings*

![Database Items](assets/screenshot-08.png)
*Search item templates and open matching Wowhead pages*

![Settings](assets/screenshot-01.png)
*Configure your connection settings*

## Requirements

- Node.js 18+
- AzerothCore server running with Docker
- SOAP enabled on your worldserver
- MySQL database access

## Installation

### From Release

1. Download the latest release for your platform from the [Releases](https://github.com/Jslquintero/azerothcore-dashboard/releases) page
2. Run the installer
3. Follow the setup wizard to configure your connection

### From Source

```bash
# Clone the repository
git clone https://github.com/Jslquintero/azerothcore-dashboard.git
cd azerothcore-dashboard

# Install dependencies
npm install

# Run the dashboard
npm start
```

## Setup

On first launch, you'll be prompted to configure:

1. **AzerothCore Project Root** - Path to your AzerothCore installation
2. **SOAP Connection** - Host, port, username, and password for SOAP
3. **MySQL Connection** - Host, port, username, and password for the database

## Building

```bash
# Linux
npm run dist

# Windows
npm run dist:win

# macOS
npm run dist:mac

# All platforms
npm run dist:all
```

## Usage

Once configured, the dashboard runs in your system tray. Click the tray icon to:

- Open the dashboard window
- Start/Stop all services at once
- Quit the application

## License

MIT

## Credits

This dashboard was created for managing personal AzerothCore servers. AzerothCore is an open-source World of Warcraft emulator.

Some theme artwork and launcher-style button assets are included for a personal retro UI experience. World of Warcraft and related artwork are property of Blizzard Entertainment.
