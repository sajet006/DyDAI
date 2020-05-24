require('dotenv').config();
var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = process.env["MNEMONIC"];
var tokenKey = process.env["ENDPOINT_KEY"];
module.exports = {
  compilers: {
    solc: {
      optimizer: {
        enabled: true,
        runs: 200
      },
	 version: "0.5.12",    // Fetch exact version from solc-bin (default: truffle's version)
	}
	},
  networks: {
    // development: {
    //   host: 'localhost',
    //   port: 8545,
    //   network_id: '*',
    //   from: ""
    // },
    kovan: {
      host: "localhost",
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://kovan.infura.io/v3/"+tokenKey)
      },
      network_id: '42'
    },
    // ropsten: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, "")
    //   },
    //   network_id: '*',
    //   gas: 6000000,
    //   gasPrice: 30000000000
    // },
    // rinkeby: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, "")
    //   },
    //   network_id: '*',
    //   gas: 6000000,
    //   gasPrice: 30000000000
    // },
    // mainnet: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, "")
    //   },
    //   network_id: '*',
    //   gas: 3000000,
    //   gasPrice: 10000000000
    // }
  }
}
