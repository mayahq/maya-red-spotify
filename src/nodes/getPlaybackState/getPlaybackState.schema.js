const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { default: axios } = require('axios')
const refresh = require('../../util/refresh')

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

    async refreshTokens() {
        console.log('Playback State node refreshing tokens')
        const newTokens = await refresh(this)
        if (!newTokens.error) {
            await this.tokens.set(newTokens)
            return newTokens
        }
        return {
            access_token: null,
            refresh_token: null
        }
    }

    onInit() {

    }

    async getStateFromAPI(request) {
        const response = await axios(request)
        if (response.data) {
            return response.data
        } 
        return null
    }

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
            msg.spotifyState = await this.getStateFromAPI(request)
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
                request.headers.Authorization = `Bearer ${access_token}`
                try {
                    msg.spotifyState = await this.getStateFromAPI(request)
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

module.exports = GetPlaybackState