// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SmartAccount
 * @dev An ERC-4337 compliant smart contract account with support for session keys, social recovery, and gas abstraction.
 * This contract is modular to allow for future upgrades.
 */
contract SmartAccount is BaseAccount, Ownable {
    // Mapping from session key to its expiration timestamp
    mapping(address => uint256) public sessionKeys;

    // Mapping from recovery address to a boolean indicating if it's a valid recovery key
    mapping(address => bool) public recoveryKeys;

    event SessionKeyAdded(address indexed sessionKey, uint256 expiration);
    event SessionKeyRevoked(address indexed sessionKey);
    event RecoveryKeyAdded(address indexed recoveryKey);
    event RecoveryKeyRevoked(address indexed recoveryKey);

    constructor(EntryPoint anEntryPoint, address initialOwner) BaseAccount(anEntryPoint) Ownable(initialOwner) {}

    /**
     * @dev The core logic of the account, handling validation and execution of user operations.
     */
    function _validateAndExecute(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) internal override onlyEntryPoint {
        _validateSignature(userOp, userOpHash);

        if (missingAccountFunds != 0) {
            (bool success, ) = payable(entryPoint()).call{value: missingAccountFunds}("");
            require(success, "Failed to pay missing funds");
        }

        _execute(userOp.callData, userOp.callGasLimit);
    }

    /**
     * @dev Validates the signature of a user operation.
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash) internal view override {
        bytes32 hash = getMessageHash(userOpHash);
        address recoveredSigner = hash.recover(userOp.signature);

        require(recoveredSigner == owner() || sessionKeys[recoveredSigner] > block.timestamp, "Invalid signature or session key");
    }

    /**
     * @dev Executes a transaction from the account.
     */
    function _execute(bytes memory _calldata, uint256 _gasLimit) internal {
        (bool success, bytes memory result) = address(this).call{gas: _gasLimit}(_calldata);
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
