const runAppleScriptSync = require('./runAppleScript')

function getPlayerStateNative() {
    try {
        const result = runAppleScriptSync(`
            tell application "Spotify"
                player state
            end tell
        `)
    
        return result.trim()
    } catch (e) {
        return false
    }
}

function resumeNative() {
    try {
        runAppleScriptSync(`
            tell application "Spotify"
                play
            end tell
        `)
    
        return true
    } catch (e) {
        return false
    }
}

function pauseNative() {
    try {
        runAppleScriptSync(`
            tell application "Spotify"
                pause
            end tell
        `)
    
        return true
    } catch (e) {
        return false
    }
}

function nextTrackNative() {
    try {
        runAppleScriptSync(`
            tell application "Spotify"
                next track
            end tell
        `)
    
        return true
    } catch (e) {
        return false
    }
}

function previousTrackNative() {
    try {
        runAppleScriptSync(`
            tell application "Spotify"
                previous track
            end tell
        `)
    
        return true
    } catch (e) {
        return false
    }
}

module.exports = {
    getPlayerStateNative,
    resumeNative,
    pauseNative,
    nextTrackNative,
    previousTrackNative
}
