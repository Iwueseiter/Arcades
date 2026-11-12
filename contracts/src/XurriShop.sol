// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IIdentity, UbiShare, XurriBase} from "./base/XurriBase.sol";

/// @title XurriShop
/// @notice Cosmetic items bought with G$. Every purchase is split: a share funds GoodDollar's UBI pool
/// and the rest goes to the tournament prize pot, so spending in the shop pays out to players again.
/// The shop itself never holds G$.
contract XurriShop is UbiShare {
    struct Item {
        uint128 price; // G$ base units
        bool active;
    }

    /// @notice Where the non-UBI part of each purchase goes: the XurriTournaments contract.
    address public prizePot;

    mapping(bytes32 itemId => Item) public items;
    mapping(address player => mapping(bytes32 itemId => bool)) public owns;

    uint256 public totalSales;
    uint256 public totalSpent;

    event ItemBought(address indexed player, bytes32 indexed itemId, uint256 price, uint256 toPot, uint256 toUbi);
    event ItemUpdated(bytes32 indexed itemId, uint256 price, bool active);
    event PrizePotUpdated(address prizePot);

    error ItemUnavailable();
    error AlreadyOwned();

    constructor(
        IERC20 token_,
        address admin,
        address operator,
        address pauser,
        address prizePot_,
        address ubiRecipient_,
        uint16 ubiShareBps_
    ) XurriBase(token_, IIdentity(address(0)), admin, operator, pauser) UbiShare(ubiRecipient_, ubiShareBps_) {
        if (prizePot_ == address(0)) revert ZeroAddress();
        prizePot = prizePot_;
    }

    /// @notice Buy an item. Needs a G$ approval for the price first. Any wallet can shop.
    function buy(bytes32 itemId) external nonReentrant whenNotPaused {
        Item memory item = items[itemId];
        if (!item.active) revert ItemUnavailable();
        if (owns[msg.sender][itemId]) revert AlreadyOwned();
        owns[msg.sender][itemId] = true;
        totalSales += 1;
        totalSpent += item.price;
        uint256 toUbi = _collect(msg.sender, item.price, prizePot);
        emit ItemBought(msg.sender, itemId, item.price, item.price - toUbi, toUbi);
    }

    function setItem(bytes32 itemId, uint128 price, bool active) external onlyRole(OPERATOR_ROLE) {
        items[itemId] = Item({price: price, active: active});
        emit ItemUpdated(itemId, price, active);
    }

    function setPrizePot(address prizePot_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (prizePot_ == address(0)) revert ZeroAddress();
        prizePot = prizePot_;
        emit PrizePotUpdated(prizePot_);
    }
}
