"use strict";

/*
 * Created with @iobroker/create-adapter v1.17.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
const https = require("https");


class Stockmarket extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "stockmarket",
		});
		this.on("ready", this.onReady.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	async onReady() {
		this.log.info("initialize stock market adapter"); 

		const apikey = this.config.apiKey;
		if(apikey == "" || apikey == "string") {
			this.log.error("No API Key set. Please edit your adapter settings and restart this adapter!");
			this.disable();
			return;
		}

		this.log.info("APIKEY is set: '" + this.config.apiKey + "'");

		this.log.info("stocks to check: " + this.config.ownStocks);
		const stocks = this.config.ownStocks.split(",");

		stocks.forEach(stock => {
			stock = stock.replace(" ", "");
			const url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=" + stock + "&interval=5min&apikey=" + apikey;
			this.log.info("checking stock for: " + stock + " with URL: " + url);

			https.get(url, (resp) => {
				const data = [];
				resp.on("data", d => data.push(d));
				resp.on("end", () => {
					const jsonstrong = JSON.parse(data.join(""));
	
					for (const i in jsonstrong["Time Series (5min)"]) {
						for (const e in jsonstrong["Time Series (5min)"][i]) {
							const stateName = stock + "." + e.replace(". ", "");
							let unit = "USD";
							if(e.replace(". ", "") == "5volume") { unit = ""; }

							this.setObjectNotExists(stateName, {
								type: "state",
								common: {
									name: "Last Value for " + e,
									type: "string",
									role: "text",
									unit: unit,
									read: true,
									write: false
								},
								native: {}
							});

							this.setState(stateName, jsonstrong["Time Series (5min)"][i][e]);
						}
						break;
					}					
				});
	
			}).on("error", (err) => {
				this.log.error("Error: " + err.message);
				this.disable();
				return;
			});
		});
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Stockmarket(options);
} else {
	// otherwise start the instance directly
	new Stockmarket();
}