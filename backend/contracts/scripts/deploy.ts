import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy ForeverDataPayments
  const ForeverDataPayments = await ethers.getContractFactory("ForeverDataPayments");
  const payments = await ForeverDataPayments.deploy();
  await payments.waitForDeployment();

  console.log("ForeverDataPayments deployed to:", await payments.getAddress());

  // Save deployment info
  const deploymentInfo = {
    ForeverDataPayments: {
      address: await payments.getAddress(),
      network: network.name,
      timestamp: new Date().toISOString()
    }
  };

  // Save to both contracts folder and main backend for easy access
  const contractsPath = path.join(__dirname, '..', 'deployment.json');
  const backendPath = path.join(__dirname, '..', '..', 'src', 'contracts', 'deployment.json');

  fs.writeFileSync(contractsPath, JSON.stringify(deploymentInfo, null, 2));
  
  // Ensure directory exists
  const backendDir = path.dirname(backendPath);
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }
  fs.writeFileSync(backendPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment info saved to:", contractsPath);
  console.log("Deployment info saved to:", backendPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
