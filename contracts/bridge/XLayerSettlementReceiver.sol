// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * XLayerSettlementReceiver (destination chain: XLayer)
 * - Off-chain relayer submits OKX-executed trade results
 * - Emits events for observability, prevents replay via tradeId
 * - Optionally transfers ERC20 from a treasury to the user as settlement
 */
contract XLayerSettlementReceiver is Ownable, Pausable, ReentrancyGuard {
    address public relayer;          // trusted relayer address
    address public treasury;         // ERC20 source for settlements

    mapping(bytes32 => bool) public processed; // tradeId -> finalized?

    event RelayerUpdated(address indexed relayer);
    event TreasuryUpdated(address indexed treasury);

    event SettlementFinalized(
        bytes32 indexed tradeId,
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 price,
        uint64 srcChainId,
        uint64 dstChainId,
        uint64 timestamp,
        bool    assetTransferred,
        bytes   extra
    );

    constructor(address initialOwner, address _relayer, address _treasury) Ownable(initialOwner) {
        relayer = _relayer;
        treasury = _treasury;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "not relayer");
        _;
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * Finalize a settlement on XLayer.
     * @param tradeId      Unique trade identifier (replay-protected)
     * @param user         Beneficiary user address on XLayer
     * @param asset        ERC20 asset address (0 for no transfer)
     * @param amount       Amount to transfer from treasury to user
     * @param price        Executed price on source
     * @param srcChainId   Source chain id
     * @param extra        Arbitrary metadata (OKX order id, proofs, URIs)
     */
    function finalizeSettlement(
        bytes32 tradeId,
        address user,
        address asset,
        uint256 amount,
        uint256 price,
        uint64 srcChainId,
        bytes calldata extra
    ) external whenNotPaused nonReentrant onlyRelayer {
        require(!processed[tradeId], "already processed");
        processed[tradeId] = true;

        bool transferred = false;
        if (asset != address(0) && amount > 0) {
            require(treasury != address(0), "treasury not set");
            // pull from treasury (requires prior approval to this contract) and send to user
            // If treasury holds funds, it must have approved this contract for 'amount'
            transferred = IERC20(asset).transferFrom(treasury, user, amount);
        }

        emit SettlementFinalized(
            tradeId,
            user,
            asset,
            amount,
            price,
            srcChainId,
            uint64(block.chainid),
            uint64(block.timestamp),
            transferred,
            extra
        );
    }
}
