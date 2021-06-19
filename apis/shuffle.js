module.exports = function (RED) {

    const axios = require('axios')

    function SpotifyToggleShuffle(config) {
      RED.nodes.createNode(this, config);
      var node = this;
  
      this.credentials = RED.nodes.getCredentials(config.session);

      let shuffleState = false;
      
      // Retrieve the config node
      this.on("input", async function (msg) {
        shuffleState = !shuffleState

        node.status({
          fill: "yellow",
          shape: "dot",
          text: "Toggling shuffle..."
        });

        const request = {
            method: 'PUT',
            url: `https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`,
            headers: {
                Authorization: `Bearer ${this.credentials.accessToken}`
            }
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
    
    RED.nodes.registerType("toggle-shuffle", SpotifyToggleShuffle);
  };
  