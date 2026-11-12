// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IIdentity} from "../src/base/XurriBase.sol";
import {XurriDailyGift} from "../src/XurriDailyGift.sol";
import {XurriTournaments} from "../src/XurriTournaments.sol";
import {XurriShop} from "../src/XurriShop.sol";

/// @notice Deploys the three Xurri contracts and registers the shop items.
///
///   forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify
///
/// The deploy key only sets things up: ADMIN (a Safe) owns everything from the first block, and the
/// deploy key gives up its temporary operator role at the end.
contract Deploy is Script {
    // GoodDollar's UBIScheme on Celo: the pool that pays the daily claim.
    address internal constant CELO_UBI_SCHEME = 0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1;

    // Keep in sync with lib/shop-catalog.ts in the app. Whole G$.
    string[4] internal ITEM_SLUGS = ["starter-pack", "combo-boost", "lucky-capsule", "vip-pass"];
    uint128[4] internal ITEM_PRICES = [5, 12, 18, 25];

    function run() external returns (XurriDailyGift gift, XurriTournaments tournaments, XurriShop shop) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        IERC20 token = IERC20(vm.envAddress("GD_TOKEN"));
        IIdentity identity = IIdentity(vm.envOr("GD_IDENTITY", address(0)));
        address signer = vm.envAddress("VOUCHER_SIGNER");
        address admin = vm.envAddress("ADMIN");
        address pauser = vm.envOr("PAUSER", address(0));
        address ubi = vm.envOr("UBI_RECIPIENT", block.chainid == 42220 ? CELO_UBI_SCHEME : address(0));
        uint16 ubiShare = uint16(vm.envOr("UBI_SHARE_BPS", uint256(1000)));

        // The admin can withdraw every pot, so on mainnet it should be a multisig. A personal wallet is
        // allowed only when ALLOW_PERSONAL_ADMIN=true; it can hand admin to a Safe later (2-day wait).
        if (block.chainid == 42220) {
            require(address(identity) != address(0), "GD_IDENTITY is required on mainnet");
            if (vm.envOr("ALLOW_PERSONAL_ADMIN", false)) {
                require(admin != address(0), "ADMIN is required");
                if (admin.code.length == 0) console2.log("WARNING: ADMIN is a personal wallet, not a Safe. Guard its key.");
            } else {
                require(admin != deployer && admin.code.length > 0, "ADMIN must be a Safe multisig on mainnet (or set ALLOW_PERSONAL_ADMIN=true)");
            }
        }

        uint256 unit = 10 ** IERC20Metadata(address(token)).decimals();

        vm.startBroadcast(deployerKey);

        gift = new XurriDailyGift(
            token,
            identity,
            admin,
            address(0),
            pauser,
            5 * unit, // the operator can never set a gift above 5 G$ a day
            1 * unit, // 1 G$ a day
            unit / 5, // +0.2 G$ for each day in a row
            7 // the bonus stops growing after 7 extra days
        );

        tournaments = new XurriTournaments(
            token,
            identity,
            admin,
            address(0),
            pauser,
            signer,
            ubi,
            ubiShare,
            5, // tournament games per person per day
            500 * unit // most G$ prizes paid out per day, across all players
        );

        shop = new XurriShop(token, admin, deployer, pauser, address(tournaments), ubi, ubiShare);
        for (uint256 i = 0; i < ITEM_SLUGS.length; i++) {
            shop.setItem(keccak256(bytes(ITEM_SLUGS[i])), uint128(ITEM_PRICES[i] * unit), true);
        }
        shop.renounceRole(shop.OPERATOR_ROLE(), deployer);

        vm.stopBroadcast();

        console2.log("XurriDailyGift   ", address(gift));
        console2.log("XurriTournaments ", address(tournaments));
        console2.log("XurriShop        ", address(shop));
        console2.log("Fund the gift and the prize pot by sending G$ to those two addresses.");
    }
}
