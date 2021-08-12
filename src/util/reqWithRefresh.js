const axios = require('axios')
const refresh = require('./refresh')

async function makeRequestWithRefresh(node, request) {
    try {
        const response = await axios(request)
        return response
    } catch (e) {
        if (e.response && parseInt(e.response.status) === 401) {
            const { access_token } = await refresh(node)
            if (!access_token) {
                const err = new Error('Unable to refresh tokens')
                err.name = 'TOKEN_REFRESH_FAILED'
                throw err
            }

            request.headers.Authorization = `Bearer ${access_token}`
            const response = await axios(request)
            return response
        } else {
            throw e
        }
    }
}

module.exports = makeRequestWithRefresh