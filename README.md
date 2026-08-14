# tabby-xyzmodem

Tabby terminal plugin for serial file transfer with XMODEM, YMODEM, and ZMODEM.

## Features

- Send and receive files through the active Tabby terminal session.
- XMODEM CRC-16 and YMODEM batch/header transfer for bootloaders.
- ZMODEM send/receive integration using `zmodem.js`, including CRC framing, progress, cancellation, and downloaded-file saving.
- Context-menu commands for every protocol and direction.
- No second serial connection is opened, so the active COM port remains owned by the terminal tab.

ZMODEM requires the remote side to run a compatible sender/receiver such as `sz`/`rz`. XMODEM and YMODEM require the bootloader to be placed in receive mode before sending.

## Installation

Search for `tabby-xyzmodem` in Tabby's Plugin Manager, or install manually:

```powershell
cd "$env:APPDATA\tabby\plugins"
npm install tabby-xyzmodem --legacy-peer-deps
```

Restart Tabby after installation. In a terminal tab, right-click and choose the required XMODEM, YMODEM, or ZMODEM action.

## Development

```powershell
npm ci
npm run verify
npm pack --dry-run
```

`npm run verify` performs TypeScript checking and a production webpack build. The `.npmrc` file keeps npm's peer-dependency resolution consistent with the Angular 12/Tabby toolchain.

## Protocol notes

- XMODEM/YMODEM use 128-byte blocks and CRC-16 negotiation.
- YMODEM sends the filename/size header and the terminating empty header.
- ZMODEM is binary and sender-driven; terminal text may briefly show the protocol's detection header.
- None of these protocols provide authentication or encryption. Use them only on trusted serial links.

## License

MIT. See [LICENSE](LICENSE).
