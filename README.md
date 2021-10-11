# Atrac-Bank

Trace labs Bank smart contract task

Implementation of a bank smart contract wich enables anyone to deposit an amount X of ATRAC ERC20 tokens to their savings (staking) accounts.

The bank contract also contains a reward pool of R ATRAC tokens deposited by the contract owner.

The bank smart contract has already been deployed to the rinkeby testnet using a personal account and infura access point wich are not provided for security reasons.

The address of the bank smart contract is: 0x0A8f0BBe1249e1bCd9c707d25D5AC85E8e541869
And the the address used to deploy the contract is: 0x643cB2DC45e4Af6F51165f6289353ec9B9072bf5

## Dependecies

We use the truffle framework for the development, testing and deployment ot the bank smart contract

All the requiered dependecies where installed and managed using npm 

We use the `web.js` library and the `hdwallet-provider`. Some default installation of truffle do not include `hdwallet-provider` so I recommend that you install it
using npm with the command `npm install @truffle/hdwallet-provider`


## Use
Since we use the truffle framework we can use the following truffle commands:
- In order to comiple our smar contracts, type `truffle compile` in your terminal
- In order to run all the tests, type `truffle test` in your terminal
- In order to deploy the contracts to the rinkeby testnet, type `truffle migrate --network rinkeby` in your terminal

In order to be able to deploy the contracts using the command `truffle migrate --network rinkeby` we need to access the file
`truffle-config.js`  to provide a rinkeby account's private key and a access point for the hdWalletProvider in order to connect to the 
rinkeby testnet




