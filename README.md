# AzerothCore Dashboard

> **Disclaimer:** This project has been *vibe coded* based on my personal needs. I'm making it publicly available in case someone else finds it useful or wants to use it. This dashboard is intended for personal servers or playing with friends, not as a professional private server administration tool.

A system tray dashboard for managing your AzerothCore server. Built with Electron, it provides a convenient GUI to monitor and control your AzerothCore Docker services without touching the terminal.

![Main Dashboard](assets/screenshot-01.png)

## Features

- **Service Management** - Start, stop, and restart Database, Worldserver, and Authserver services
- **Real-time Console** - Execute GM commands directly from the dashboard
- **Live Logs** - View logs from any service (Database, Worldserver, Authserver)
- **Configuration Editor** - Edit `docker-compose.override.yml` environment variables through the UI
- **Realm Settings** - Modify realm name and address in the database
- **Module Browser** - View installed modules and their documentation
- **System Tray Integration** - Keep the dashboard running in the background
- **Auto-Update** - Built-in update notifications and one-click installation
- **Player & Uptime Monitoring** - See connected players and server uptime at a glance

## Screenshots

![Services Tab](assets/screenshot-02.png)
*Manage all your AzerothCore services from one place*

![Console](assets/screenshot-03.png)
*Execute GM commands directly*

![Logs Viewer](assets/screenshot-04.png)
*View real-time logs from any service*

![Configuration](assets/screenshot-05.png)
*Edit server configuration through the UI*

![Realm Settings](assets/screenshot-06.png)
*Manage your realm settings*

![Settings](assets/screenshot-07.png)
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
