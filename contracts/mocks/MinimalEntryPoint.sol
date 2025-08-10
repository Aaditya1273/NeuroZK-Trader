// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// A deployable dummy EntryPoint stand-in for tests. It does not implement the
// IEntryPoint interface; it's only used as an address passed to contracts that
// expect an EntryPoint address but do not invoke its methods during tests.
contract MinimalEntryPoint {
    receive() external payable {}
    fallback() external payable {}
}
