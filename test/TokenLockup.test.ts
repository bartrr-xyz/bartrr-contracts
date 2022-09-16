import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { USDC, DAI, WBTC, SUSHI, WETH } from "../scripts/address";
import { erc20ABI } from "../scripts/abi/erc20";

import { TokenLockup } from "../typechain/TokenLockup";
import { TokenLockup__factory } from "../typechain/factories/TokenLockup__factory";

import hre from "hardhat";
import log from "ololog";

// List of variables that are reused throughout the tests
const wethWhale = "0xa75ede99f376dd47f3993bc77037f61b5737c6ea";
const ethWhale = "0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e";
const usdcWhale = "0xfc7470c14baef608dc316f5702790eefee9cc258";
const wbtcWhale = "0xe3dd3914ab28bb552d41b8dfe607355de4c37a51";
let lockup: TokenLockup;
let deployer: any;
let signer: any;
let wethContract: any;
let eth_address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

describe("TokenLockup", async () => {
  before(async () => {
    let signers = await ethers.getSigners();
    deployer = signers[0];
    wethContract = new ethers.Contract(WETH, JSON.parse(erc20ABI), deployer);
  });

  beforeEach(async function () {
    const Lockup: TokenLockup__factory = (await ethers.getContractFactory(
      "TokenLockup"
    )) as TokenLockup__factory;
    lockup = await Lockup.deploy();
  });

  describe("Token Lockups", async () => {
    it("Should transfer WETH upon lockup", async function () {
      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 864000; // 10 days

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wethWhale],
      });
      signer = await ethers.getSigner(wethWhale);

      await wethContract.connect(signer).approve(lockup.address, lockupAmount);

      let balanceBefore = await wethContract.balanceOf(wethWhale);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);

      expect(
        await lockup.connect(signer).lockTokens(WETH, lockupAmount, duration)
      )
        .to.emit(lockup, "TokensLocked")
        .withArgs(WETH, lockupAmount, block.timestamp + duration);
      let balanceAfter = await wethContract.balanceOf(wethWhale);

      expect(balanceBefore.sub(balanceAfter)).to.equal(lockupAmount);
    });

    it("Should transfer USDC upon lockup", async function () {
      let lockupAmount = "10000000000"; // 10,000 USDC
      let duration = 864000; // 10 days

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [usdcWhale],
      });
      signer = await ethers.getSigner(usdcWhale);

      let usdcContract = new ethers.Contract(
        USDC,
        JSON.parse(erc20ABI),
        deployer
      );

      await usdcContract.connect(signer).approve(lockup.address, lockupAmount);

      let balanceBefore = await usdcContract.balanceOf(usdcWhale);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);

      expect(
        await lockup.connect(signer).lockTokens(USDC, lockupAmount, duration)
      )
        .to.emit(lockup, "TokensLocked")
        .withArgs(USDC, lockupAmount, block.timestamp + duration);
      let balanceAfter = await usdcContract.balanceOf(usdcWhale);

      expect(balanceBefore.sub(balanceAfter)).to.equal(lockupAmount);
    });

    it("Should transfer ETH upon lockup", async function () {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ethWhale],
      });
      signer = await ethers.getSigner(ethWhale);

      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 864000; // 10 days

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);

      expect(
        await lockup
          .connect(signer)
          .lockTokens(eth_address, lockupAmount, duration, {
            value: ethers.utils.parseEther("1"),
          })
      )
        .to.emit(lockup, "TokensLocked")
        .withArgs(eth_address, lockupAmount, block.timestamp + duration);

      await hre.network.provider.request({
        method: "hardhat_mine",
        params: ["0x1"], // 1 block
      });

      let contractBalance = await ethers.provider.getBalance(lockup.address);
      expect(contractBalance).to.be.equal(lockupAmount);
    });

    it("Should not create a lockup longer than 50 years", async function () {
      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 1576800001; // 50 years + 1 second

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wethWhale],
      });
      signer = await ethers.getSigner(wethWhale);

      await wethContract.connect(signer).approve(lockup.address, lockupAmount);

      await expect(
        lockup.connect(signer).lockTokens(WETH, lockupAmount, duration)
      ).to.be.revertedWith("Lockup must be 50 years or less");
    });

    it("Should unlock WETH after 10 days", async function () {
      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 864000; // 10 days

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wethWhale],
      });
      signer = await ethers.getSigner(wethWhale);

      await wethContract.connect(signer).approve(lockup.address, lockupAmount);

      let balanceBefore = await wethContract.balanceOf(wethWhale);
      await lockup.connect(signer).lockTokens(WETH, lockupAmount, duration);
      let balanceAfter = await wethContract.balanceOf(wethWhale);

      expect(balanceBefore.sub(balanceAfter)).to.equal(lockupAmount);

      let blockTime = 0xd2f00; // 864000 seconds = 10 days
      await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [blockTime], // 864000 seconds = 10 days
      });

      await hre.network.provider.request({
        method: "hardhat_mine",
        params: ["0x1"], // 1 block
      });

      await lockup.connect(signer).unlockTokens(0);

      let balanceAfterUnlock = await wethContract.balanceOf(wethWhale);

      expect(balanceAfterUnlock.sub(balanceAfter)).to.equal(lockupAmount);
      expect(balanceAfterUnlock).to.be.equal(balanceBefore);
    });

    it("Should unlock WBTC after 10 days", async function () {
      let lockupAmount = "10000000000"; // 100 WBTC
      let duration = 864000; // 10 days

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wbtcWhale],
      });
      signer = await ethers.getSigner(wbtcWhale);

      let wbtcContract = new ethers.Contract(
        WBTC,
        JSON.parse(erc20ABI),
        deployer
      );
      let whaleBalance = await wbtcContract.balanceOf(wbtcWhale); // 131166393879 = 1311.66393879 WBTC
      await wbtcContract.connect(signer).approve(lockup.address, lockupAmount);

      let balanceBefore = await wbtcContract.balanceOf(wbtcWhale);
      await lockup.connect(signer).lockTokens(WBTC, lockupAmount, duration);
      let balanceAfter = await wbtcContract.balanceOf(wbtcWhale);

      expect(balanceBefore.sub(balanceAfter)).to.equal(lockupAmount);

      let blockTime = 0xd2f00; // 864000 seconds = 10 days
      await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [blockTime], // 864000 seconds = 10 days
      });

      await hre.network.provider.request({
        method: "hardhat_mine",
        params: ["0x1"], // 1 block
      });

      await lockup.connect(signer).unlockTokens(0);

      let balanceAfterUnlock = await wbtcContract.balanceOf(wbtcWhale);

      expect(balanceAfterUnlock.sub(balanceAfter)).to.equal(lockupAmount);
      expect(balanceAfterUnlock).to.be.equal(balanceBefore);
    });

    it("Should unlock ETH after 10 days", async function () {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ethWhale],
      });
      signer = await ethers.getSigner(ethWhale);

      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 864000; // 10 days

      expect(
        await lockup
          .connect(signer)
          .lockTokens(eth_address, lockupAmount, duration, {
            value: ethers.utils.parseEther("1"),
          })
      ).to.emit(lockup, "TokensLocked");

      let contractBalance = await ethers.provider.getBalance(lockup.address);

      expect(contractBalance).to.be.equal(lockupAmount);

      let blockTime = 0xd2f00; // 864000 seconds = 10 days
      await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [blockTime], // 864000 seconds = 10 days
      });

      await hre.network.provider.request({
        method: "hardhat_mine",
        params: ["0x1"], // 1 block
      });

      await lockup.connect(signer).unlockTokens(0);

      contractBalance = await ethers.provider.getBalance(lockup.address);
      expect(contractBalance).to.be.equal(0);
    });

    it("Should not unlock WETH before 10 days", async function () {
      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 864000; // 10 days

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wethWhale],
      });
      signer = await ethers.getSigner(wethWhale);

      await wethContract.connect(signer).approve(lockup.address, lockupAmount);

      await lockup.connect(signer).lockTokens(WETH, lockupAmount, duration);

      let blockTime = 0xbdd80; // 777600 seconds = 9 days
      await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [blockTime], // 777600 seconds = 9 days
      });

      await hre.network.provider.request({
        method: "hardhat_mine",
        params: ["0x1"], // 1 block
      });

      await expect(lockup.connect(signer).unlockTokens(0)).to.be.revertedWith(
        "Lockup not complete"
      );
    });

    it("Should unlock ETH before 10 days", async function () {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ethWhale],
      });
      signer = await ethers.getSigner(ethWhale);

      let lockupAmount = ethers.utils.parseEther("1");
      let duration = 864000; // 10 days

      expect(
        await lockup
          .connect(signer)
          .lockTokens(eth_address, lockupAmount, duration, {
            value: ethers.utils.parseEther("1"),
          })
      ).to.emit(lockup, "TokensLocked");

      let blockTime = 0xbdd80; // 777600 seconds = 9 days
      await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [blockTime], // 777600 seconds = 9 days
      });

      await hre.network.provider.request({
        method: "hardhat_mine",
        params: ["0x1"], // 1 block
      });

      await expect(lockup.connect(signer).unlockTokens(0)).to.be.revertedWith(
        "Lockup not complete"
      );
    });
  });
});
