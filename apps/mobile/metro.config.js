// Metro config. Expo detects the pnpm workspace on its own (SDK 52+), so
// there is no watchFolders / nodeModulesPaths setup here.
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// withUniwindConfig must stay the outermost wrapper.
module.exports = withUniwindConfig(config, {
	cssEntryFile: "./src/global.css",
	dtsFile: "./src/uniwind-types.d.ts",
});
