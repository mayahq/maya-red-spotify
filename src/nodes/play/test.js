try {
    const response = '123'
    throw new Error('whoops')
} catch (e) {
    const response = '456'
    try {
        const response = '789'
        console.log('bruh')
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