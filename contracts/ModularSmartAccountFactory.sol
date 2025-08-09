// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "./ModularSmartAccount.sol";

/**
 * @title ModularSmartAccountFactory
 * @notice Deterministic factory for deploying ModularSmartAccount via CREATE2
 */
contract ModularSmartAccountFactory {
    IEntryPoint public immutable entryPoint;

    event AccountCreated(address indexed account, address indexed owner, bytes32 salt);

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice Deploy a new account using CREATE2. Address is deterministic for (owner, salt).
     * @param owner The initial owner of the account
     * @param salt Arbitrary salt for CREATE2
     */
    function createAccount(address owner, bytes32 salt) external returns (address account) {
        bytes memory bytecode = abi.encodePacked(
            type(ModularSmartAccount).creationCode,
            abi.encode(entryPoint, owner)
        );
        assembly {
            account := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(account != address(0), "Factory: create2 failed");
        emit AccountCreated(account, owner, salt);
    }

    /**
     * @notice Compute the address where an account would be deployed for given (owner, salt)
     */
    function getAddress(address owner, bytes32 salt) external view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(
            type(ModularSmartAccount).creationCode,
            abi.encode(entryPoint, owner)
        );
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        ));
        predicted = address(uint160(uint256(hash)));
    }
}
