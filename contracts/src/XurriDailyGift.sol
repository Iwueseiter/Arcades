// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IIdentity, XurriBase} from "./base/XurriBase.sol";

/// @title XurriDailyGift
/// @notice One G$ gift per verified person per UTC day, growing with a streak. It pays from its own
/// balance, separate from tournament prizes, so a problem in one can't drain the other.
contract XurriDailyGift is XurriBase {
    struct Streak {
        uint64 lastDay; // UTC day of the last claim
        uint32 streak; // days in a row
        uint32 claims; // claims ever
    }

    /// @notice The biggest gift the operator may ever set (base plus full streak bonus). Fixed at deploy.
    uint256 public immutable maxGift;

    uint256 public baseGift;
    uint256 public streakBonus; // extra G$ per day in a row
    uint32 public maxBonusDays;

    /// @notice Streaks are kept per person (GoodDollar identity), not per wallet.
    mapping(address human => Streak) public streaks;

    uint256 public totalClaims;
    uint256 public totalPaid;

    event GiftClaimed(address indexed player, address indexed human, uint256 amount, uint32 streak, uint64 day);
    event GiftConfigUpdated(uint256 baseGift, uint256 streakBonus, uint32 maxBonusDays);

    error AlreadyClaimedToday();
    error GiftTooBig();

    constructor(
        IERC20 token_,
        IIdentity identity_,
        address admin,
        address operator,
        address pauser,
        uint256 maxGift_,
        uint256 baseGift_,
        uint256 streakBonus_,
        uint32 maxBonusDays_
    ) XurriBase(token_, identity_, admin, operator, pauser) {
        maxGift = maxGift_;
        _setGift(baseGift_, streakBonus_, maxBonusDays_);
    }

    /// @notice Claim today's gift. The G$ goes to the calling wallet.
    function claim() external nonReentrant whenNotPaused returns (uint256 amount) {
        address human = _requireHuman(msg.sender);
        Streak storage s = streaks[human];
        uint64 day = currentDay();
        if (s.claims != 0 && s.lastDay >= day) revert AlreadyClaimedToday();

        uint32 streak = (s.claims != 0 && s.lastDay + 1 == day) ? s.streak + 1 : 1;
        amount = giftFor(streak);
        s.lastDay = day;
        s.streak = streak;
        s.claims += 1;
        totalClaims += 1;
        totalPaid += amount;

        _pay(msg.sender, amount);
        emit GiftClaimed(msg.sender, human, amount, streak, day);
    }

    /// @notice Whether `account` can claim now, how much, and the streak it would reach.
    function preview(address account) external view returns (bool canClaim, uint256 amount, uint32 nextStreak) {
        address human = humanOf(account);
        Streak memory s = streaks[human];
        uint64 day = currentDay();
        bool claimedToday = s.claims != 0 && s.lastDay >= day;
        nextStreak = claimedToday ? s.streak : (s.claims != 0 && s.lastDay + 1 == day) ? s.streak + 1 : 1;
        amount = giftFor(nextStreak);
        canClaim = human != address(0) && !claimedToday && !paused() && token.balanceOf(address(this)) >= amount;
    }

    /// @notice The streak `account`'s person holds right now (0 once a day is missed).
    function streakOf(address account) external view returns (uint32) {
        Streak memory s = streaks[humanOf(account)];
        if (s.claims == 0 || s.lastDay + 1 < currentDay()) return 0;
        return s.streak;
    }

    function giftFor(uint32 streak) public view returns (uint256) {
        uint256 bonusDays = streak > 0 ? streak - 1 : 0;
        if (bonusDays > maxBonusDays) bonusDays = maxBonusDays;
        return baseGift + streakBonus * bonusDays;
    }

    function setGift(uint256 baseGift_, uint256 streakBonus_, uint32 maxBonusDays_) external onlyRole(OPERATOR_ROLE) {
        _setGift(baseGift_, streakBonus_, maxBonusDays_);
    }

    function _setGift(uint256 baseGift_, uint256 streakBonus_, uint32 maxBonusDays_) private {
        if (baseGift_ + streakBonus_ * maxBonusDays_ > maxGift) revert GiftTooBig();
        baseGift = baseGift_;
        streakBonus = streakBonus_;
        maxBonusDays = maxBonusDays_;
        emit GiftConfigUpdated(baseGift_, streakBonus_, maxBonusDays_);
    }
}
