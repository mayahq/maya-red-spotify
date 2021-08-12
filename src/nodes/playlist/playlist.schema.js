const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const makeRequestWithRefresh = require('../../util/reqWithRefresh')

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

    async onMessage(msg, vals) {
        if (vals.action.selected === 'addTracks') {
            this.setStatus('PROGRESS', 'Adding track to playlist')
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
                const { data } = await makeRequestWithRefresh(this, request)
                msg.playlistSnapshotId = data.snapshot_id
                this.setStatus('SUCCESS', 'Added')
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
}

module.exports = Playlist