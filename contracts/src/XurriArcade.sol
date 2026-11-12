// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @notice Minimal view of the GoodDollar Identity contract (face-verified, sybil-resistant accounts).
interface IIdentity {
    function isWhitelisted(address account) external view returns (bool);
}

/// @title XurriArcade
/// @notice On-chain reward layer for the Xurri arcade game on Celo, paid in GoodDollar (G$).
///
///  - Daily check-in: one claim per UTC day, with a capped streak bonus and a one-time referral bonus.
///  - Game rewards: the backend validates rounds off-chain and signs an EIP-712 voucher for the
///    player's *cumulative* earnings. Players redeem the difference; replaying a voucher pays nothing.
///  - Shop: players buy cosmetic/boost items with G$. Revenue goes to the treasury, which defaults
///    to this contract so purchases refill the reward pool.
///
///  The contract only pays out of its own G$ balance (the "pool"), which anyone can top up by
///  transferring G$ to it. A global daily voucher budget limits the damage of a leaked signer key.
contract XurriArcade is Ownable2Step, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------------
    // Types & storage
    // ---------------------------------------------------------------------------------------------

    struct Player {
        uint64 lastClaimDay; // UTC day index of the last daily claim
        uint32 streak; // consecutive days claimed
        uint32 totalClaims; // number of daily claims ever
        address referrer; // who invited this player (set once, before the first claim)
    }

    struct Item {
        uint128 price; // in G$ base units
        bool active;
    }

    bytes32 public constant REWARD_TYPEHASH =
        keccak256("RewardVoucher(address player,uint256 cumulativeAmount,uint256 deadline)");

    IERC20 public immutable token;

    IIdentity public identity; // address(0) disables verification checks
    address public signer;
    address public treasury;

    uint256 public dailyReward;
    uint256 public streakBonus; // extra G$ per consecutive day, on top of dailyReward
    uint32 public maxStreakBonusDays;
    uint256 public referralBonus; // paid to the referrer on the referee's first daily claim

    uint256 public dailyVoucherBudget; // max G$ redeemable through vouchers per UTC day, all players
    uint64 public voucherBudgetDay;
    uint256 public voucherSpentToday;

    mapping(address => Player) public players;
    mapping(address => uint256) public rewardsClaimed; // cumulative voucher amount already paid
    mapping(bytes32 => Item) public items;
    mapping(address => mapping(bytes32 => bool)) public owns;

    // ---------------------------------------------------------------------------------------------
    // Events & errors
    // ---------------------------------------------------------------------------------------------

    event DailyClaimed(address indexed player, uint256 amount, uint32 streak, uint64 day);
    event ReferrerSet(address indexed player, address indexed referrer);
    event ReferralPaid(address indexed referrer, address indexed player, uint256 amount);
    event RewardsClaimed(address indexed player, uint256 amount, uint256 cumulativeAmount);
    event ItemPurchased(address indexed player, bytes32 indexed itemId, uint256 price);
    event ItemUpdated(bytes32 indexed itemId, uint256 price, bool active);
    event SignerUpdated(address signer);
    event TreasuryUpdated(address treasury);
    event IdentityUpdated(address identity);
    event DailyConfigUpdated(uint256 dailyReward, uint256 streakBonus, uint32 maxStreakBonusDays, uint256 referralBonus);
    event VoucherBudgetUpdated(uint256 dailyVoucherBudget);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    error NotVerified();
    error AlreadyClaimedToday();
    error InvalidReferrer();
    error ReferrerAlreadySet();
    error VoucherExpired();
    error InvalidSignature();
    error NothingToClaim();
    error DailyBudgetExceeded();
    error InsufficientPool();
    error ItemUnavailable();
    error AlreadyOwned();
    error ZeroAddress();

    // ---------------------------------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------------------------------

    constructor(
        IERC20 token_,
        IIdentity identity_,
        address signer_,
        address treasury_,
        address owner_,
        uint256 dailyReward_,
        uint256 streakBonus_,
        uint32 maxStreakBonusDays_,
        uint256 referralBonus_,
        uint256 dailyVoucherBudget_
    ) Ownable(owner_) EIP712("XurriArcade", "1") {
        if (address(token_) == address(0) || signer_ == address(0)) revert ZeroAddress();
        token = token_;
        identity = identity_;
        signer = signer_;
        treasury = treasury_ == address(0) ? address(this) : treasury_;
        dailyReward = dailyReward_;
        streakBonus = streakBonus_;
        maxStreakBonusDays = maxStreakBonusDays_;
        referralBonus = referralBonus_;
        dailyVoucherBudget = dailyVoucherBudget_;
    }

    // ---------------------------------------------------------------------------------------------
    // Player actions
    // ---------------------------------------------------------------------------------------------

    /// @notice Record who invited you. Only possible before your first daily claim.
    function setReferrer(address referrer) external whenNotPaused {
        Player storage p = players[msg.sender];
        if (p.referrer != address(0)) revert ReferrerAlreadySet();
        if (referrer == address(0) || referrer == msg.sender || p.totalClaims != 0) revert InvalidReferrer();
        // The referrer must be an active player, which also stops referral loops on fresh wallets.
        if (players[referrer].totalClaims == 0) revert InvalidReferrer();
        p.referrer = referrer;
        emit ReferrerSet(msg.sender, referrer);
    }

    /// @notice Claim today's G$ check-in reward.
    function claimDaily() external nonReentrant whenNotPaused returns (uint256 amount) {
        _requireVerified(msg.sender);
        Player storage p = players[msg.sender];
        uint64 day = currentDay();
        if (p.totalClaims != 0 && p.lastClaimDay >= day) revert AlreadyClaimedToday();

        uint32 streak = (p.totalClaims != 0 && p.lastClaimDay + 1 == day) ? p.streak + 1 : 1;
        amount = _dailyAmount(streak);

        bool firstClaim = p.totalClaims == 0;
        p.lastClaimDay = day;
        p.streak = streak;
        p.totalClaims += 1;

        _payout(msg.sender, amount);
        emit DailyClaimed(msg.sender, amount, streak, day);

        if (firstClaim && p.referrer != address(0) && referralBonus != 0) {
            // A referral bonus never blocks the referee's own claim.
            if (token.balanceOf(address(this)) >= referralBonus) {
                token.safeTransfer(p.referrer, referralBonus);
                emit ReferralPaid(p.referrer, msg.sender, referralBonus);
            }
        }
    }

    /// @notice Redeem game rewards signed by the Xurri backend.
    /// @param cumulativeAmount Total G$ the player has ever earned from games, as signed by the backend.
    function claimRewards(uint256 cumulativeAmount, uint256 deadline, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amount)
    {
        if (block.timestamp > deadline) revert VoucherExpired();
        _requireVerified(msg.sender);

        bytes32 digest =
            _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH, msg.sender, cumulativeAmount, deadline)));
        if (!SignatureChecker.isValidSignatureNow(signer, digest, signature)) revert InvalidSignature();

        uint256 alreadyClaimed = rewardsClaimed[msg.sender];
        if (cumulativeAmount <= alreadyClaimed) revert NothingToClaim();
        amount = cumulativeAmount - alreadyClaimed;

        uint64 day = currentDay();
        if (voucherBudgetDay != day) {
            voucherBudgetDay = day;
            voucherSpentToday = 0;
        }
        if (voucherSpentToday + amount > dailyVoucherBudget) revert DailyBudgetExceeded();
        voucherSpentToday += amount;

        rewardsClaimed[msg.sender] = cumulativeAmount;
        _payout(msg.sender, amount);
        emit RewardsClaimed(msg.sender, amount, cumulativeAmount);
    }

    /// @notice Buy a shop item. Requires a prior G$ approval of at least the item price.
    function buyItem(bytes32 itemId) external nonReentrant whenNotPaused {
        Item memory item = items[itemId];
        if (!item.active) revert ItemUnavailable();
        if (owns[msg.sender][itemId]) revert AlreadyOwned();
        owns[msg.sender][itemId] = true;
        token.safeTransferFrom(msg.sender, treasury, item.price);
        emit ItemPurchased(msg.sender, itemId, item.price);
    }

    // ---------------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------------

    function currentDay() public view returns (uint64) {
        return uint64(block.timestamp / 1 days);
    }

    /// @notice G$ available for payouts.
    function poolBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function isVerified(address account) public view returns (bool) {
        return address(identity) == address(0) || identity.isWhitelisted(account);
    }

    /// @notice Whether `account` can claim today, what they would get and the streak it would reach.
    function previewDaily(address account) external view returns (bool canClaim, uint256 amount, uint32 nextStreak) {
        Player memory p = players[account];
        uint64 day = currentDay();
        bool claimedToday = p.totalClaims != 0 && p.lastClaimDay >= day;
        nextStreak = (p.totalClaims != 0 && p.lastClaimDay + 1 == day) ? p.streak + 1 : 1;
        if (claimedToday) nextStreak = p.streak;
        amount = _dailyAmount(nextStreak);
        canClaim = !claimedToday && !paused() && isVerified(account);
    }

    /// @notice The streak a player currently holds (0 once a day has been missed).
    function currentStreak(address account) external view returns (uint32) {
        Player memory p = players[account];
        if (p.totalClaims == 0 || p.lastClaimDay + 1 < currentDay()) return 0;
        return p.streak;
    }

    function hashRewardVoucher(address player, uint256 cumulativeAmount, uint256 deadline)
        external
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH, player, cumulativeAmount, deadline)));
    }

    // ---------------------------------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------------------------------

    function setItem(bytes32 itemId, uint128 price, bool active) external onlyOwner {
        items[itemId] = Item({price: price, active: active});
        emit ItemUpdated(itemId, price, active);
    }

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert ZeroAddress();
        signer = signer_;
        emit SignerUpdated(signer_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_ == address(0) ? address(this) : treasury_;
        emit TreasuryUpdated(treasury);
    }

    function setIdentity(IIdentity identity_) external onlyOwner {
        identity = identity_;
        emit IdentityUpdated(address(identity_));
    }

    function setDailyConfig(uint256 dailyReward_, uint256 streakBonus_, uint32 maxStreakBonusDays_, uint256 referralBonus_)
        external
        onlyOwner
    {
        dailyReward = dailyReward_;
        streakBonus = streakBonus_;
        maxStreakBonusDays = maxStreakBonusDays_;
        referralBonus = referralBonus_;
        emit DailyConfigUpdated(dailyReward_, streakBonus_, maxStreakBonusDays_, referralBonus_);
    }

    function setDailyVoucherBudget(uint256 budget) external onlyOwner {
        dailyVoucherBudget = budget;
        emit VoucherBudgetUpdated(budget);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Move tokens out of the contract, e.g. to migrate the pool or recover stray tokens.
    function withdraw(IERC20 asset, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        asset.safeTransfer(to, amount);
        emit Withdrawn(address(asset), to, amount);
    }

    // ---------------------------------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------------------------------

    function _dailyAmount(uint32 streak) internal view returns (uint256) {
        uint256 bonusDays = streak > 0 ? streak - 1 : 0;
        if (bonusDays > maxStreakBonusDays) bonusDays = maxStreakBonusDays;
        return dailyReward + streakBonus * bonusDays;
    }

    function _requireVerified(address account) internal view {
        if (!isVerified(account)) revert NotVerified();
    }

    function _payout(address to, uint256 amount) internal {
        if (token.balanceOf(address(this)) < amount) revert InsufficientPool();
        token.safeTransfer(to, amount);
    }
}
