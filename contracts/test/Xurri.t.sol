// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IIdentity, UbiShare, XurriBase} from "../src/base/XurriBase.sol";
import {XurriDailyGift} from "../src/XurriDailyGift.sol";
import {XurriTournaments} from "../src/XurriTournaments.sol";
import {XurriShop} from "../src/XurriShop.sol";

contract MockGD is ERC20 {
    constructor() ERC20("GoodDollar", "G$") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// Mimics GoodDollar Identity: verified roots, plus extra wallets connected to a root.
contract MockIdentity is IIdentity {
    mapping(address => address) public rootOf;

    function verify(address account) external {
        rootOf[account] = account;
    }

    function connect(address wallet, address root) external {
        rootOf[wallet] = root;
    }

    function getWhitelistedRoot(address account) external view returns (address) {
        return rootOf[account];
    }
}

contract XurriTest is Test {
    MockGD gd;
    MockIdentity identity;
    XurriDailyGift gift;
    XurriTournaments tournaments;
    XurriShop shop;

    address admin = makeAddr("safe");
    address pauser = makeAddr("pauser");
    address ubi = makeAddr("ubiPool");
    address alice = makeAddr("alice");
    address aliceSecondWallet = makeAddr("alice2");
    address bob = makeAddr("bob");
    address stranger = makeAddr("stranger");
    uint256 signerKey = 0xA11CE;
    address signer;

    bytes32 constant ITEM = keccak256("vip-pass");

    function setUp() public {
        // Thursday 2026-11-12 12:00 UTC
        vm.warp(1_794_484_800);
        signer = vm.addr(signerKey);
        gd = new MockGD();
        identity = new MockIdentity();
        identity.verify(alice);
        identity.connect(aliceSecondWallet, alice);
        identity.verify(bob);

        gift = new XurriDailyGift(gd, identity, admin, address(0), pauser, 5 ether, 1 ether, 0.2 ether, 7);
        tournaments = new XurriTournaments(gd, identity, admin, address(0), pauser, signer, ubi, 1000, 5, 100 ether);
        shop = new XurriShop(gd, admin, address(0), pauser, address(tournaments), ubi, 1000);
        vm.prank(admin);
        shop.setItem(ITEM, 25 ether, true);

        gd.mint(address(gift), 1_000 ether);
        gd.mint(address(tournaments), 1_000 ether);
        gd.mint(alice, 100 ether);
        gd.mint(stranger, 100 ether);
    }

    // ---------------------------------------------------------------- daily gift

    function test_giftGrowsWithStreakAndResets() public {
        vm.startPrank(alice);
        assertEq(gift.claim(), 1 ether);
        vm.expectRevert(XurriDailyGift.AlreadyClaimedToday.selector);
        gift.claim();

        skip(1 days);
        assertEq(gift.claim(), 1.2 ether);
        assertEq(gift.streakOf(alice), 2);

        skip(3 days);
        assertEq(gift.streakOf(alice), 0);
        assertEq(gift.claim(), 1 ether);
        vm.stopPrank();
        assertEq(gift.totalClaims(), 3);
        assertEq(gift.totalPaid(), 3.2 ether);
    }

    function test_giftIsOncePerPersonNotPerWallet() public {
        vm.prank(alice);
        gift.claim();
        vm.prank(aliceSecondWallet);
        vm.expectRevert(XurriDailyGift.AlreadyClaimedToday.selector);
        gift.claim();
        (bool canClaim,,) = gift.preview(aliceSecondWallet);
        assertFalse(canClaim);
    }

    function test_giftNeedsFaceCheck() public {
        vm.prank(stranger);
        vm.expectRevert(XurriBase.NotVerified.selector);
        gift.claim();
    }

    function test_giftCapCantBeExceeded() public {
        vm.prank(admin);
        vm.expectRevert(XurriDailyGift.GiftTooBig.selector);
        gift.setGift(1 ether, 1 ether, 7); // 8 G$ > 5 G$ cap
        vm.prank(stranger);
        vm.expectRevert();
        gift.setGift(1 ether, 0, 0);
    }

    // ---------------------------------------------------------------- tournament games

    function test_gamesAreLimitedPerPerson() public {
        for (uint32 i = 1; i <= 3; i++) {
            vm.prank(alice);
            assertEq(tournaments.startGame(), i);
        }
        // Alice's second wallet shares her daily limit.
        vm.prank(aliceSecondWallet);
        tournaments.startGame();
        vm.prank(aliceSecondWallet);
        tournaments.startGame();
        assertEq(tournaments.playsLeft(alice), 0);
        vm.prank(alice);
        vm.expectRevert(XurriTournaments.NoPlaysLeft.selector);
        tournaments.startGame();

        skip(1 days);
        assertEq(tournaments.playsLeft(alice), 5);
        assertEq(tournaments.playsLeft(stranger), 0);
        assertEq(tournaments.totalGames(), 5);
    }

    function test_startGameEmitsWeekAndHuman() public {
        uint64 week = tournaments.currentWeek();
        uint64 day = tournaments.currentDay();
        vm.expectEmit(true, true, true, true);
        emit XurriTournaments.GameStarted(aliceSecondWallet, alice, week, day, 1);
        vm.prank(aliceSecondWallet);
        tournaments.startGame();
    }

    function test_weeksStartOnMonday() public {
        uint64 thursday = tournaments.currentWeek();
        vm.warp(1_794_787_200 - 1); // Sunday 2026-11-15 23:59:59 UTC
        assertEq(tournaments.currentWeek(), thursday);
        vm.warp(1_794_787_200); // Monday 2026-11-16 00:00 UTC
        assertEq(tournaments.currentWeek(), thursday + 1);
    }

    // ---------------------------------------------------------------- prize pot

    function test_boostSplitsBetweenPotAndUbi() public {
        uint64 week = tournaments.currentWeek();
        vm.startPrank(stranger);
        gd.approve(address(tournaments), 50 ether);
        assertEq(tournaments.boost(50 ether), 45 ether);
        vm.stopPrank();

        assertEq(tournaments.boosted(week), 45 ether);
        assertEq(gd.balanceOf(ubi), 5 ether);
        assertEq(tournaments.potBalance(), 1_045 ether);
        assertEq(tournaments.totalToUbi(), 5 ether);
    }

    function test_ubiShareIsCappedAndAdminOnly() public {
        vm.startPrank(admin);
        vm.expectRevert(UbiShare.ShareTooHigh.selector);
        tournaments.setUbiConfig(ubi, 5_001);
        tournaments.setUbiConfig(address(0), 0);
        vm.stopPrank();

        vm.prank(pauser);
        vm.expectRevert();
        tournaments.setUbiConfig(pauser, 5_000);

        vm.startPrank(stranger);
        gd.approve(address(tournaments), 10 ether);
        assertEq(tournaments.boost(10 ether), 10 ether);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- prizes

    function _ticket(address player, uint256 cumulative, uint256 deadline) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, tournaments.hashPrizeTicket(player, cumulative, deadline));
        return abi.encodePacked(r, s, v);
    }

    function test_prizeTicketsPayOnlyWhatsNew() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory first = _ticket(alice, 30 ether, deadline);
        bytes memory second = _ticket(alice, 50 ether, deadline);
        vm.startPrank(alice);
        assertEq(tournaments.claimPrizes(30 ether, deadline, first), 30 ether);

        vm.expectRevert(XurriTournaments.NothingToClaim.selector);
        tournaments.claimPrizes(30 ether, deadline, first);

        assertEq(tournaments.claimPrizes(50 ether, deadline, second), 20 ether);
        vm.stopPrank();
        assertEq(gd.balanceOf(alice), 150 ether);
        assertEq(tournaments.totalPrizesPaid(), 50 ether);
    }

    function test_ticketsCantBeForgedStolenOrUsedLate() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory bobsTicket = _ticket(bob, 10 ether, deadline);

        vm.prank(alice);
        vm.expectRevert(XurriTournaments.InvalidSignature.selector);
        tournaments.claimPrizes(10 ether, deadline, bobsTicket);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBAD, tournaments.hashPrizeTicket(alice, 10 ether, deadline));
        vm.prank(alice);
        vm.expectRevert(XurriTournaments.InvalidSignature.selector);
        tournaments.claimPrizes(10 ether, deadline, abi.encodePacked(r, s, v));

        skip(2 hours);
        vm.prank(bob);
        vm.expectRevert(XurriTournaments.TicketExpired.selector);
        tournaments.claimPrizes(10 ether, deadline, bobsTicket);
    }

    function test_dailyPayoutLimit() public {
        uint256 deadline = block.timestamp + 2 days;
        bytes memory alices = _ticket(alice, 80 ether, deadline);
        bytes memory bobs = _ticket(bob, 30 ether, deadline);
        vm.prank(alice);
        tournaments.claimPrizes(80 ether, deadline, alices);
        vm.prank(bob);
        vm.expectRevert(XurriTournaments.PayoutLimitReached.selector);
        tournaments.claimPrizes(30 ether, deadline, bobs);

        skip(1 days);
        vm.prank(bob);
        tournaments.claimPrizes(30 ether, deadline, bobs);
    }

    function test_unverifiedWalletCantClaimPrizes() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory ticket = _ticket(stranger, 10 ether, deadline);
        vm.prank(stranger);
        vm.expectRevert(XurriBase.NotVerified.selector);
        tournaments.claimPrizes(10 ether, deadline, ticket);
    }

    // ---------------------------------------------------------------- shop

    function test_shopPurchaseFundsPotAndUbi() public {
        vm.startPrank(alice);
        gd.approve(address(shop), 25 ether);
        shop.buy(ITEM);
        vm.expectRevert(XurriShop.AlreadyOwned.selector);
        shop.buy(ITEM);
        vm.stopPrank();

        assertTrue(shop.owns(alice, ITEM));
        assertEq(gd.balanceOf(ubi), 2.5 ether);
        assertEq(tournaments.potBalance(), 1_022.5 ether);
        assertEq(gd.balanceOf(address(shop)), 0);
        assertEq(shop.totalSpent(), 25 ether);
    }

    function test_onlyOperatorsEditItems() public {
        vm.prank(stranger);
        vm.expectRevert();
        shop.setItem(ITEM, 1, true);

        vm.prank(admin);
        shop.setItem(ITEM, 25 ether, false);
        vm.prank(alice);
        vm.expectRevert(XurriShop.ItemUnavailable.selector);
        shop.buy(ITEM);
    }

    // ---------------------------------------------------------------- roles & safety

    function test_pauserPausesButOnlyAdminUnpauses() public {
        vm.prank(pauser);
        tournaments.pause();
        vm.prank(alice);
        vm.expectRevert();
        tournaments.startGame();

        vm.prank(pauser);
        vm.expectRevert();
        tournaments.unpause();
        vm.prank(admin);
        tournaments.unpause();

        vm.prank(alice);
        tournaments.startGame();
    }

    function test_signerAndLimitsAreAdminOnly() public {
        vm.prank(pauser);
        vm.expectRevert();
        tournaments.setSigner(pauser);
        vm.prank(pauser);
        vm.expectRevert();
        tournaments.setDailyPayoutLimit(1e30);
        vm.prank(stranger);
        vm.expectRevert();
        gift.withdraw(gd, stranger, 1);

        vm.prank(admin);
        tournaments.setSigner(bob);
        assertEq(tournaments.signer(), bob);
    }

    function test_adminHandoverWaitsTwoDays() public {
        address newSafe = makeAddr("newSafe");
        vm.prank(admin);
        gift.beginDefaultAdminTransfer(newSafe);
        vm.prank(newSafe);
        vm.expectRevert();
        gift.acceptDefaultAdminTransfer();

        skip(2 days + 1);
        vm.prank(newSafe);
        gift.acceptDefaultAdminTransfer();
        assertEq(gift.defaultAdmin(), newSafe);
    }

    function test_adminCanMoveFundsForMigration() public {
        vm.prank(admin);
        gift.withdraw(gd, admin, 1_000 ether);
        assertEq(gd.balanceOf(admin), 1_000 ether);

        vm.prank(alice);
        vm.expectRevert(XurriBase.InsufficientFunds.selector);
        gift.claim();
    }

    function test_identityOffOnTestnets() public {
        XurriTournaments open =
            new XurriTournaments(gd, IIdentity(address(0)), admin, address(0), pauser, signer, ubi, 0, 5, 1 ether);
        vm.prank(stranger);
        open.startGame();
        assertEq(open.humanOf(stranger), stranger);
    }

    function testFuzz_boostSplitAddsUp(uint96 amount, uint16 bps) public {
        vm.assume(amount > 0);
        bps = uint16(bound(bps, 0, 5_000));
        vm.prank(admin);
        tournaments.setUbiConfig(ubi, bps);
        gd.mint(bob, amount);
        vm.startPrank(bob);
        gd.approve(address(tournaments), amount);
        uint256 toPot = tournaments.boost(amount);
        vm.stopPrank();
        assertEq(toPot + gd.balanceOf(ubi), amount);
        assertEq(gd.balanceOf(bob), 0);
    }
}
