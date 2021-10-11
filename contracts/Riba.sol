// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/*
 * Token to pay the interest gained by the users
 */
contract Riba is ERC20 {

    address public theMinter;
    
    event MinterPassed(address indexed oldMinter, address newMinter);
    
    constructor() payable ERC20("Riba", "RIB"){
        theMinter = msg.sender;
    }
    
	/*
	 * Pass the minter function to the smart contract that will play the role of the bank
	 */
    function passMinter(address newMinter) public returns(bool) {
        require(msg.sender == theMinter, "You are not allowed to the pass the minter role");
        theMinter = newMinter;
        
        emit MinterPassed(msg.sender, theMinter);
        return true;
    }
    
	/*
	 * Mints an amount of Riba tokens
	 */
    function mint(address account, uint256 amount) public{
        require(msg.sender == theMinter, "You are not allowed to mint new tokens");
        _mint(account, amount);
    }
    
}