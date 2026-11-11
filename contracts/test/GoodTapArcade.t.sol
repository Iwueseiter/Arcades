// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GoodTapArcade, IIdentity} from "../src/GoodTapArcade.sol";

contract MockGD is ERC20 {
    constructor() ERC20("GoodDollar", "G$") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockIdentity is IIdentity {
    mapping(address => bool) public whitelisted;

    function set(address account, bool value) external {
        whitelisted[account] = value;
    }

    function isWhitelisted(address account) external view returns (bool) {
        return whitelisted[account];
    }
}

contract GoodTapArcadeTest is Test {
    GoodTapArcade internal arcade;
    MockGD internal gd;

    address internal owner = makeAddr("owner");
    uint256 internal signerKey = 0xA11CE;
    address internal signer;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant DAILY = 1e18;
    uint256 internal constant STREAK_BONUS = 0.2e18;
    uint32 internal constant MAX_BONUS_DAYS = 5;
    uint256 internal constant REFERRAL = 2e18;
    uint256 internal constant BUDGET = 100e18;

    function setUp() public {
        vm.warp(1_760_000_000);
        signer = vm.addr(signerKey);
        gd = new MockGD();
        arcade = new GoodTapArcade(
            IERC20(address(gd)),
            IIdentity(address(0)),
            signer,
            address(0),
            owner,
            DAILY,
            STREAK_BONUS,
            MAX_BONUS_DAYS,
            REFERRAL,
            BUDGET
        );
        gd.mint(address(arcade), 1_000e18);
    }

    function _voucher(address player, uint256 cumulative, uint256 deadline) internal view returns (bytes memory) {
        bytes32 digest = arcade.hashRewardVoucher(player, cumulative, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // --- daily -----------------------------------------------------------------------------------

    function test_dailyClaimPaysAndBlocksSecondClaim() public {
        vm.prank(alice);
        uint256 paid = arcade.claimDaily();
        assertEq(paid, DAILY);
        assertEq(gd.balanceOf(alice), DAILY);

        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.AlreadyClaimedToday.selector);
        arcade.claimDaily();
    }

    function test_streakGrowsCapsAndResets() public {
        for (uint256 i = 0; i < 8; i++) {
            vm.prank(alice);
            arcade.claimDaily();
            vm.warp(block.timestamp + 1 days);
        }
        (, uint32 streak,,) = arcade.players(alice);
        assertEq(streak, 8);
        // day 1..8: bonus days 0,1,2,3,4,5,5,5
        assertEq(gd.balanceOf(alice), DAILY * 8 + STREAK_BONUS * (0 + 1 + 2 + 3 + 4 + 5 + 5 + 5));

        vm.warp(block.timestamp + 1 days); // skip a day
        assertEq(arcade.currentStreak(alice), 0);
        vm.prank(alice);
        assertEq(arcade.claimDaily(), DAILY);
        (, streak,,) = arcade.players(alice);
        assertEq(streak, 1);
    }

    function test_previewDaily() public {
        (bool can, uint256 amount, uint32 next) = arcade.previewDaily(alice);
        assertTrue(can);
        assertEq(amount, DAILY);
        assertEq(next, 1);

        vm.prank(alice);
        arcade.claimDaily();
        (can,, next) = arcade.previewDaily(alice);
        assertFalse(can);
        assertEq(next, 1);

        vm.warp(block.timestamp + 1 days);
        (can, amount, next) = arcade.previewDaily(alice);
        assertTrue(can);
        assertEq(next, 2);
        assertEq(amount, DAILY + STREAK_BONUS);
    }

    function test_identityGate() public {
        MockIdentity id = new MockIdentity();
        vm.prank(owner);
        arcade.setIdentity(id);

        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.NotVerified.selector);
        arcade.claimDaily();

        id.set(alice, true);
        vm.prank(alice);
        arcade.claimDaily();
        assertEq(gd.balanceOf(alice), DAILY);
    }

    function test_insufficientPoolReverts() public {
        vm.prank(owner);
        arcade.withdraw(IERC20(address(gd)), owner, 1_000e18);
        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.InsufficientPool.selector);
        arcade.claimDaily();
    }

    // --- referrals -------------------------------------------------------------------------------

    function test_referralPaidOnFirstClaimOnly() public {
        vm.prank(alice);
        arcade.claimDaily();

        vm.prank(bob);
        arcade.setReferrer(alice);
        vm.prank(bob);
        arcade.claimDaily();
        assertEq(gd.balanceOf(alice), DAILY + REFERRAL);

        vm.warp(block.timestamp + 1 days);
        vm.prank(bob);
        arcade.claimDaily();
        assertEq(gd.balanceOf(alice), DAILY + REFERRAL);
    }

    function test_referrerRules() public {
        vm.prank(bob);
        vm.expectRevert(GoodTapArcade.InvalidReferrer.selector); // alice never played
        arcade.setReferrer(alice);

        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.InvalidReferrer.selector);
        arcade.setReferrer(alice);

        vm.prank(alice);
        arcade.claimDaily();
        vm.prank(bob);
        arcade.claimDaily();
        vm.prank(bob);
        vm.expectRevert(GoodTapArcade.InvalidReferrer.selector); // bob already claimed
        arcade.setReferrer(alice);
    }

    // --- vouchers --------------------------------------------------------------------------------

    function test_cumulativeVoucher() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _voucher(alice, 5e18, deadline);
        vm.prank(alice);
        assertEq(arcade.claimRewards(5e18, deadline, sig), 5e18);

        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.NothingToClaim.selector);
        arcade.claimRewards(5e18, deadline, sig);

        sig = _voucher(alice, 8e18, deadline);
        vm.prank(alice);
        assertEq(arcade.claimRewards(8e18, deadline, sig), 3e18);
        assertEq(gd.balanceOf(alice), 8e18);
    }

    function test_voucherBoundToPlayer() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _voucher(alice, 5e18, deadline);
        vm.prank(bob);
        vm.expectRevert(GoodTapArcade.InvalidSignature.selector);
        arcade.claimRewards(5e18, deadline, sig);
    }

    function test_voucherWrongSignerAndExpiry() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = arcade.hashRewardVoucher(alice, 5e18, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBAD, digest);
        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.InvalidSignature.selector);
        arcade.claimRewards(5e18, deadline, abi.encodePacked(r, s, v));

        bytes memory sig = _voucher(alice, 5e18, deadline);
        vm.warp(deadline + 1);
        vm.prank(alice);
        vm.expectRevert(GoodTapArcade.VoucherExpired.selector);
        arcade.claimRewards(5e18, deadline, sig);
    }

    function test_dailyVoucherBudget() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _voucher(alice, 90e18, deadline);
        vm.prank(alice);
        arcade.claimRewards(90e18, deadline, sig);

        sig = _voucher(bob, 20e18, deadline);
        vm.prank(bob);
        vm.expectRevert(GoodTapArcade.DailyBudgetExceeded.selector);
        arcade.claimRewards(20e18, deadline, sig);

        vm.warp(block.timestamp + 1 days);
        sig = _voucher(bob, 20e18, block.timestamp + 1 hours);
        vm.prank(bob);
        arcade.claimRewards(20e18, block.timestamp + 1 hours, sig);
        assertEq(gd.balanceOf(bob), 20e18);
    }

    // --- shop ------------------------------------------------------------------------------------

    function test_buyItemRecyclesIntoPool() public {
        bytes32 itemId = keccak256("combo-boost");
        vm.prank(owner);
        arcade.setItem(itemId, 12e18, true);

        gd.mint(alice, 20e18);
        vm.startPrank(alice);
        gd.approve(address(arcade), type(uint256).max);
        uint256 poolBefore = arcade.poolBalance();
        arcade.buyItem(itemId);
        assertTrue(arcade.owns(alice, itemId));
        assertEq(arcade.poolBalance(), poolBefore + 12e18);

        vm.expectRevert(GoodTapArcade.AlreadyOwned.selector);
        arcade.buyItem(itemId);
        vm.expectRevert(GoodTapArcade.ItemUnavailable.selector);
        arcade.buyItem(keccak256("nope"));
        vm.stopPrank();
    }

    function test_buyItemToExternalTreasury() public {
        address treasury = makeAddr("treasury");
        bytes32 itemId = keccak256("vip-pass");
        vm.startPrank(owner);
        arcade.setTreasury(treasury);
        arcade.setItem(itemId, 25e18, true);
        vm.stopPrank();

        gd.mint(alice, 25e18);
        vm.startPrank(alice);
        gd.approve(address(arcade), 25e18);
        arcade.buyItem(itemId);
        vm.stopPrank();
        assertEq(gd.balanceOf(treasury), 25e18);
    }

    // --- admin -----------------------------------------------------------------------------------

    function test_pauseBlocksPlayers() public {
        vm.prank(owner);
        arcade.pause();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        arcade.claimDaily();
    }

    function test_onlyOwnerAdmin() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        arcade.setSigner(alice);
    }

    function testFuzz_streakAmountNeverExceedsCap(uint8 days_) public {
        uint256 n = bound(days_, 1, 40);
        for (uint256 i = 0; i < n; i++) {
            vm.prank(alice);
            uint256 paid = arcade.claimDaily();
            assertLe(paid, DAILY + STREAK_BONUS * MAX_BONUS_DAYS);
            vm.warp(block.timestamp + 1 days);
        }
    }
}
