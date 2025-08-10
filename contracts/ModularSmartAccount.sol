// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/**
 * @title ModularSmartAccount
 * @notice ERC-4337-compatible smart account with session keys, basic social recovery, and gas abstraction via EntryPoint
 * - Session keys with expiration
 * - Guardian-based social recovery (1-of-N by default; can be extended to M-of-N)
 * - Modular execute/executeBatch for future upgrades
 */
contract ModularSmartAccount is BaseAccount, Ownable {
    using ECDSA for bytes32;

    // ============ Session Keys ============
    mapping(address => uint256) public sessionKeyExpiry; // key => validUntil (timestamp)

    // ============ Guardians (Social Recovery) ============
    mapping(address => bool) public guardian;
    uint256 public guardianCount;

    // ============ Events ============
    event SessionKeyAdded(address indexed key, uint256 validUntil);
    event SessionKeyRevoked(address indexed key);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event OwnerRecovered(address indexed byGuardian, address indexed newOwner);

    // ============ Modifiers ============
    modifier onlyEntryPointOrOwner() {
        require(msg.sender == address(entryPoint()) || msg.sender == owner(), "SmartAccount: not authorized");
        _;
    }

    // ============ EntryPoint storage ============
    IEntryPoint private immutable _ep;

    // ============ Constructor ============
    constructor(IEntryPoint _entryPoint, address _initialOwner) Ownable(_initialOwner) {
        _ep = _entryPoint;
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _ep;
    }

    // ============ ERC-4337: validateUserOp ============
    /**
     * @dev Validates userOp signature and pays missing funds to the EntryPoint
     * Returns validationData: 0 on success, or packed failure/validAfter/validUntil per ERC-4337
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        _requireFromEntryPoint();
        
        // Validate signature (owner or non-expired session key)
        if (!_isValidSig(userOp.signature, userOpHash)) {
            return 1; // SIG_VALIDATION_FAILED per ERC-4337 (non-zero indicates invalid)
        }

        // Top up funds at EntryPoint if needed
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(address(entryPoint())).call{value: missingAccountFunds}("");
            require(success, "SmartAccount: fund top-up failed");
        }
        return 0; // valid
    }

    // ============ Public entry points for execution (via EntryPoint) ============
    function execute(address target, uint256 value, bytes calldata data) external override {
        _requireFromEntryPoint();
        _call(target, value, data);
    }

    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external {
        _requireFromEntryPoint();
        require(targets.length == values.length && values.length == datas.length, "SmartAccount: length mismatch");
        for (uint256 i = 0; i < targets.length; i++) {
            _call(targets[i], values[i], datas[i]);
        }
    }

    // ============ Direct execution for owner (bypasses EntryPoint) ============
    function executeByOwner(address target, uint256 value, bytes calldata data) external onlyOwner {
        _call(target, value, data);
    }

    function executeBatchByOwner(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external onlyOwner {
        require(targets.length == values.length && values.length == datas.length, "SmartAccount: length mismatch");
        for (uint256 i = 0; i < targets.length; i++) {
            _call(targets[i], values[i], datas[i]);
        }
    }

    // ============ Session Key Management ============
    function addSessionKey(address key, uint256 validForSeconds) external onlyOwner {
        require(key != address(0), "SmartAccount: bad key");
        uint256 validUntil = block.timestamp + validForSeconds;
        sessionKeyExpiry[key] = validUntil;
        emit SessionKeyAdded(key, validUntil);
    }

    function revokeSessionKey(address key) external onlyOwner {
        require(sessionKeyExpiry[key] != 0, "SmartAccount: not found");
        delete sessionKeyExpiry[key];
        emit SessionKeyRevoked(key);
    }

    function isSessionKeyValid(address key) public view returns (bool) {
        uint256 exp = sessionKeyExpiry[key];
        return exp != 0 && exp >= block.timestamp;
    }

    // ============ Social Recovery (1-of-N guardians) ============
    function addGuardian(address g) external onlyOwner {
        require(g != address(0) && !guardian[g], "SmartAccount: invalid guardian");
        guardian[g] = true;
        guardianCount += 1;
        emit GuardianAdded(g);
    }

    function removeGuardian(address g) external onlyOwner {
        require(guardian[g], "SmartAccount: not guardian");
        guardian[g] = false;
        guardianCount -= 1;
        emit GuardianRemoved(g);
    }

    function recoverOwner(address newOwner) external {
        require(guardian[msg.sender], "SmartAccount: not guardian");
        require(newOwner != address(0), "SmartAccount: bad owner");
        _transferOwnership(newOwner);
        emit OwnerRecovered(msg.sender, newOwner);
    }

    // ============ Internal helpers ============
    function _isValidSig(bytes calldata signature, bytes32 userOpHash) internal view returns (bool) {
        // ERC-191 digest hash
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        address signer = ECDSA.recover(digest, signature);
        if (signer == owner()) return true;
        if (isSessionKeyValid(signer)) return true;
        return false;
    }

    // BaseAccount hook implementation
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256) {
        return _isValidSig(userOp.signature, userOpHash) ? 0 : 1;
    }

    function _call(address target, uint256 value, bytes calldata data) internal {
        (bool success, bytes memory ret) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
    }

    receive() external payable {}
}