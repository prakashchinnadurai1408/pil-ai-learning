// Stub for native `canvas` package used by jsdom. axe-core triggers jsdom's
// MouseEvent path, which optionally requires `canvas`. We don't need real
// canvas in unit tests, so we provide a no-op shim aliased via vitest config.
module.exports = {};
