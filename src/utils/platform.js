const IS_MAC = process.platform === 'darwin';
const IS_WINDOWS = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';

module.exports = { IS_MAC, IS_WINDOWS, IS_LINUX };
