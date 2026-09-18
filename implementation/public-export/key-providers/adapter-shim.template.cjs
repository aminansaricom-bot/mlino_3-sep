'use strict';
// Copy this file outside the repository. Replace the placeholder with the absolute built module path.
const { createDpapiKeyProvider } = require('ABSOLUTE_PATH_TO_IMPLEMENTATION/dist/public-export/key-providers/dpapiKeyProvider.js');
exports.createKeyProvider = () => createDpapiKeyProvider({ descriptorPath: process.env.MLINO_EXPORT_KEYSTORE_PATH });
