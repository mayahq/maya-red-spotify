const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')

const makeRequestWithRefresh = require('../../util/reqWithRefresh')

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
                optionNameMap: { 
                    toggleShuffle: 'Toggle Shuffle', 
                    toggleRepeat: 'Toggle Repeat', 
                    addToQueue: 'Add to Queue' 
                },
                fieldSets: {
                    resume: {},
                    pause: {},
                    next: {},
                    previous: {},
                    toggleShuffle: {
                        shuffleMode: new fields.Typed({ type: 'str', allowedTypes: ['msg', 'flow', 'global'], defaultVal: 'true' })
                    },
                    toggleRepeat: {
                        repeatMode: new fields.Typed({ type: 'str', allowedTypes: ['msg', 'flow', 'global'], defaultVal: 'off' })
                    },
                    addToQueue: {
                        trackUri: new fields.Typed({ type: 'str', allowedTypes: ['msg', 'flow', 'global'] })
                    }
                }
            })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    async onMessage(msg, vals) {
        console.log('vals', vals)

        let request = {
            method: 'PUT',
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: {
                Authorization: `Bearer ${this.tokens.vals.access_token}`
            }
        }

        if (vals.action.selected === 'pause') {
            this.setStatus('PROGRESS', 'Pausing')
            request.url = 'https://api.spotify.com/v1/me/player/pause'
        }
        else if (vals.action.selected === 'toggleShuffle') {
            this.setStatus('PROGRESS', 'Toggling shuffle')
            request.url = `https://api.spotify.com/v1/me/player/shuffle?state=${vals.action.childValues.shuffleMode}`
        }
        else if (vals.action.selected === 'next') {
            this.setStatus('PROGRESS', 'Skipping song')
            request.method = 'POST'
            request.url = 'https://api.spotify.com/v1/me/player/next'
        }
        else if (vals.action.selected === 'previous') {
            this.setStatus('PROGRESS', 'Playing last song')
            request.method = 'POST'
            request.url = 'https://api.spotify.com/v1/me/player/previous'
        }
        else if (vals.action.selected === 'toggleRepeat') {
            this.setStatus('PROGRESS', 'Toggling repeat')
            request.method = 'PUT'
            request.url = `https://api.spotify.com/v1/me/player/repeat?state=${vals.action.childValues.repeatMode}`
        }
        else if (vals.action.selected === 'addToQueue') {
            this.setStatus('PROGRESS', 'Adding to queue')
            request.method = 'POST'
            request.url = `https://api.spotify.com/v1/me/player/queue?uri=${vals.action.childValues.trackUri}`
        }

        try {
            await makeRequestWithRefresh(this, request)
            this.setStatus('SUCCESS', 'Done')
            return msg
        } catch (e) {
            if (e.response) {
                console.log('config', e.config)
                console.log('RESPONSE STATUS', e.response.status)
                console.log('RESPONSE DATA', e.response.data)
            } else {
                console.log(e)
            }

            msg.__isError = true
            msg.__error = e
            this.setStatus('ERROR', e.message)
            return msg
        }
    }
}

module.exports = ControlPlayback