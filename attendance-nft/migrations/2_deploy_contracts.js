const AttendanceNFT = artifacts.require("AttendanceNFT");

module.exports = function(deployer) {
  deployer.deploy(AttendanceNFT);
};