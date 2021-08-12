const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const makeRequestWithRefresh = require('../../util/reqWithRefresh')

class GetPlaybackState extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            masterKey: 'eda344e1ab8b9e122aab3350eec33e95802c7fe68aac8ad85c5c64d97e45ef1a'
        })
    }

    static schema = new Schema({
        name: 'get-playback-state',
        label: 'Get Playback State',
        category: 'Spotify',
        isConfig: false,
        fields: {
            stateType: new fields.Select({ options: ['playback', 'playerState'] })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    async onMessage(msg, vals) {
        let request = {
            method: 'GET',
            url: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: {
                Authorization: `Bearer ${this.tokens.vals.access_token}`
            }
        }

        if (vals.stateType === 'playerState') {
            request.url = 'https://api.spotify.com/v1/me/player'
        }

        try {
            msg.spotifyState = (await makeRequestWithRefresh(this, request)).data || null
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

module.exports = GetPlaybackState