const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { playNative } = require('../../../utils/playNative')
const makeRequestWithRefresh = require('../../util/reqWithRefresh')

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

        try {
            await makeRequestWithRefresh(this, request)
            this.setStatus('SUCCESS', 'Done')
            return msg
        } catch (e) {
            if (e.response) {
                if (e.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
                    const played = playNative(uri)
                    if (played) {
                        this.setStatus('SUCCESS', 'Done')
                        return msg
                    } else {
                        msg.__isError = true
                        msg.__error = {
                            ...e,
                            message: 'We can only control Spotify if you have an active Spotify session going on. \
                            To start a session, please open Spotify and manually play something.'
                        }
                    }
                }
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

module.exports = Play