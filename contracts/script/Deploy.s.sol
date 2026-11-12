// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {GoodTapArcade, IIdentity} from "../src/GoodTapArcade.sol";

/// @notice Deploys GoodTapArcade and registers the shop catalogue.
///
///   forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify
///
/// Amounts below are whole G$ and get scaled by the token's decimals at deploy time.
contract Deploy is Script {
    // Keep in sync with lib/shop-catalog.ts in the app.
    string[4] internal ITEM_SLUGS = ["starter-pack", "combo-boost", "lucky-capsule", "vip-pass"];
    uint128[4] internal ITEM_PRICES = [5, 12, 18, 25];

    function run() external returns (GoodTapArcade arcade) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address token = vm.envAddress("GD_TOKEN");
        address identity = vm.envOr("GD_IDENTITY", address(0));
        address signer = vm.envAddress("VOUCHER_SIGNER");
        address treasury = vm.envOr("TREASURY", address(0));
        address finalOwner = vm.envOr("OWNER", deployer);

        uint256 unit = 10 ** IERC20Metadata(token).decimals();

        vm.startBroadcast(deployerKey);
        arcade = new GoodTapArcade(
            IERC20(token),
            IIdentity(identity),
            signer,
            treasury,
            deployer, // keep ownership until the catalogue is registered
            1 * unit, // daily reward
            unit / 5, // +0.2 G$ per streak day
            7, // streak bonus caps after 7 extra days
            3 * unit, // referral bonus
            500 * unit // max G$ redeemed through game vouchers per day, across all players
        );

        for (uint256 i = 0; i < ITEM_SLUGS.length; i++) {
            arcade.setItem(keccak256(bytes(ITEM_SLUGS[i])), uint128(ITEM_PRICES[i] * unit), true);
        }

        if (finalOwner != deployer) {
            arcade.transferOwnership(finalOwner); // Ownable2Step: new owner must call acceptOwnership()
        }
        vm.stopBroadcast();

        console2.log("GoodTapArcade deployed at", address(arcade));
        console2.log("Fund the reward pool by sending G$ to that address.");
    }
}
