const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const axios = require('axios')
const { getPlayerStateNative } = require('../../../utils/playerStateNative')
const { playNative } = require('../../../utils/playNative')
const refresh = require('../../util/refresh')

// const playNative = require('../../../utils/')

const DAT = ['str', 'msg', 'global']

class Play extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            masterKey: 'eda344e1ab8b9e122aab3350eec33e95802c7fe68aac8ad85c5c64d97e45ef1a'
        })
    }

    static schema = new Schema({
        name: 'play',
        label: 'Play',
        category: 'Spotify',
        isConfig: false,
        fields: {
            uri: new fields.Typed({ type: 'str', allowedTypes: DAT })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    onInit() {

    }

    async refreshTokens() {
        console.log('Play node refreshing tokens')
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

    async onMessage(msg, vals) {
        this.setStatus('PROGRESS', 'Starting playback...')
        const uri = vals.uri

        const objectType = uri.split(':')[1]
        const request = {
            method: "PUT",
            url: 'https://api.spotify.com/v1/me/player/play',
            data: {},
            headers: {
                Authorization: `Bearer ${this.tokens.vals.access_token}`
            }
        }

        if (objectType === 'track') {
            request.data["uris"] = [uri]
        } else {
            request.data["context_uri"] = uri
        }

        // If the spotify app is already running and playing something
        // we know the user is listening through this only, so we try
        // to control it natively (only for macOS)
        // const nativePlayerState = getPlayerStateNative()
        // if (nativePlayerState === 'playing') {
        //     playNative(uri)
        //     console.log('Played natively')
        //     this.setStatus('SUCCESS', 'Playing')
        //     return msg
        // }

        try {
            const response = await axios(request)
            console.log('First access token:', this.tokens.vals.access_token)
            this.setStatus('SUCCESS', 'Playing')
            return msg
        } catch (e) {
            const response = e.response
            if (response) {
                if (response.data.error.reason === 'NO_ACTIVE_DEVICE') {
                    const played = playNative(uri)
                    if (played === false) {
                        msg.isError = true
                        msg.error = {
                            reason: 'NO_ACTIVE_DEVICE',
                            uri: uri
                        }
                        this.setStatus('ERROR', 'No active device')
                        return msg
                    } else {
                        this.setStatus('SUCCESS', 'Playing')
                        return msg
                    }
                }
                else if (parseInt(response.status) === 401) {
                    const { access_token } = await this.refreshTokens()
                    console.log('New access token is', access_token)
                    if (!access_token) {
                        this.setStatus('ERROR', 'Failed to refresh access token')
                        msg.isError = true
                        msg.error = {
                            reason: 'TOKEN_REFRESH_FAILED',
                            uri: uri
                        }
                        return msg
                    } 

                    request.headers.Authorization = `Bearer ${access_token}`
                    try {
                        const response = await axios(request)
                        this.setStatus('SUCCESS', 'Playing')
                        return msg
                    } catch (e) {
                        console.log('What just happened?')
                        if (e.response) {
                            console.log('config', e.config)
                            console.log('RESPONSE STATUS', e.response.status)
                            console.log('RESPONSE DATA', e.response.data)
                        } else {
                            console.log(e)
                        }
                        console.log('-------------------------------------------------')
                    }
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

module.exports = Play