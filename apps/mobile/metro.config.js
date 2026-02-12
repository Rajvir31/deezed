const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch monorepo packages and apps only (avoid watching root node_modules, which has
// optional platform deps like turbo-linux-64 that don't exist on Windows and break the watcher)
config.watchFolders = [
  path.resolve(monorepoRoot, "packages"),
  path.resolve(monorepoRoot, "apps"),
];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
