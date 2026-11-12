// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice A stand-in G$ for testnets, where the real GoodDollar token isn't available.
contract TestGoodDollar is ERC20 {
    constructor(address to) ERC20("Test GoodDollar", "tG$") {
        _mint(to, 1_000_000 ether);
    }
}

/// @notice Deploys a test G$ and mints 1,000,000 of it to the deployer.
///
///   forge script script/TestToken.s.sol --tc DeployTestToken --rpc-url celo_sepolia --broadcast
contract DeployTestToken is Script {
    function run() external returns (TestGoodDollar token) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        token = new TestGoodDollar(vm.addr(deployerKey));
        vm.stopBroadcast();
        console2.log("Test G$ deployed at", address(token));
        console2.log("Put it in GD_TOKEN, then run the Deploy script.");
    }
}
