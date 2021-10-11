const Bank = artifacts.require("Bank");

module.exports = async function(deployer) {
	
	// ERC20 token transfer method abi
	var abi = [{
		"inputs": [
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}]
	
	// The address for the ERC20 token ATRAC
	let atrac_address = "0x98d9a611ad1b5761bdc1daac42c48e4d54cf5882";
	
	// We call the Atrac contract method transfer to transfer 1000 Atrac tokens to the bank
	let atrac = new web3.eth.Contract(abi, atrac_address );
	let accounts = await web3.eth.getAccounts();
	let admin = accounts[0];
	
	
	/* 
	 * We deploy the bank contract with a reward of 1000 ATRAC tokens and the with a period
	 * of 3 days in seconds (259200)
	 */
	await deployer.deploy(Bank, atrac_address, web3.utils.toWei("1000"), 259200);
	
	const bank = await Bank.deployed();
	
	let result = await atrac.methods.transfer(bank.address, web3.utils.toWei("1000")).send({from: admin}); 
	
	console.log(bank.address);
	
};