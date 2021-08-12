const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const makeRequestWithRefresh = require('../../util/reqWithRefresh')


const DAT = ['num', 'msg', 'global']


class Library extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            masterKey: 'eda344e1ab8b9e122aab3350eec33e95802c7fe68aac8ad85c5c64d97e45ef1a'
        })
    }

    static schema = new Schema({
        name: 'library',
        label: 'library',
        category: 'Spotify',
        isConfig: false,
        fields: {
            action: new fields.SelectFieldSet({
                fieldSets: {
                    likeSong: {
                        lSongId: new fields.Typed({ type: 'str', allowedTypes: DAT, displayName: 'Song ID' })
                    },
                    likeAlbum: {
                        lAlbumId: new fields.Typed({ type: 'str', allowedTypes: DAT, displayName: 'Album ID' })
                    },
                    unlikeSong: {
                        uSongId: new fields.Typed({ type: 'str', allowedTypes: DAT, displayName: 'Song ID' })
                    },
                    unlikeAlbum: {
                        uAlbumId: new fields.Typed({ type: 'str', allowedTypes: DAT, displayName: 'Album ID' })
                    },
                    getLikedSongs: {
                        sLimit: new fields.Typed({ type: 'num', allowedTypes: DAT, displayName: 'Limit' }),
                        sOffset: new fields.Typed({ type: 'num', allowedTypes: DAT, displayName: 'Offset' })
                    },
                    getLikedAlbums: {
                        aLimit: new fields.Typed({ type: 'num', allowedTypes: DAT, displayName: 'Limit' }),
                        aOffset: new fields.Typed({ type: 'num', allowedTypes: DAT, displayName: 'Offset' })
                    }
                }
            })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    getTracks(rawRes) {
        const tracks = []
        rawRes.items.forEach((item) => {
            let images = null
            if (item.track.album) {
                images = item.track.album.images
            }

            const track = {
                type: 'track',
                artists: item.track.artists.map((artist) => artist.name).join(', '),
                uri: item.track.uri,
                name: item.track.name,
                images: images
            }

            if (images.length > 0) {
                track.imageUrl = images[images.length - 1].url
            }

            tracks.push(track)
        })
        return tracks
    }

    getAlbums(rawRes) {
        const albums = []
        rawRes.items.forEach((item) => {
            const album = {
                type: 'album',
                artists: item.album.artists.map((artist) => artist.name).join(', '),
                uri: item.album.uri,
                name: item.album.name,
                images: item.album.images
            }

            let images = album.images
            if (images && images.length > 0) {
                album.imageUrl = images[images.length - 1].url
            }

            albums.push(album)
        })
        return albums
    }

    async onMessage(msg, vals) {
        const request = {
            headers: {
                Authorization: `Bearer ${this.tokens.vals.access_token}`
            }
        }

        switch (vals.action.selected) {
            case 'likeSong': {
                this.setStatus('PROGRESS', 'Liking song')
                let ids = vals.action.childValues.lSongId
                if (Array.isArray(ids)) {
                    ids = ids.join(',')
                }
                request.method = 'PUT'
                request.url = `https://api.spotify.com/v1/me/tracks?ids=${ids}`
                break
            }
            case 'likeAlbum': {
                this.setStatus('PROGRESS', 'Liking album')
                let ids = vals.action.childValues.lAlbumId
                if (Array.isArray(ids)) {
                    ids = ids.join(',')
                }
                request.method = 'PUT'
                request.url = `https://api.spotify.com/v1/me/albums?ids=${ids}`
                break
            }
            case 'unlikeSong': {
                this.setStatus('PROGRESS', 'Unliking song')
                let ids = vals.action.childValues.uSongId
                if (Array.isArray(ids)) {
                    ids = ids.join(',')
                }
                request.method = 'DELETE'
                request.url = `https://api.spotify.com/v1/me/tracks?ids=${ids}`
                break
            }
            case 'unlikeAlbum': {
                this.setStatus('PROGRESS', 'Unliking album')
                let ids = vals.action.childValues.uAlbumId
                if (Array.isArray(ids)) {
                    ids = ids.join(',')
                }
                request.method = 'DELETE'
                request.url = `https://api.spotify.com/v1/me/albums?ids=${ids}`
                break
            }
            case 'getLikedSongs': {
                this.setStatus('PROGRESS', 'Getting liked songs')
                const { sOffset, sLimit } = vals.action.childValues
                request.method = 'GET'
                request.url = `https://api.spotify.com/v1/me/tracks?limit=${sLimit}&offset=${sOffset}`
                break
            }
            case 'getLikedAlbums': {
                this.setStatus('PROGRESS', 'Getting liked albums')
                const { aOffset, aLimit } = vals.action.childValues
                request.method = 'GET'
                request.url = `https://api.spotify.com/v1/me/albums?limit=${aLimit}&offset=${aOffset}`
                break
            }
        }

        try {
            const response = await makeRequestWithRefresh(this, request)
            if (vals.action.selected === 'getLikedSongs') {
                msg.searchResults = this.getTracks(response.data)
                this.setStatus('SUCCESS', 'Done')
                return msg
            }
            else if (vals.action.selected === 'getLikedAlbums') {
                msg.searchResults = this.getAlbums(response.data)
                this.setStatus('SUCCESS', 'Done')
                return msg
            }

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

module.exports = Library