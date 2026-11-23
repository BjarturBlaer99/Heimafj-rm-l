# decode-uri-component compatibility copy

Source: [decode-uri-component 0.5.1](https://www.npmjs.com/package/decode-uri-component/v/0.5.1), published by the upstream project under the included MIT license.

This copy preserves the upstream 0.5.1 decoder. The only source change replaces `export default function decodeUriComponent` with a plain function declaration and `module.exports = decodeUriComponent`. Expo Router 57 depends on CommonJS `query-string` 7, whose old decoder version is affected by [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f). The adaptation lets Metro/Hermes use the patched decoder without upgrading to an incompatible Expo Router major version.

The upstream npm tarball SHA-512 integrity is:

```text
sha512-vWHQkXgg2cE3BB4rR0c+PYw9BCQzLoNIRMI7AunIkZst74tw/vpPp7VLoYtsR/cy1f55g3XDWUslfeCZjiZJyA==
```

`package.json` uses a local dependency and override so nested `query-string` resolves this copy. Keep this directory and its license with the application source. Remove the override when a compatible Expo Router release uses a patched decoder directly. `tests/mobile-readiness.test.cjs` verifies resolution through `query-string`, Icelandic text, and malformed percent-encoded input.
