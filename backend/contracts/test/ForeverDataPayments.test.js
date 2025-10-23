const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ForeverDataPayments", function () {
  let contract;
  let owner;
  let user1;
  let user2;
  
  const fileId1 = "test-file-1";
  const fileId2 = "test-file-2";
  const paymentAmount = ethers.parseEther("0.1"); // 0.1 ETH
  const refreshCost = ethers.parseEther("0.001"); // 0.001 ETH

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy contract
    const ForeverDataPayments = await ethers.getContractFactory("ForeverDataPayments");
    contract = await ForeverDataPayments.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should start with empty balances", async function () {
      expect(await contract.fileBalances(fileId1)).to.equal(0);
      expect(await contract.fileOwners(fileId1)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("File Payments", function () {
    it("Should allow users to deposit for a file", async function () {
      await expect(
        contract.connect(user1).depositForFile(fileId1, { value: paymentAmount })
      ).to.emit(contract, "FilePayment")
        .withArgs(fileId1, user1.address, paymentAmount);

      expect(await contract.fileBalances(fileId1)).to.equal(paymentAmount);
      expect(await contract.fileOwners(fileId1)).to.equal(user1.address);
    });

    it("Should reject zero payments", async function () {
      await expect(
        contract.connect(user1).depositForFile(fileId1, { value: 0 })
      ).to.be.revertedWith("Payment amount must be greater than 0");
    });

    it("Should allow multiple deposits for the same file", async function () {
      // First deposit
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
      
      // Second deposit
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
      
      expect(await contract.fileBalances(fileId1)).to.equal(paymentAmount * 2n);
      expect(await contract.fileOwners(fileId1)).to.equal(user1.address);
    });

    it("Should allow different users to deposit for the same file", async function () {
      // User1 deposits first (becomes owner)
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
      
      // User2 can also deposit
      await contract.connect(user2).depositForFile(fileId1, { value: paymentAmount });
      
      expect(await contract.fileBalances(fileId1)).to.equal(paymentAmount * 2n);
      expect(await contract.fileOwners(fileId1)).to.equal(user1.address); // First depositor remains owner
    });
  });

  describe("Refresh Cost Deduction", function () {
    beforeEach(async function () {
      // Setup: User1 deposits for fileId1
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
    });

    it("Should allow owner to deduct refresh costs", async function () {
      await expect(
        contract.connect(owner).deductRefreshCost(fileId1, refreshCost)
      ).to.emit(contract, "RefreshDeduction")
        .withArgs(fileId1, refreshCost);

      expect(await contract.fileBalances(fileId1)).to.equal(paymentAmount - refreshCost);
    });

    it("Should reject deduction from non-owner", async function () {
      await expect(
        contract.connect(user1).deductRefreshCost(fileId1, refreshCost)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("Should reject deduction when insufficient balance", async function () {
      const largeCost = ethers.parseEther("1.0"); // More than deposited
      
      await expect(
        contract.connect(owner).deductRefreshCost(fileId1, largeCost)
      ).to.be.revertedWith("Insufficient file balance");
    });

    it("Should allow exact balance deduction", async function () {
      await contract.connect(owner).deductRefreshCost(fileId1, paymentAmount);
      expect(await contract.fileBalances(fileId1)).to.equal(0);
    });
  });

  describe("Balance Withdrawal", function () {
    beforeEach(async function () {
      // Setup: User1 deposits for fileId1
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
    });

    it("Should allow file owner to withdraw balance", async function () {
      const withdrawAmount = ethers.parseEther("0.05");

      await expect(
        contract.connect(user1).withdrawFileBalance(fileId1, withdrawAmount)
      ).to.emit(contract, "BalanceWithdrawn")
        .withArgs(fileId1, withdrawAmount);

      expect(await contract.fileBalances(fileId1)).to.equal(paymentAmount - withdrawAmount);
    });

    it("Should reject withdrawal from non-owner", async function () {
      await expect(
        contract.connect(user2).withdrawFileBalance(fileId1, ethers.parseEther("0.05"))
      ).to.be.revertedWith("Only file owner can withdraw");
    });

    it("Should reject withdrawal when insufficient balance", async function () {
      const largeAmount = ethers.parseEther("1.0");
      
      await expect(
        contract.connect(user1).withdrawFileBalance(fileId1, largeAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
    });

    it("Should return correct file balance", async function () {
      expect(await contract.getFileBalance(fileId1)).to.equal(paymentAmount);
      expect(await contract.getFileBalance(fileId2)).to.equal(0);
    });

    it("Should return correct file owner", async function () {
      expect(await contract.getFileOwner(fileId1)).to.equal(user1.address);
      expect(await contract.getFileOwner(fileId2)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle multiple files with different owners", async function () {
      // User1 pays for file1
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
      
      // User2 pays for file2
      await contract.connect(user2).depositForFile(fileId2, { value: paymentAmount * 2n });

      expect(await contract.fileBalances(fileId1)).to.equal(paymentAmount);
      expect(await contract.fileBalances(fileId2)).to.equal(paymentAmount * 2n);
      expect(await contract.fileOwners(fileId1)).to.equal(user1.address);
      expect(await contract.fileOwners(fileId2)).to.equal(user2.address);
    });

    it("Should handle deposit, deduction, and withdrawal cycle", async function () {
      // 1. User deposits
      await contract.connect(user1).depositForFile(fileId1, { value: paymentAmount });
      
      // 2. Owner deducts refresh cost
      await contract.connect(owner).deductRefreshCost(fileId1, refreshCost);
      
      // 3. User withdraws remaining balance
      const remainingBalance = paymentAmount - refreshCost;
      await contract.connect(user1).withdrawFileBalance(fileId1, remainingBalance);
      
      expect(await contract.fileBalances(fileId1)).to.equal(0);
    });
  });
});