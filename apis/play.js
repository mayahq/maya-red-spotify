const { getPlayerStateNative } = require('../utils/playerStateNative')
const { playNative } = require('../utils/playNative')

module.exports = function (RED) {

    const axios = require('axios')

    function SpotifyTest(config) {
      RED.nodes.createNode(this, config)
      this.uri = config.uri
      this.payloadTypeUri = config.payloadTypeUri
      var node = this
  
      this.credentials = RED.nodes.getCredentials(config.session)

      async function getValue(value, valueType, msg) {
        return new Promise(function (resolve, reject) {
          if (valueType === "str") {
            resolve(value)
          } else {
            RED.util.evaluateNodeProperty(value, valueType, this, msg, function (
              err,
              res
            ) {
              if (err) {
                node.error(err.msg)
                reject(err.msg)
              } else {
                resolve(res)
              }
            })
          }
        })
      }
      
      // Retrieve the config node
      this.on("input", async function (msg) {

        node.status({
          fill: "yellow",
          shape: "dot",
          text: "Starting playback..."
        })

        let uri = await getValue(this.uri, this.payloadTypeUri, msg)
        const objectType = uri.split(':')[1]
        const request = {
          method: "PUT",
          url: 'https://api.spotify.com/v1/me/player/play',
          data: {},
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`
          }
        }

        if (objectType === 'track') {
          request.data["uris"] = [uri]
        } else {
          request.data["context_uri"] = uri
        }

        // If the spotify app is already running and playing something
        // we know the user is listening through this only, so we try
        // to control it natively (only for macOS)
        const nativePlayerState = getPlayerStateNative()
        if (nativePlayerState === 'playing') {
          playNative(uri)
          node.send(msg)
          console.log('Played natively')
          node.status({
            fill: "green",
            shape: "dot",
            text: "Playing"
          })
          return
        }

        axios(request)
          .then((response) => {
            node.status({
              fill: "green",
              shape: "dot",
              text: "Playing"
            })
            node.send(msg)
          })
          .catch((err) => {
            // Attempt to play on native player on if there is no active
            // session (only for MacOS)
            if (err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
              const played = playNative(uri)
              if (played === false) {
                msg.errorData = {
                  reason: 'NO_ACTIVE_DEVICE',
                  uri: uri
                }
                console.log('ERROR', err.response.data)
                msg.error = true
                node.status({
                  fill: "red",
                  shape: "ring",
                  text: `error: ${err.toString().substring(0, 10)}...`
                })
              }
              node.status({
                fill: "green",
                shape: "dot",
                text: "Playing"
              })
              node.send(msg)
              return
            }

            msg.error = true
            node.send(msg)
            return
          })
      })
    }
    
    RED.nodes.registerType("Play", SpotifyTest)
  }
  