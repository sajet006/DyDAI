let DyDAI = artifacts.require('DyDAI.sol');
let DyCrowd = artifacts.require('DyCrowd.sol');
let DAIAddress="0xc4375b7de8af5a38a93548eb8453a498222c4ff2";
let SoloMarginAddress="0x4ec3570cadaaee08ae384779b0f3a45ef85289de";

module.exports = function (deployer) {
  deployer.then(async () => {

    await deployer.deploy(DyDAI);
    const instanceDyDAI = await DyDAI.deployed();

    await deployer.deploy(DyCrowd,instanceDyDAI.address, DAIAddress, SoloMarginAddress);
    const instanceDyCrowd = await DyCrowd.deployed();

    await instanceDyDAI.addMinter(instanceDyCrowd.address);
  })
}