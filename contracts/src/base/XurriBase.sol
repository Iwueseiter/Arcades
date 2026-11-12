// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal view of the GoodDollar Identity contract. `getWhitelistedRoot` returns the verified
/// account an address belongs to (itself, or the face-verified root it is connected to), or address(0).
interface IIdentity {
    function getWhitelistedRoot(address account) external view returns (address);
}

/// @title XurriBase
/// @notice What every Xurri contract shares: G$, roles, the pause switch, the GoodDollar face check and
/// the game calendar.
///
/// Roles:
///  - DEFAULT_ADMIN_ROLE (a Safe multisig): keys and money. Sets the signer, identity and UBI address,
///    withdraws funds, unpauses and manages roles. Handing it over takes a 2-day wait.
///  - OPERATOR_ROLE: day-to-day settings within the limits each contract sets, such as prices and limits.
///  - PAUSER_ROLE: can only pause. Give it to a fast-reacting key so a problem can be stopped at once;
///    only the admin can unpause.
abstract contract XurriBase is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable token;
    /// @notice GoodDollar Identity. address(0) turns the face check off (testnets only).
    IIdentity public identity;

    event IdentityUpdated(address identity);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    error NotVerified();
    error ZeroAddress();
    error InsufficientFunds();

    constructor(IERC20 token_, IIdentity identity_, address admin, address operator, address pauser)
        AccessControlDefaultAdminRules(2 days, admin)
    {
        if (address(token_) == address(0)) revert ZeroAddress();
        token = token_;
        identity = identity_;
        // The admin can always pause and change settings itself.
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        if (operator != address(0)) _grantRole(OPERATOR_ROLE, operator);
        if (pauser != address(0)) _grantRole(PAUSER_ROLE, pauser);
    }

    // ---------------------------------------------------------------------------------------------
    // Calendar: days and weeks in UTC. Weeks start on Monday 00:00 UTC, matching the app's ISO weeks.
    // ---------------------------------------------------------------------------------------------

    function currentDay() public view returns (uint64) {
        return uint64(block.timestamp / 1 days);
    }

    /// @notice Week number since 1970. The Unix epoch was a Thursday, so shifting by 3 days lands weeks on Mondays.
    function currentWeek() public view returns (uint64) {
        return uint64((block.timestamp + 3 days) / 7 days);
    }

    // ---------------------------------------------------------------------------------------------
    // GoodDollar face check
    // ---------------------------------------------------------------------------------------------

    /// @notice The verified person behind `account`, or address(0) if it isn't verified. Several wallets
    /// connected to one GoodDollar identity share the same human, so per-person limits can't be farmed.
    function humanOf(address account) public view returns (address) {
        if (address(identity) == address(0)) return account;
        return identity.getWhitelistedRoot(account);
    }

    function isVerified(address account) public view returns (bool) {
        return humanOf(account) != address(0);
    }

    function _requireHuman(address account) internal view returns (address human) {
        human = humanOf(account);
        if (human == address(0)) revert NotVerified();
    }

    // ---------------------------------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------------------------------

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setIdentity(IIdentity identity_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        identity = identity_;
        emit IdentityUpdated(address(identity_));
    }

    /// @notice Move tokens out, e.g. to migrate to a new contract or recover tokens sent by mistake.
    function withdraw(IERC20 asset, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        asset.safeTransfer(to, amount);
        emit Withdrawn(address(asset), to, amount);
    }

    function _pay(address to, uint256 amount) internal {
        if (token.balanceOf(address(this)) < amount) revert InsufficientFunds();
        token.safeTransfer(to, amount);
    }
}

/// @title UbiShare
/// @notice Sends a share of G$ spent in Xurri to GoodDollar's UBI pool, so playing also funds basic income.
abstract contract UbiShare is XurriBase {
    using SafeERC20 for IERC20;

    uint16 public constant MAX_UBI_SHARE_BPS = 5_000; // never more than half

    /// @notice Where the UBI share goes: GoodDollar's UBIScheme on Celo, which pays out the daily claim.
    address public ubiRecipient;
    /// @notice Share of spending sent to `ubiRecipient`, in basis points (1000 = 10%).
    uint16 public ubiShareBps;
    /// @notice All G$ ever sent to the UBI pool from this contract.
    uint256 public totalToUbi;

    event UbiConfigUpdated(address recipient, uint16 shareBps);
    event UbiFunded(address indexed recipient, uint256 amount);

    error ShareTooHigh();

    constructor(address recipient, uint16 shareBps) {
        _setUbi(recipient, shareBps);
    }

    /// @notice Only the admin can redirect money, so the recipient is admin-only; the share is capped.
    function setUbiConfig(address recipient, uint16 shareBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setUbi(recipient, shareBps);
    }

    /// @dev Pulls `amount` from `from`, sends the UBI share on and keeps the rest at `restTo`.
    function _collect(address from, uint256 amount, address restTo) internal returns (uint256 toUbi) {
        toUbi = ubiRecipient == address(0) ? 0 : (amount * ubiShareBps) / 10_000;
        if (toUbi != 0) {
            token.safeTransferFrom(from, ubiRecipient, toUbi);
            totalToUbi += toUbi;
            emit UbiFunded(ubiRecipient, toUbi);
        }
        token.safeTransferFrom(from, restTo, amount - toUbi);
    }

    function _setUbi(address recipient, uint16 shareBps) private {
        if (shareBps > MAX_UBI_SHARE_BPS) revert ShareTooHigh();
        ubiRecipient = recipient;
        ubiShareBps = shareBps;
        emit UbiConfigUpdated(recipient, shareBps);
    }
}
