const runAppleScriptSync = require('./runAppleScript')

function playNative(uri) {

    try {
        runAppleScriptSync(`
            tell application "Spotify"
                play track "${uri}"
            end tell
        `)

        return true
    } catch {
        return false
    }
}

module.exports = {
    playNative
}

// playNative("spotify:artist:5K4W6rqBFWDnAN6FQUkS6x")