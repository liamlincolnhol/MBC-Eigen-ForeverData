// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ForeverDataPayments is Ownable, ReentrancyGuard {
    // Mapping from fileId to balance
    mapping(string => uint256) public fileBalances;
    
    // Mapping from fileId to owner address
    mapping(string => address) public fileOwners;
    
    // Events
    event FilePayment(string indexed fileId, address indexed payer, uint256 amount);
    event RefreshDeduction(string indexed fileId, uint256 amount);
    event BalanceWithdrawn(string indexed fileId, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    // User deposits funds for a file
    function depositForFile(string memory fileId) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        
        // If this is a new file, set the owner
        if (fileOwners[fileId] == address(0)) {
            fileOwners[fileId] = msg.sender;
        }
        
        // Add to file's balance
        fileBalances[fileId] += msg.value;
        
        emit FilePayment(fileId, msg.sender, msg.value);
    }
    
    // Owner can deduct refresh costs
    function deductRefreshCost(string memory fileId, uint256 amount) external onlyOwner {
        require(fileBalances[fileId] >= amount, "Insufficient file balance");
        
        fileBalances[fileId] -= amount;
        
        emit RefreshDeduction(fileId, amount);
    }
    
    // File owner can withdraw remaining balance
    function withdrawFileBalance(string memory fileId, uint256 amount) external nonReentrant {
        require(msg.sender == fileOwners[fileId], "Only file owner can withdraw");
        require(fileBalances[fileId] >= amount, "Insufficient balance");
        
        fileBalances[fileId] -= amount;
        
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send ETH");
        
        emit BalanceWithdrawn(fileId, amount);
    }
    
    // View functions
    function getFileBalance(string memory fileId) external view returns (uint256) {
        return fileBalances[fileId];
    }
    
    function getFileOwner(string memory fileId) external view returns (address) {
        return fileOwners[fileId];
    }
}
