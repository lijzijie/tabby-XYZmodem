# Contributing

Use Node.js 24 or newer, then run:

```powershell
npm ci
npm run verify
```

Protocol changes should include deterministic tests or a documented interoperability check against a common bootloader or `lrzsz`. Do not commit firmware images, generated `dist/` output, local paths, or credentials.
