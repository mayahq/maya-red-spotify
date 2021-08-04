const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const { default: axios } = require('axios')
const refresh = require('../../util/refresh')

const DAT = ['str', 'msg', 'global']
const NUM_RESULTS = 10;

class Search extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts,
            masterKey: 'eda344e1ab8b9e122aab3350eec33e95802c7fe68aac8ad85c5c64d97e45ef1a'
        })
    }

    static schema = new Schema({
        name: 'search',
        label: 'Search',
        category: 'Spotify',
        isConfig: false,
        fields: {
            query: new fields.Typed({ type: 'str', allowedTypes: DAT }),
            searchType: new fields.Typed({ type: 'str', allowedTypes: DAT, defaultVal: 'artist,track' })
        },
        color: '#37B954',
        icon: 'spotify.png'
    })

    async refreshTokens() {
        const newTokens = await refresh(this)
        await this.tokens.set(newTokens)
        return newTokens
    }

    constructPlaylistResults(playlists) {
        const results = playlists.map((playlist) => {
            const res = {
                type: 'playlist',
                name: playlist.name,
                uri: playlist.uri,
                images: playlist.images,
                imageUrl: null
            }

            if (playlist.images.length > 0) {
                res.imageUrl = playlist.images[playlist.images.length - 1].url
            }

            return res
        })

        return results
    }

    getSimilarityScore(query, targetString) {
        const keywordSet = {}
        targetString.split(' ').forEach((kw) => keywordSet[kw.toLowerCase()] = true)
        const queryWordSet = {}
        query.split(' ').forEach((qw) => queryWordSet[qw.toLowerCase()] = true)

        let score = 0
        Object.keys(queryWordSet).forEach((qw) => {
            if (keywordSet[qw]) {
                score += 500
            }
        })

        return score
    }

    constructResults(query, rawRes) {
        let results = []
        if (rawRes.tracks) {
            results = results.concat(rawRes.tracks.items.map((track) => {
                let score = track.popularity
                if (track.popularity > 50) {
                    const realName = track.name.split('(')[0].split('feat.')[0]
                    score += this.getSimilarityScore(query, realName)
                }

                let images = null
                if (track.album) {
                    images = track.album.images
                }

                const result = {
                    type: 'track',
                    artists: track.artists.map((artist) => artist.name).join(', '),
                    uri: track.uri,
                    score: score,
                    name: track.name,
                    images: images,
                }

                if (images.length > 0) {
                    result.imageUrl = images[images.length - 1].url
                }

                return result
            }))
        }
        if (rawRes.albums) {
            results = results.concat(rawRes.albums.items.map((album) => {
                const result = {
                    type: 'album',
                    artists: album.artists.map((artist) => artist.name).join(', '),
                    uri: album.uri,
                    name: album.name,
                    images: album.images
                }

                let images = album.images
                if (images && images.length > 0) {
                    result.imageUrl = images[images.length - 1].url
                }

                return result
            }))
        }
        if (rawRes.artists) {
            results = results.concat(rawRes.artists.items.map((artist) => {
                let score = artist.popularity
                if (artist.popularity > 40) {
                    score += this.getSimilarityScore(query, artist.name)
                }
                // console.log('Artist', artist.name, score)
                const result = {
                    type: 'artist',
                    uri: artist.uri,
                    score: score,
                    name: artist.name,
                    images: artist.images
                }

                let images = artist.images
                if (images && images.length > 0) {
                    result.imageUrl = images[images.length - 1].url
                }

                return result
            }))

        }

        const compare = (r1, r2) => {
            const order = ['track', 'artist']
            if (r1.score !== r2.score) {
                return r2.score - r1.score
            } else {
                return order.indexOf(r2.type) - order.indexOf(r1.type)
            }
        }

        return results
            .filter((res) => res.score) // Sort only those results which have a score
            .sort(compare).slice(0, NUM_RESULTS)
            .concat(results.filter((res) => res.score === undefined))
    }

    async fetchResults(type, query, request) {
        const response = await axios(request)
        if (type === 'playlist') {
            return this.constructPlaylistResults(response.data.items)
        } else {
            return this.constructResults(query, response.data)
        }
    }

    onInit() {
        this.tokens.get()
            .then((vals) => this.tokens.vals = vals)
    }

    async onMessage(msg, vals) {
        const query = vals.query
        const type = vals.searchType

        this.setStatus('PROGRESS', `Searching for ${query}`)
        const search = encodeURI(query)

        let request = {
            method: 'GET',
            url: `https://api.spotify.com/v1/search?q=${search}&type=${type}`,
            headers: {
                Authorization: `Bearer ${this.tokens.vals.accessToken}`
            }
        }

        if (type === 'playlist') {
            request = {
                method: 'GET',
                url: `https://api.spotify.com/v1/me/playlists?limit=50`,
                headers: {
                    Authorization: `Bearer ${this.tokens.vals.accessToken}`
                }
            }
        }

        try {
            const results = await this.fetchResults(type, query, request)
            this.setStatus('SUCCESS', `Done`)
            msg.searchResults = results
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
                if (!accessToken) {
                    this.setStatus('ERROR', 'Failed to refresh access token')
                    msg.isError = true
                    msg.error = {
                        reason: 'TOKEN_REFRESH_FAILED',
                        uri: uri
                    }
                    return msg
                }

                request.headers.Authorization = `Bearer ${accessToken}`
                try {
                    const results = await this.fetchResults(type, query, request)
                    this.setStatus('SUCCESS', `Done`)
                    msg.searchResults = results
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

module.exports = Search