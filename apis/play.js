module.exports = function (RED) {

    const axios = require('axios')

    function SpotifyTest(config) {
      RED.nodes.createNode(this, config);
      this.uri = config.uri;
      this.payloadTypeUri = config.payloadTypeUri;
      var node = this;
  
      this.credentials = RED.nodes.getCredentials(config.session);

      async function getValue(value, valueType, msg) {
        return new Promise(function (resolve, reject) {
          if (valueType === "str") {
            resolve(value);
          } else {
            RED.util.evaluateNodeProperty(value, valueType, this, msg, function (
              err,
              res
            ) {
              if (err) {
                node.error(err.msg);
                reject(err.msg);
              } else {
                resolve(res);
              }
            });
          }
        });
      }
      
      // Retrieve the config node
      this.on("input", async function (msg) {

        if (this.expiryDate <= Date.now()) {
          await this.session.refreshCreds();
          this.credentials = RED.nodes.getCredentials(config.session);
        }

        node.status({
          fill: "yellow",
          shape: "dot",
          text: "Starting playback..."
        });

        let uri = await getValue(this.uri, this.payloadTypeUri, msg)
        const objectType = uri.split(':')[1];
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

        axios(request)
          .then((response) => {
            node.status({
              fill: "green",
              shape: "dot",
              text: "Playing"
          })
            console.log(response.data)
            node.send(msg)
          })
          .catch((err) => {
            console.log('ERROR', err.response.data)
            node.status({
              fill: "red",
              shape: "ring",
              text: `error: ${err.toString().substring(0, 10)}...`
          });
          })

        console.log(msg)
      });
    }
    
    RED.nodes.registerType("Play", SpotifyTest);
  };
  