// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

abstract contract MockEntryPoint is IEntryPoint {
    // Minimal stub to satisfy type; functions revert if called
    receive() external payable {}

    fallback() external payable {
        revert("MockEntryPoint: not implemented");
    }
}
