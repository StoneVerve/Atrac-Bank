const Riba = artifacts.require('Riba');
const Bank = artifacts.require('Bank');

let bank;
let riba;

/*
 * Auxilary function to wait n seconds before executing the
 * line
 */
function wait(s) {
  ms = s * 1000
  return new Promise(resolve => setTimeout(resolve, ms));
}

require('chai').use(require('chai-as-promised')).should();


/* 
 * We initiate the tests for our bank contract
 * Total staked tokens 4500
 * Total reward 10000 tokens R1=2000, R2= 3000, R3=5000
 * User1 receives a reward of 880 tokens when he withdraws during period R1
 * User2 receives a reward of 660 tokens when he withdraws during period R1
 * User3 receives a reward of 440 tokens when he withdraws during period R1
 * User2 receives a reward of 1800 tokens when he withdraws during period R2
 * User3 receives a reward of 1200 tokens when he withdraws during period R2
 * User2 receives a reward of 5000 tokens when he withdraws during period R3
 
 */
contract("Testing our Bank", ([admin, user1, user2, user3]) => {
	
	/*
	 * For our test ee use an auxilary ERC20 token called 
	 * Riba as the ERC20 token that will be staked and managed
	 * by our bank contract
	 */
	before(async () => {
		riba = await Riba.new();
		await riba.mint(admin, 20000, {from: admin});
		
		/*
		 * We use a perido of 20 seconds but it can be change 
		 * if your having trouble with the tests
		 */
		bank = await Bank.new(riba.address, 10000, 20);
		await riba.transfer(bank.address, 10000, {from: admin});
		await riba.transfer(user1, 2000, {from: admin});
		await riba.transfer(user2, 2000, {from: admin});
		await riba.transfer(user3, 2000, {from: admin});
	})
	
	describe("Testing accounts functionality", async () => {
		
		it("The bank should have 10000 Riba tokens", async () => {
		    expect(Number(await riba.balanceOf(bank.address))).to.equal(10000);
	    });
		it("Each user should have 2000 Riba tokens", async () => {
		    expect(Number(await riba.balanceOf(user1))).to.equal(2000);
		    expect(Number(await riba.balanceOf(user2))).to.equal(2000);
		    expect(Number(await riba.balanceOf(user3))).to.equal(2000);
	    });
	})
	
	
	describe("Testing deposits functionality", async () => {
		
		before(async () => {
		    await riba.approve(bank.address, 1500, {from: user2});
		    await bank.deposit(1500, {from: user2})
			await riba.approve(bank.address, 1500, {from: user3});
		    await bank.deposit(1000, {from: user3})
			
		    expect(Number(await bank.balances(user2))).to.equal(1500);
		    expect(Number(await bank.balances(user3))).to.equal(1000);		 
		 });
		
		
		it("You can't deposit tokens for stake if you don't call the allowance method for the erc20 token first", async () => {
		    await bank.deposit(200, {from: user1}).should.be.rejectedWith
		          ("The amount allowed to deposit from the contract needs to be greater than the amount deposited");
	    });
		
		
		it("The amount of tokens to be deposited needs to be greater or equal to the allowance", async () => {
		    await riba.approve(bank.address, 100, {from: user1});
		    await bank.deposit(200, {from: user1}).should.be.rejectedWith
		          ("The amount allowed to deposit from the contract needs to be greater than the amount deposited");
		    await riba.approve(bank.address, 0, {from: user1});
	    });
		
		it("A user that has approved an allowance can stake his tokens during the stake period", async () => {
		    await riba.approve(bank.address, 1000, {from: user1});
		    await bank.deposit(1000, {from: user1})
		    expect(Number(await bank.balances(user1))).to.equal(1000);
		    expect(Number(await bank.activeUsers())).to.equal(3);
		    expect(await bank.hasStaked(user1)).to.equal(true);
		    await riba.approve(bank.address, 0, {from: user1});
	    });
		
		it("A user can stake multiple times during the staking period", async () => {
		    await riba.approve(bank.address, 1000, {from: user1});
		    await bank.deposit(1000, {from: user1})
		    expect(Number(await bank.balances(user1))).to.equal(2000);
		    expect(Number(await bank.activeUsers())).to.equal(3);
		    expect(await bank.hasStaked(user1)).to.equal(true);
		    await riba.approve(bank.address, 0, {from: user1});
	    });
		
		it("A user can't stake tokens after the staking period has ended", async () => {
		    expect(Number(await bank.activeUsers())).to.equal(3);
			
		    expect(await bank.hasStaked(user2)).to.equal(true);
			expect(await bank.hasStaked(user3)).to.equal(true);
			
		    await riba.approve(bank.address, 0, {from: user2});
			
			await wait(20);
			
			await bank.deposit(100, {from: user3}).should.be.rejectedWith("You can no longer stake tokens");
			
	    });
		
		it("The admin of the bank shouldn't be allowed to withdraw the rewards during the staking period", async () => {
		    await bank.withdrawRemaining({from: admin}).should.be.rejectedWith
		          ("You can't withdraw the remaining reward before yet");
	    });
	})
	
	describe("Testing Lock period", async () => {
		it("Can't withdraw during the lock period", async () => {
		    await bank.withdraw({from: user1}).should.be.rejectedWith
		          ("You can't withdraw yet");
	    });
		
		it("The admin can't withdraw remaining tokens during lock period", async () => {
		    await bank.withdrawRemaining({from: admin}).should.be.rejectedWith
		          ("You can't withdraw the remaining reward before yet");
	    });
		
		it("You cant't deposit during the lock period", async () => {
		    await bank.deposit(300, {from: user3}).should.be.rejectedWith
		          ("You can no longer stake tokens");
	    });
		
	});
	
	describe("Testing reward period R1", async () => {
		before(async () => {
		    await wait(20);		 
		 });
		
		it("A user should be able to withdraw its tokens", async () => {
		    expect(Number(await riba.balanceOf(user1))).to.equal(0);
			await bank.withdraw({from: user1})
			expect(Number(await riba.balanceOf(user1))).to.equal(2880);
			expect(Number(await bank.balances(user1))).to.equal(0);
			expect(await bank.hasStaked(user1)).to.equal(false);
			expect(Number(await bank.activeUsers())).to.equal(2);
	    });
		
		it("The admin shoudn't be able to withdraw the remaining tokens during period R1", async() => {
			await bank.withdrawRemaining({from: admin}).should.be.rejectedWith
		          ("You can't withdraw the remaining reward before yet");
		});
		
		it("A user can't withdraw tokens a second time", async () => {
		     await bank.withdraw({from: user1}).should.be.rejectedWith
		          ("You don't have any tokens staked");
	    });
		
		
	});
	
	
	describe("Testing reward period R2", async () => {
		before(async () => {
		    await wait(20);		 
		 });
		
		it("A user should be able to withdraw its tokens during period R2", async () => {
		    expect(Number(await riba.balanceOf(user3))).to.equal(1000);
			await bank.withdraw({from: user3})
			expect(Number(await riba.balanceOf(user3))).to.equal(3640);
			expect(Number(await bank.balances(user3))).to.equal(0);
			expect(await bank.hasStaked(user3)).to.equal(false);
			expect(Number(await bank.activeUsers())).to.equal(1);
	    });
		
		it("The admin shoudn't be able to withdraw the remaining tokens during period R2", async() => {
			await bank.withdrawRemaining({from: admin}).should.be.rejectedWith
		          ("You can't withdraw the remaining reward before yet");
		});
		
		it("A user who withdrew during period R1 can not withdraw tokens during period R2", async () => {
		     await bank.withdraw({from: user1}).should.be.rejectedWith
		          ("You don't have any tokens staked");
	    });
		
		
	});
	
	
	describe("Testing reward period R3", async () => {
		before(async () => {
		    await wait(20);		 
		 });
		
		it("The admin shoudn't be able to withdraw the remaining tokens during period R3 if a user still has staked tokens", async() => {
			await bank.withdrawRemaining({from: admin}).should.be.rejectedWith
		          ("You can only withdraw the reamining funds if no user waited for the last period");
		});
		
		
		it("A user who withdrew during period R1 can not withdraw tokens during period R3", async () => {
		     await bank.withdraw({from: user1}).should.be.rejectedWith
		          ("You don't have any tokens staked");
	    });
		
		
		it("A user who withdrew during period R2 can not withdraw tokens during period R3", async () => {
		     await bank.withdraw({from: user3}).should.be.rejectedWith
		          ("You don't have any tokens staked");
	    });
		
		it("A user should be able to withdraw its tokens during period R3", async () => {
		    expect(Number(await riba.balanceOf(user2))).to.equal(500);
			await bank.withdraw({from: user2})
			expect(Number(await riba.balanceOf(user2))).to.equal(9460);
			expect(Number(await bank.balances(user2))).to.equal(0);
			expect(await bank.hasStaked(user2)).to.equal(false);
			expect(Number(await bank.activeUsers())).to.equal(0);
	    });
		
		
		it("The admin shoudn't be able to withdraw the remaining tokens since a user waited for period R3", async () => {
		    await bank.withdrawRemaining({from: admin}).should.be.rejectedWith
		          (" You can only withdraw the reamining funds if no user waited for the last period");;
	    });
		
	});
	
	
	describe("Testing Admin functionality", async () => {
		
		before(async () => {
			
			await riba.mint(admin, 20000, {from: admin});
			bank = await Bank.new(riba.address, 10000, 6);
			expect(Number(await riba.balanceOf(admin))).to.equal(24000);
			
			await riba.transfer(bank.address, 10000, {from: admin});
			
			await riba.approve(bank.address, 1000, {from: user2});
		    await bank.deposit(1000, {from: user2});
			await riba.approve(bank.address, 1000, {from: user3});
		    await bank.deposit(1000, {from: user3});
			await riba.approve(bank.address, 1000, {from: user1});
		    await bank.deposit(1000, {from: user1});
		})
		
		it("If no one waited for period R3 the admin can withdraw all the remaining tokens", async () => {
		    await wait(10);
			await bank.withdraw({from: user1})
			await bank.withdraw({from: user2})
			await bank.withdraw({from: user3})
			await wait(15);
			await bank.withdrawRemaining({from: admin});
			expect(Number(await riba.balanceOf(admin))).to.equal(22020);
	    });
		
		it("If you are not the admin of the bank you can't change the admin", async () => {
		    await bank.changeAdmin(user3, {from: user2}).should.be.rejectedWith("Only the current admin can set a new admin");
	    });
		
		it("The admin can't deposit tokens", async () => {
		    await bank.deposit(100, {from: admin}).should.be.rejectedWith("The admin can't deposit tokens");
	    });
		
		it("The admin can't withdraw tokens as a normal user", async () => {
		    await bank.withdraw({from: admin}).should.be.rejectedWith("The admin can't withdraw tokens as a normal user");
	    });
		
		it("The admin should be able to change the current admin", async () => {
		    await bank.changeAdmin(user3, {from: admin});
			expect(await bank.admin()).to.equal(user3);
	    });
		
	})
	
	
	
});
		