// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

contract MockEntryPoint is IEntryPoint {
    // Minimal stub to satisfy type; functions revert if called
    receive() external payable {}

    fallback() external payable {
        revert("MockEntryPoint: not implemented");
    }
}
