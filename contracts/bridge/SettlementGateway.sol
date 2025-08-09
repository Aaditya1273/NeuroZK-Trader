// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * SettlementGateway (source chain)
 * - Emits events for off-chain relay into XLayer
 * - Minimal on-chain state; authorization gates to prevent spam
 */
contract SettlementGateway is Ownable, Pausable, ReentrancyGuard {
    // authorized callers that can request settlements (e.g., backend, smart account, or strategy executor)
    mapping(address => bool) public isAuthorized;

    event AuthorizedSetter(address indexed caller, bool allowed);

    // Emitted when a settlement is requested to the destination chain (XLayer)
    event SettlementRequested(
        bytes32 indexed tradeId,
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 price,
        uint64 srcChainId,
        uint64 dstChainId,
        uint64 timestamp,
        bytes extra // arbitrary metadata: e.g., OKX order id, signature, URI
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAuthorized(address caller, bool allowed) external onlyOwner {
        isAuthorized[caller] = allowed;
        emit AuthorizedSetter(caller, allowed);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * Request a settlement to XLayer. Off-chain relayer listens for the event and posts to the receiver.
     */
    function requestSettlement(
        bytes32 tradeId,
        address user,
        address asset,
        uint256 amount,
        uint256 price,
        uint64 dstChainId,
        bytes calldata extra
    ) external whenNotPaused nonReentrant {
        require(isAuthorized[msg.sender], "not authorized");
        emit SettlementRequested(
            tradeId,
            user,
            asset,
            amount,
            price,
            uint64(block.chainid),
            dstChainId,
            uint64(block.timestamp),
            extra
        );
    }
}
