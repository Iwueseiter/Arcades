// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IIdentity, UbiShare, XurriBase} from "./base/XurriBase.sol";

/// @title XurriTournaments
/// @notice The weekly tournament: game starts, the community prize pot and prize payouts.
///
///  - Games: `startGame()` records a tournament game for a verified person, a few per day. The server
///    only ranks games it can match to a `GameStarted` event.
///  - Pot: anyone (players, sponsors, donors) can `boost()` this week's pot with G$. A share goes to
///    GoodDollar's UBI pool; the rest stays here and raises this week's prizes.
///  - Prizes: when a week ends the server ranks it and signs a ticket for each winner's total prizes
///    so far. `claimPrizes` pays only what's new, so a ticket can't be used twice, and a daily payout
///    limit caps the damage if the signer key ever leaks.
contract XurriTournaments is UbiShare, EIP712 {
    bytes32 public constant PRIZE_TYPEHASH =
        keccak256("PrizeTicket(address player,uint256 cumulativeAmount,uint256 deadline)");
    uint32 public constant MAX_PLAYS_PER_DAY_LIMIT = 50;

    /// @notice Key held by the Xurri server that signs prize tickets. It holds no funds.
    address public signer;

    uint32 public maxPlaysPerDay;
    /// @notice Tournament games used, per person per day.
    mapping(address human => mapping(uint64 day => uint32)) public playsOnDay;

    /// @notice G$ added to each week's pot through `boost` (after the UBI share).
    mapping(uint64 week => uint256) public boosted;

    uint256 public dailyPayoutLimit;
    uint64 public payoutDay;
    uint256 public paidToday;
    /// @notice Prize total already paid to each wallet (tickets are cumulative).
    mapping(address player => uint256) public prizesClaimed;

    uint256 public totalGames;
    uint256 public totalBoosted;
    uint256 public totalPrizesPaid;

    event GameStarted(
        address indexed player, address indexed human, uint64 indexed week, uint64 day, uint32 playNumber
    );
    event PotBoosted(address indexed from, uint64 indexed week, uint256 amount, uint256 toPot, uint256 toUbi);
    event PrizesClaimed(address indexed player, uint256 amount, uint256 cumulativeAmount);
    event SignerUpdated(address signer);
    event PlayLimitUpdated(uint32 maxPlaysPerDay);
    event PayoutLimitUpdated(uint256 dailyPayoutLimit);

    error NoPlaysLeft();
    error InvalidLimit();
    error TicketExpired();
    error InvalidSignature();
    error NothingToClaim();
    error PayoutLimitReached();
    error ZeroAmount();

    constructor(
        IERC20 token_,
        IIdentity identity_,
        address admin,
        address operator,
        address pauser,
        address signer_,
        address ubiRecipient_,
        uint16 ubiShareBps_,
        uint32 maxPlaysPerDay_,
        uint256 dailyPayoutLimit_
    )
        XurriBase(token_, identity_, admin, operator, pauser)
        UbiShare(ubiRecipient_, ubiShareBps_)
        EIP712("XurriTournaments", "1")
    {
        if (signer_ == address(0)) revert ZeroAddress();
        if (maxPlaysPerDay_ == 0 || maxPlaysPerDay_ > MAX_PLAYS_PER_DAY_LIMIT) revert InvalidLimit();
        signer = signer_;
        maxPlaysPerDay = maxPlaysPerDay_;
        dailyPayoutLimit = dailyPayoutLimit_;
    }

    // ---------------------------------------------------------------------------------------------
    // Games
    // ---------------------------------------------------------------------------------------------

    /// @notice Start a tournament game. Free apart from the network fee.
    function startGame() external whenNotPaused returns (uint32 playNumber) {
        address human = _requireHuman(msg.sender);
        uint64 day = currentDay();
        playNumber = playsOnDay[human][day] + 1;
        if (playNumber > maxPlaysPerDay) revert NoPlaysLeft();
        playsOnDay[human][day] = playNumber;
        totalGames += 1;
        emit GameStarted(msg.sender, human, currentWeek(), day, playNumber);
    }

    function playsLeft(address account) external view returns (uint32) {
        address human = humanOf(account);
        if (human == address(0)) return 0;
        uint32 used = playsOnDay[human][currentDay()];
        return used >= maxPlaysPerDay ? 0 : maxPlaysPerDay - used;
    }

    // ---------------------------------------------------------------------------------------------
    // Prize pot
    // ---------------------------------------------------------------------------------------------

    /// @notice Add G$ to this week's prize pot. Needs a G$ approval first. Open to anyone.
    function boost(uint256 amount) external nonReentrant whenNotPaused returns (uint256 toPot) {
        if (amount == 0) revert ZeroAmount();
        uint256 toUbi = _collect(msg.sender, amount, address(this));
        toPot = amount - toUbi;
        uint64 week = currentWeek();
        boosted[week] += toPot;
        totalBoosted += toPot;
        emit PotBoosted(msg.sender, week, amount, toPot, toUbi);
    }

    /// @notice G$ available for prizes.
    function potBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ---------------------------------------------------------------------------------------------
    // Prizes
    // ---------------------------------------------------------------------------------------------

    /// @notice Collect tournament prizes with a ticket signed by the Xurri server.
    /// @param cumulativeAmount Everything this wallet has ever won, as signed by the server.
    function claimPrizes(uint256 cumulativeAmount, uint256 deadline, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amount)
    {
        if (block.timestamp > deadline) revert TicketExpired();
        _requireHuman(msg.sender);

        // The signer is a plain key on the server, so check the ECDSA signature directly. (A smart-wallet
        // check would break if that address ever gained code, e.g. through an EIP-7702 delegation.)
        (address recovered, ECDSA.RecoverError err,) =
            ECDSA.tryRecover(hashPrizeTicket(msg.sender, cumulativeAmount, deadline), signature);
        if (err != ECDSA.RecoverError.NoError || recovered != signer) revert InvalidSignature();

        uint256 already = prizesClaimed[msg.sender];
        if (cumulativeAmount <= already) revert NothingToClaim();
        amount = cumulativeAmount - already;

        uint64 day = currentDay();
        if (payoutDay != day) {
            payoutDay = day;
            paidToday = 0;
        }
        if (paidToday + amount > dailyPayoutLimit) revert PayoutLimitReached();
        paidToday += amount;

        prizesClaimed[msg.sender] = cumulativeAmount;
        totalPrizesPaid += amount;
        _pay(msg.sender, amount);
        emit PrizesClaimed(msg.sender, amount, cumulativeAmount);
    }

    function hashPrizeTicket(address player, uint256 cumulativeAmount, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(PRIZE_TYPEHASH, player, cumulativeAmount, deadline)));
    }

    // ---------------------------------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------------------------------

    /// @notice Swap the ticket signer, e.g. after a leak. Admin only, since the signer controls payouts.
    function setSigner(address signer_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (signer_ == address(0)) revert ZeroAddress();
        signer = signer_;
        emit SignerUpdated(signer_);
    }

    /// @notice Raising the payout limit raises what a leaked signer could take, so it's admin only.
    function setDailyPayoutLimit(uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyPayoutLimit = limit;
        emit PayoutLimitUpdated(limit);
    }

    function setMaxPlaysPerDay(uint32 maxPlaysPerDay_) external onlyRole(OPERATOR_ROLE) {
        if (maxPlaysPerDay_ == 0 || maxPlaysPerDay_ > MAX_PLAYS_PER_DAY_LIMIT) revert InvalidLimit();
        maxPlaysPerDay = maxPlaysPerDay_;
        emit PlayLimitUpdated(maxPlaysPerDay_);
    }
}
