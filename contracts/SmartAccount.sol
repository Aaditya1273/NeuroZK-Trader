// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/**
 * @title SmartAccount
 * @dev An ERC-4337 compliant smart contract account with support for session keys, social recovery, and gas abstraction.
 * This contract is modular to allow for future upgrades.
 */
contract SmartAccount is BaseAccount, Ownable {
    using ECDSA for bytes32;
    // Mapping from session key to its expiration timestamp
    mapping(address => uint256) public sessionKeys;

    // Mapping from recovery address to a boolean indicating if it's a valid recovery key
    mapping(address => bool) public recoveryKeys;

    event SessionKeyAdded(address indexed sessionKey, uint256 expiration);
    event SessionKeyRevoked(address indexed sessionKey);
    event RecoveryKeyAdded(address indexed recoveryKey);
    event RecoveryKeyRevoked(address indexed recoveryKey);

    IEntryPoint private immutable _ep;

    constructor(IEntryPoint anEntryPoint, address initialOwner) Ownable(initialOwner) {
        _ep = anEntryPoint;
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _ep;
    }

    /**
     * @dev Validates the signature of a user operation.
     */
    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash) internal view override returns (uint256) {
        bytes32 hash = getMessageHash(userOpHash);
        address recoveredSigner = hash.recover(userOp.signature);
        return (recoveredSigner == owner() || sessionKeys[recoveredSigner] > block.timestamp) ? 0 : 1;
    }

    /**
     * @dev Executes a transaction from the account.
     */
    function _execute(bytes memory _calldata) internal {
        (bool success, bytes memory result) = address(this).call(_calldata);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    // --- Session Key Management ---
    function addSessionKey(address _sessionKey, uint256 _expiration) public onlyOwner {
        require(_sessionKey != address(0), "Invalid session key address");
        sessionKeys[_sessionKey] = block.timestamp + _expiration;
        emit SessionKeyAdded(_sessionKey, sessionKeys[_sessionKey]);
    }

    function revokeSessionKey(address _sessionKey) public onlyOwner {
        require(sessionKeys[_sessionKey] > 0, "Session key not found");
        delete sessionKeys[_sessionKey];
        emit SessionKeyRevoked(_sessionKey);
    }

    // --- Social Recovery Management ---
    function addRecoveryKey(address _recoveryKey) public onlyOwner {
        require(_recoveryKey != address(0), "Invalid recovery key address");
        recoveryKeys[_recoveryKey] = true;
        emit RecoveryKeyAdded(_recoveryKey);
    }

    function revokeRecoveryKey(address _recoveryKey) public onlyOwner {
        require(recoveryKeys[_recoveryKey], "Recovery key not found");
        delete recoveryKeys[_recoveryKey];
        emit RecoveryKeyRevoked(_recoveryKey);
    }

    function recoverOwner(address _newOwner) public {
        require(recoveryKeys[msg.sender], "Not a valid recovery key");
        transferOwnership(_newOwner);
    }

    // --- Helper Functions ---
    function getMessageHash(bytes32 _userOpHash) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _userOpHash));
    }

    receive() external payable {}
}
