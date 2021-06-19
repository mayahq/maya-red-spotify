const runAppleScriptSync = require('./runAppleScript')

function spotifyInstalled() {
    if (process.platform !== 'darwin') {
        return false
    }

    try {
        const exists = runAppleScriptSync(`
            tell application "Spotify"
                activate
            end tell
        `)

        return true
    } catch (e) {
        return false
    }
}

module.exports = {
    spotifyInstalled
}