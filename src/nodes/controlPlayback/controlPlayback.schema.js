const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')

const axios = require('axios')

const { 
    getPlayerStateNative,
    resumeNative,
    pauseNative,
    nextTrackNative,
    previousTrackNative
} = require('../../../utils/playerStateNative')
const refresh = require('../../util/refresh')

class ControlPlayback extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            masterKey: 'eda344e1ab8b9e122aab3350eec33e95802c7fe68aac8ad85c5c64d97e45ef1a'
        })
    }

    static schema = new Schema({
        name: 'control-playback',
        label: 'Control Playback',
        category: 'Spotify',
        isConfig: false,
        fields: {
            action: new fields.SelectFieldSet({
                fieldSets: {
                    resume: {},
                    pause: {},
                    next: {},
                    previous: {},
                    toggleShuffle: {
                        shuffleMode: new fields.Typed({ type: 'str', allowedTypes: ['str', 'flow', 'global'], defaultVal: 'true' })
                    },
                    toggleRepeat: {
                        repeatMode: new fields.Typed({ type: 'str', allowedTypes: ['str', 'flow', 'global'], defaultVal: 'off' })
                    }
                }
            })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    async refreshTokens() {
        const newTokens = await refresh(this)
        await this.tokens.set(newTokens)
        return newTokens
    }

    onInit() {

    }

    // async sendApiRequest(request, action) {

    // }

    async onMessage(msg, vals) {
        // if (getPlayerStateNative() === 'playing') {
        //     if (vals.action.selected === 'pause') {
        //         const paused = pauseNative()
        //         if (paused) return msg
        //     }
        //     else if (vals.action.selected === 'resume') {
        //         const resumed = resumeNative()
        //         if (resumed) return msg
        //     }
        //     else if (vals.action.selected === 'next') {
        //         const skipped = nextTrackNative()
        //         if (skipped) return msg
        //     }
        //     else if (vals.action.selected === 'previous') {
        //         const wentBack = previousTrackNative()
        //         if (wentBack) return msg
        //     }
        // }

        let request = {
            method: 'PUT',
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: {
                Authorization: `Bearer ${this.tokens.vals.access_token}`
            }
        }

        if (vals.action.selected === 'pause') {
            request.url = 'https://api.spotify.com/v1/me/player/pause'
        }
        else if (vals.action.selected === 'toggleShuffle') {
            request.url = `https://api.spotify.com/v1/me/player/shuffle?state=${vals.action.childValues.shuffleMode}`
        }
        else if (vals.action.selected === 'next') {
            request.method = 'POST'
            request.url = 'https://api.spotify.com/v1/me/player/next'
        }
        else if (vals.action.selected === 'previous') {
            request.method = 'POST'
            request.url = 'https://api.spotify.com/v1/me/player/previous'
        }
        else if (vals.action.selected === 'toggleRepeat') {
            request.method = 'PUT'
            request.url = `https://api.spotify.com/v1/me/player/repeat?state=${vals.action.childValues.repeatMode}`
        }

        try {
            await axios(request)
            return msg
        } catch (e) {
            const response = e.response
            if (!response) {
                console.log('Unknown Error', e)
                msg.isError = true
                msg.error = {
                    reason: 'UNKNOWN_ERROR'
                }
                this.setStatus('ERROR', 'Unknown error, unrelated to API')
                return msg
            }

            if (parseInt(response.status) === 401) {
                const { access_token } = await this.refreshTokens()
                if (!access_token) {
                    this.setStatus('ERROR', 'Failed to refresh access token')
                    msg.isError = true
                    msg.error = {
                        reason: 'TOKEN_REFRESH_FAILED',
                    }
                    return msg
                }

                request.headers.Authorization = `Bearer ${access_token}`
                try {
                    await axios(request)
                    return msg
                } catch (e) {
                    console.log('What just happened?')
                    console.log(e)
                }
            }

            this.setStatus('ERROR', 'Unknown error')
            if (e.response) {
                console.log('config', e.config)
                console.log('RESPONSE STATUS', e.response.status)
                console.log('RESPONSE DATA', e.response.data)
            } else {
                console.log(e)
            }
            msg.isError = true
            msg.error = {
                reason: 'UNKNOWN_ERROR',
                uri: uri
            }

            return msg
        }
        
    }
}

module.exports = ControlPlayback