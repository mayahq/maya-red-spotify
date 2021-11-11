const SECOND = 1000
const MINUTE = 60*SECOND
const HOUR = 60*MINUTE

async function refresh(node) {
    console.log('Trying to acquire token refresh lock')
    const toks = await node.tokens.lockAndRefresh(async (tokens) => {
        console.log('Lock acquired')
        const { access_token, refresh_token, lastUpdated } = tokens
        
        if (Date.now() - lastUpdated < 1*HOUR - 2*MINUTE) {
            console.log('Tokens were already updated, no need to refresh')
            console.log('New tokens:', tokens)
            node.tokens.vals = { ...(node.tokens.vals), ...tokens }
            return tokens
        }

        console.log('Tokens were not updated, refreshing with', tokens)
        try {
            // const newTokens = await refreshTokens({ access_token, refresh_token })
            const newTokens = await node.tokens.refresh({ access_token, refresh_token })
            if (newTokens.error) {
                console.log('There was an error:', newTokens.error)
                return {
                    access_token: null,
                    refresh_token: null,
                    lastUpdated: null,
                    error: true
                }
            }
            console.log('Tokens refreshed via API. New tokens:', newTokens)
            const result = {
                ...newTokens,
                lastUpdated: Date.now()
            }
            await node.tokens.set({ ...(node.tokens.vals), ...result }, {
                lock: false
            })

            return result
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
                lastUpdated: null,
                error: true
            }
        }
    })

    return toks
}

module.exports = refresh