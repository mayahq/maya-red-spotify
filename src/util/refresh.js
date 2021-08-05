const axios = require('axios')
const querystring = require('querystring')

const SPOTIFY_CLIENT_ID = 'f3cf9f184b594ead8711c0a257b67e30'
const SECOND = 1000
const MINUTE = 60*SECOND
const HOUR = 60*MINUTE


async function refresh(node) {
    const currentTokens = await node.tokens.get()
    if (Date.now() - currentTokens.lastUpdated < 1*HOUR - 2 * MINUTE
        && node.tokens.vals.accessToken !== currentTokens.accessToken) {
        console.log('Tokens were already updated, no need to refresh')
        return currentTokens
    }

    console.log('Tokens were not updated, refreshing with', currentTokens)
    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: currentTokens.refreshToken,
                client_id: SPOTIFY_CLIENT_ID,
            }),
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        )

        const { access_token, refresh_token } = response.data
        const newTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            lastUpdated: Date.now()
        }

        return newTokens
        
    } catch (e) {
        console.log('Unable to refresh spotify token')
        console.log(e)

        return {
            accessToken: null,
            refreshToken: null,
            lastUpdated: null
        }
    }
}

module.exports = refresh