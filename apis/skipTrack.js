module.exports = function (RED) {

    const axios = require('axios')

    function SpotifySkipTrack(config) {
      RED.nodes.createNode(this, config);
      var node = this;
  
      this.credentials = RED.nodes.getCredentials(config.session);
      
      // Retrieve the config node
      this.on("input", async function (msg) {

        if (this.expiryDate <= Date.now()) {
          await this.session.refreshCreds();
          this.credentials = RED.nodes.getCredentials(config.session);
        }

        node.status({
          fill: "yellow",
          shape: "dot",
          text: "Skipping track..."
        });

        const request = {
            method: 'POST',
            url: 'https://api.spotify.com/v1/me/player/next',
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
            console.log(response.data)
            node.send(msg)
          })
          .catch((err) => {
            console.log('ERROR', err.response.status, err.response.data)
            node.status({
              fill: "red",
              shape: "ring",
              text: `error: ${err.toString().substring(0, 10)}...`
          });
          })

        console.log(msg)
      });
    }
    
    RED.nodes.registerType("skip-track", SpotifySkipTrack);
  };
  