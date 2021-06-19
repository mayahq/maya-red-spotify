const { getPlayerStateNative, pauseNative, resumeNative } = require('../utils/playerStateNative');

module.exports = function (RED) {

    const axios = require('axios')

    function SpotifyTogglePlayback(config) {
      RED.nodes.createNode(this, config);
      var node = this;
  
      this.credentials = RED.nodes.getCredentials(config.session);
      
      let shouldPause = false;
      // Retrieve the config node
      this.on("input", async function (msg) {
        if (msg.shouldPause !== null && msg.shouldPause !== undefined) {
            shouldPause = msg.shouldPause
        } else {
            shouldPause = !shouldPause
        }

        node.status({
          fill: "yellow",
          shape: "dot",
          text: shouldPause ? "Pausing playback..." : "Resuming playback..."
        });

        // If the spotify player is already running and playing something,
        // try performing the play/pause action natively (for macOS only)
        if (getPlayerStateNative() === 'playing') {
          if (shouldPause) {
            const paused = pauseNative()
            if (paused) {
              node.status({
                fill: "green",
                shape: "dot",
                text: "Done"
              })
              console.log('Paused natively')
              node.send(msg)
              return
            }
          } else {
            const resumed = resumeNative()
            if (resumed) {
              node.status({
                fill: "green",
                shape: "dot",
                text: "Done"
              })
              console.log('Resumed natively')
              node.send(msg)
              return
            }
          }
        }

        // Only if the native pausing fails (or wasn't possible due
        // playback running on another device), use the API
        const request = {
            method: 'PUT',
            url: 'https://api.spotify.com/v1/me/player/pause',
            headers: {
                Authorization: `Bearer ${this.credentials.accessToken}`
            }
        }
        if (!shouldPause) {
            request.url = 'https://api.spotify.com/v1/me/player/play'
        }

        axios(request)
          .then((response) => {
            node.status({
              fill: "green",
              shape: "dot",
              text: "Done"
            })
            node.send(msg)
          })
          .catch((err) => {
            console.log('ERROR', err.response.status, err.response.data)
            if (err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
              msg.errorData = {
                reason: 'NO_ACTIVE_DEVICE',
              }
              node.send(msg);
            }
            node.status({
              fill: "red",
              shape: "ring",
              text: `error: ${err.toString().substring(0, 10)}...`
          });
          })
      });
    }
    
    RED.nodes.registerType("toggle-playback", SpotifyTogglePlayback);
  };
  