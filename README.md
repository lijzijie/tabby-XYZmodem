# tabby-xyzmodem

Tabby terminal plugin for serial file transfer with XMODEM, YMODEM, and ZMODEM.

## Features

- Send and receive files through the active Tabby terminal session.
- XMODEM CRC-16 and YMODEM batch/header transfer for bootloaders.
- ZMODEM send/receive integration using `zmodem.js`, including CRC framing, progress, cancellation, and downloaded-file saving.
- Context-menu commands for every protocol and direction.
- No second serial connection is opened, so the active COM port remains owned by the terminal tab.

## Installation

### From Tabby Plugin Manager (recommended)

1. Go to Tabby **Settings** -> **Plugins**.
2. Switch to the **Available** tab.
3. Search for `tabby-xyzmodem` and click **Install**.
4. Restart Tabby.

### Manual Installation via NPM

If you prefer to install it manually:

```powershell
cd "$env:APPDATA\tabby\plugins"
npm install tabby-xyzmodem
```
*(On Linux/macOS, use `~/.config/tabby/plugins` or `~/Library/Application Support/tabby/plugins`)*

Restart Tabby after installation.

## Usage

1. Open a serial connection in Tabby.
2. For ZMODEM: Start a compatible sender/receiver such as `sz` or `rz` on the remote side.
3. For XMODEM/YMODEM: Place the remote bootloader or system into receive mode (e.g., `ymodem_recv` or `rz -y`).
4. **Right-click** anywhere in the terminal tab.
5. Choose the required XMODEM, YMODEM, or ZMODEM action from the context menu.

## Protocol notes

- XMODEM/YMODEM use 128-byte blocks and CRC-16 negotiation.
- YMODEM sends the filename/size header and the terminating empty header.
- ZMODEM is binary and sender-driven; terminal text may briefly show the protocol's detection header.
- None of these protocols provide authentication or encryption. Use them only on trusted serial links.

## Development

Requirements: Node.js 18 or newer and a Tabby-compatible Angular/toolchain environment.

```powershell
npm ci
npm run verify
npm pack --dry-run
```

`npm run verify` performs TypeScript checking and a production webpack build. The `.npmrc` file keeps npm's peer-dependency resolution consistent with the Angular 12/Tabby toolchain.

## License

MIT. See [LICENSE](LICENSE).
