module.exports = function (RED) {

    const axios = require('axios')
    const NUM_RESULTS = 10;

	function SpotifySearch(config) {
		RED.nodes.createNode(this, config);
		this.query = config.query;
		this.payloadTypeQuery = config.payloadTypeQuery;
		this.searchType = config.searchType;
		this.payloadTypeSearchType = config.payloadTypeSearchType;
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

		function getSimilarityScore(query, targetString) {
			const keywordSet = {}
			targetString.split(' ').forEach((kw) => keywordSet[kw.toLowerCase()] = true)
			const queryWordSet = {}
			query.split(' ').forEach((qw) => queryWordSet[qw.toLowerCase()] = true)

			let score = 0
			Object.keys(queryWordSet).forEach((qw) => {
				if (keywordSet[qw]) {
					score += 500
				}
			})

			return score
		}

		function constructResults(query, rawRes) {
			let results = []
			if (rawRes.tracks) {
				results = results.concat(rawRes.tracks.items.map((track) => {
					let score = track.popularity
					if (track.popularity > 50) {
						const realName = track.name.split('(')[0].split('feat.')[0]
						score += getSimilarityScore(query, realName)
					}

					let images = null
					if (track.album) {
						images = track.album.images
					}

					const result = {
						type: 'track',
						artists: track.artists.map((artist) => artist.name).join(', '),
						uri: track.uri,
						score: score,
						name: track.name,
						images: images,
					}

					if (images.length > 0) {
						result.imageUrl = images[images.length-1].url
					}

					return result
				}))
			}
			if (rawRes.albums) {
				results = results.concat(rawRes.albums.items.map((album) => {
					const result = {
						type: 'album',
						artists: album.artists.map((artist) => artist.name).join(', '),
						uri: album.uri,
						name: album.name,
						images: album.images
					}

					let images = album.images
					if (images && images.length > 0) {
						result.imageUrl = images[images.length-1].url
					}
					
					return result
				}))
			}
			if (rawRes.artists) {
				results = results.concat(rawRes.artists.items.map((artist) => {
					let score = artist.popularity
					if (artist.popularity > 40) {
						score += getSimilarityScore(query, artist.name)
					}
					// console.log('Artist', artist.name, score)
					const result = {
						type: 'artist',
						uri: artist.uri,
						score: score,
						name: artist.name,
						images: artist.images
					}

					let images = artist.images
					if (images && images.length > 0) {
						result.imageUrl = images[images.length-1].url
					}
					
					return result
				}))
				
			}

			const compare = (r1, r2) => {
				const order = ['track', 'artist']
				if (r1.score !== r2.score) {
					return r2.score - r1.score 
				} else {
					return order.indexOf(r2.type) - order.indexOf(r1.type)
				}
			}

			// console.log(results)
			// console.log('UNSORTED ----')
			// results.forEach((res) => console.log(res.type, res.name, res.score))
			// console.log('SORTED ----')
			// results.sort(compare).forEach((res) => console.log(res.type, res.name, res.score))
			return results
				.filter((res) => res.score) // Sort only those results which have a score
				.sort(compare).slice(0, NUM_RESULTS)
				.concat(results.filter((res) => res.score === undefined))
		}
      
      // Retrieve the config node
      	this.on("input", async function (msg) {

			if (this.expiryDate <= Date.now()) {
				await this.session.refreshCreds();
				this.credentials = RED.nodes.getCredentials(config.session);
			}

			const query = await getValue(this.query, this.payloadTypeQuery, msg)
			const type = await getValue(this.searchType, this.payloadTypeSearchType, msg)
			node.status({
				fill: "yellow",
				shape: "dot",
				text: `Searching for ${query}`
			});

			const search = encodeURI(query)

			const request = {
				method: 'GET',
				url: `https://api.spotify.com/v1/search?q=${search}&type=${type}`,
				headers: {
					Authorization: `Bearer ${this.credentials.accessToken}`
				}
			}

			axios(request)
				.then((response) => {
					node.status({
						fill: "green",
						shape: "dot",
						text: "Found"
					})
					// console.log('BRUHHH??????')
					// console.log(response.data)
					msg.searchResults = constructResults(query, response.data)
					node.send(msg)
				})
				.catch((err) => {
					// console.log('ERROR', err.response.code, err.response.data)
					console.log(err)
					node.status({
						fill: "red",
						shape: "ring",
						text: `error: ${err.toString().substring(0, 10)}...`
					})
				});
		});
    }

    RED.nodes.registerType("Search", SpotifySearch);
  };
  