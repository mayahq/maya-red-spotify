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
        const newTokens = await refresh(this)
        await this.tokens.set(newTokens)
        return newTokens
    }

    onInit() {
        this.tokens.get()
            .then((vals) => this.tokens.vals = vals)
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
                Authorization: `Bearer ${this.tokens.vals.accessToken}`
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
                const { accessToken } = await this.refreshTokens()
                request.headers.Authorization = `Bearer ${accessToken}`
                try {
                    msg.spotifyState = await this.getStateFromAPI(request)
                    return msg
                } catch (e) {
                    console.log('What just happened?')
                    console.log(e)
                }
            }

            this.setStatus('ERROR', 'Unknown error')
            console.log(e.response)
            msg.isError = true
            msg.error = {
                reason: 'UNKNOWN_ERROR'
            }

            return msg
        }
    }
}

module.exports = GetPlaybackState