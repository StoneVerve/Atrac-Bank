// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/*
 * Bank that allows anyone to deposit an amount X of an ERC20 token Z to their staking account
 * The bank also has a reward pool, when users withdraw (unstakes) their tokens they recieve their
 * staked tokens and a proportional amount of the the reward pool.
 * The amount of the reward pool a user will get will also depend on the period a user chooses to withdraw the tokens
 * Each period lasts T seconds. If we consider t as the contract deployment time we get the following:
 *            -We have the deposit period that lasts from t to T + t
 *            -We have the lock period that lasts from T + t to t + 2T
 *            -We have the R1 period that lasts from t + 2T to t + 3T
 *            -We have the R2 period that lasts from t + 3T to t + 4T
 *            -We have the R3 period that lasts from t + 4T to the end of times
 */
contract Bank{
    
    // ERC20 Token address that the contract will use
    ERC20 token;
    
    mapping (address => uint256) public balances;
    mapping (address => bool) public hasStaked;
    
    address public admin;
    
    uint256 public totalStaked;
    uint256 public totalStakedR2;
    uint256 public totalStakedR3;
    
    uint256 private remainingReward;
    uint256 public R1;
    uint256 public R2;
    uint256 public R3;
    
    uint256 public depositPeriod;
    uint256 public lockPeriod;
    
    uint256 public R1Period;
    uint256 public R2Period;
    
    uint256 public activeUsers;
    bool public userWaited;
    
    
    
    /*
     * The main constructor receives the ERC20 token address, the amount of tokens in the reward pool and
     * period T in seconds
     * The contract uses seconds since the epoch to count time, therefor T is measure in seconds
     * The default admin of the contract is the address who calls the constructor 
     */
    constructor(address token_, uint256 reward_amount, uint256 period_) {
        require(token_ != address(0), "The ERC20 token can't be the address zero");
        require(reward_amount > 0, "The reward pool needs to be greater than zero");
        require(period_ > 0, "The period need to be grater than zero");
        token = ERC20(token_);
        admin = msg.sender;
        
        activeUsers = 0;
        userWaited = false;
        
        totalStaked = 0;
        totalStakedR2 = 0;
        totalStakedR3 = 0;
        
        depositPeriod = block.timestamp + period_;
        lockPeriod = depositPeriod + period_;
        
        R1Period = lockPeriod + period_;
        R2Period = R1Period + period_;
        
        R1 = calculateAmount(reward_amount, 20);
        R2 = calculateAmount(reward_amount, 30);
        R3 = calculateAmount(reward_amount, 50);
        
        remainingReward = reward_amount;
    }
    
    
    /*
     * Internal function to calculate the amount corresponding to a percentage given a total amount
     */
    function calculateAmount(uint256 total, uint256 percentage) pure private returns(uint256){
        return (percentage * total) / 100; 
    }
    
    /*
     * Internal function to calculate the percentage corresponding to an amount given a total amount
     */
    function calculatePercentage(uint256 total, uint256 amount) pure private returns(uint256) {
        require(total > 0, "You can not dive by zero");
        return (amount * 100) / total;
    }
    
    
    /* 
     * Allows a user to deposit an amount x of ERC20 tokens Z during the deposit period.
     * 
     * The user needs to first call the ERC20 token contract and approve the bank contract as a spender with 
     * the amount to tokens the be deposited. We do this in order the have a better control of the gas fees in case
     * the user decides to not go forward with the depoit.
     *
     * A user can deposit multiple times during the deposit period.
     * Onces the deposit period has ended the user can't deposit any more tokens.
     */
    function deposit(uint256 amount) public {
        require(msg.sender != admin, "The admin can't deposit tokens");
        require(block.timestamp <= depositPeriod, "You can no longer stake tokens");
        require(token.allowance(msg.sender, address(this)) >= amount, "The amount allowed to deposit from the contract needs to be greater than the amount deposited");
        token.transferFrom(msg.sender, address(this), amount);
        
        totalStaked += amount;
        totalStakedR2 = totalStaked;
        totalStakedR3 = totalStaked;
        
        balances[msg.sender] += amount;
        if(!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            activeUsers++;
        }
    }
    
    /* 
     * Allows a user to withdraw all the Z ERC20 tokens deposited by the user and also gives
     * the user their reward of the same Z ERC20 tokens corresponding the amount staked and the 
     * current period in wich the user is withdrawing
     * 
     * A user can't withdraw tokens during the deposit period or the lock period.
     *
     * A user can only withdraw tokens once.
     */
    function withdraw() public {
        uint256 call_time = block.timestamp;
        require(msg.sender != admin, "The admin can't withdraw tokens as a normal user");
        require(call_time > lockPeriod, "You can't withdraw yet");
        require(hasStaked[msg.sender], "You don't have any tokens staked");
        uint256 reward;
        if(call_time <= R1Period) {
            reward = _withdraw(R1, totalStaked);
            totalStakedR2 -= balances[msg.sender];
            totalStakedR3 = totalStakedR2;
        } else if(call_time <= R2Period) {
             reward = _withdraw(R2, totalStakedR2);
             reward += _withdraw(R1, totalStaked);
            totalStakedR3 -= balances[msg.sender];
        } else {
            reward = _withdraw(R3, totalStakedR3);
            reward += _withdraw(R2, totalStakedR2);
            reward += _withdraw(R1, totalStaked);
            userWaited = true;
        }
        remainingReward -= reward;
        token.transfer(msg.sender, reward + balances[msg.sender]);
        balances[msg.sender] = 0;
        hasStaked[msg.sender] = false;
        activeUsers--;
    }
    
    
    /* 
     * Internal function that calcultes the reward a user will get from the reward pool
     * The reward dependes on the amount of tokens staked at the time and the period in wich the
     * user decides to witdraw
     */
     function _withdraw(uint256 pool, uint256 staked) view private returns (uint256) {
        uint256 reward = calculateAmount(pool, calculatePercentage(staked, balances[msg.sender]));
        return reward;
    }
    
    
    /* 
     * Allows the admin of the bank to withdraw all the reamining tokens in the reward pool
     * only if no user waited for the period R3
     */
    function withdrawRemaining() public {
        require(msg.sender == admin, "Only the admin can withdraw the remaining reward");
        require(block.timestamp > R2Period, "You can't withdraw the remaining reward before yet");
        require(activeUsers == 0 && !userWaited, " You can only withdraw the reamining funds if no user waited for the last period");
        token.transfer(admin, remainingReward);
    }
    
    
    
    /* 
     * Allows the admin to change the current admin of the bank
     */
     function changeAdmin(address newAdmin) public {
        require(newAdmin != address(0), "The new admin can not be the address zero");
        require(msg.sender == admin, "Only the current admin can set a new admin");
        admin = newAdmin;
    }
    
}