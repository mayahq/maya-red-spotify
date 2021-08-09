const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const refresh = require('../../util/refresh')
const axios = require('axios')

class Playlist extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            masterKey: 'eda344e1ab8b9e122aab3350eec33e95802c7fe68aac8ad85c5c64d97e45ef1a'
        })
    }

    static schema = new Schema({
        name: 'playlist',
        label: 'Playlist',
        category: 'Spotify',
        isConfig: false,
        fields: {
            action: new fields.SelectFieldSet({
                fieldSets: {
                    addTracks: {
                        tracks: new fields.Typed({ type: 'str', allowedTypes: ['json', 'msg', 'flow', 'global'] }),
                        playlistId: new fields.Typed({ type: 'str', allowedTypes: ['msg', 'flow', 'global']})
                    }
                }
            })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    async refreshTokens() {
        console.log('Playlist node refreshing tokens')
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

    async onMessage(msg, vals) {
        if (vals.action.selected === 'addTracks') {
            const playlistId = vals.action.childValues.playlistId
            let tracks = vals.action.childValues.tracks
            if (typeof tracks === 'string') {
                tracks = [tracks]
            }

            const request = {
                method: 'POST',
                url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                data: {
                    uris: tracks
                },
                headers: {
                    Authorization: `Bearer ${this.tokens.vals.access_token}`
                }
            }

            try {
                const { data } = await axios(request)
                msg.playlistSnapshotId = data.snapshot_id
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
                        const { data } = await axios(request)
                        msg.playlistSnapshotId = data.snapshot_id
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
}

module.exports = Playlist