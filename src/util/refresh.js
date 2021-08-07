const axios = require('axios')
const querystring = require('querystring')

const SPOTIFY_CLIENT_ID = 'f3cf9f184b594ead8711c0a257b67e30'
const SECOND = 1000
const MINUTE = 60*SECOND
const HOUR = 60*MINUTE


async function refreshTokens1({ access_token, refresh_token }) {
    const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refresh_token,
            client_id: SPOTIFY_CLIENT_ID,
        }),
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    )

    return { 
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        lastUpdated: Date.now()
    }
}

// async function refreshTokens({ access_token, refresh_token }) {
//     const tokens = await 
// }

function sleep(timeout) {
    return new Promise((res, rej) => {
        setTimeout(() => res(), timeout)
    })
}


async function refresh(node) {
    console.log('Trying to acquire token refresh lock')
    const toks = await node.tokens.lockAndRefresh(async (tokens) => {
        console.log('Lock acquired')
        const { access_token, refresh_token, lastUpdated } = tokens
        if (Date.now() - lastUpdated < 1*HOUR - 2*MINUTE) {
            console.log('Tokens were already updated, no need to refresh')
            // console.log('Stalling')
            // await sleep(2000)
            // console.log('Done stalling')
            console.log('New tokens:', tokens)
            return tokens
        }

        console.log('Tokens were not updated, refreshing with', tokens)
        try {
            // const newTokens = await refreshTokens({ access_token, refresh_token })
            const newTokens = await node.tokens.refresh({ access_token, refresh_token })
            console.log('Tokens refreshed via API. New tokens:', newTokens)
            return {
                ...newTokens,
                lastUpdated: Date.now()
            }
        } catch (e) {
            console.log('Unable to refresh spotify token')
            if (e.response) {
                console.log('config', e.config)
                console.log('RESPONSE STATUS', e.response.status)
                console.log('RESPONSE DATA', e.response.data)
            } else {
                console.log(e)
            }

            return {
                access_token: null,
                refresh_token: null,
                lastUpdated: null
            }
        }
    })

    return toks
}

module.exports = refresh