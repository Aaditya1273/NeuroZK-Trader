// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SmartAccount.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";

/**
 * @title SmartAccountFactory
 * @dev A factory contract to deploy new instances of SmartAccount.
 */
contract SmartAccountFactory {
    EntryPoint public immutable entryPoint;

    event AccountCreated(address indexed account, address indexed owner);

    constructor(EntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @dev Deploys a new smart account for a given owner.
     * @param _owner The address of the owner for the new smart account.
     * @param _salt A unique salt to ensure a deterministic address for the new account.
     * @return The address of the newly created smart account.
     */
    function createAccount(address _owner, uint256 _salt) public returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(entryPoint, _owner)
        );
        bytes32 salt = bytes32(_salt);
        address newAccount;

        assembly {
            newAccount := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        require(newAccount != address(0), "Factory: account creation failed");

        emit AccountCreated(newAccount, _owner);
        return newAccount;
    }

    /**
     * @dev Calculates the deterministic address of a smart account before deployment.
     * @param _owner The address of the owner for the new smart account.
     * @param _salt A unique salt for the deployment.
     * @return The predicted address of the smart account.
     */
    function getAddress(address _owner, uint256 _salt) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(entryPoint, _owner)
        );
        bytes32 salt = bytes32(_salt);

        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        ));

        return address(uint160(uint256(hash)));
    }
}
