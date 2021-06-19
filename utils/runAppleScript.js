const execa = require('execa')

function runAppleScriptSync(script) {
	if (process.platform !== 'darwin') {
		// throw new Error('macOS only');
        console.log('AppleScript is only supported by macOS. Failing silently.')
        return false
	}

	const {stdout} = execa.sync('osascript', ['-e', script]);
	return stdout;
}

module.exports = runAppleScriptSync