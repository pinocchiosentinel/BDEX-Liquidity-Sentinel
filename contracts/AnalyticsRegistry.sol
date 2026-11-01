// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AnalyticsRegistry
/// @notice Optional testnet registry/attestation anchor for public pool metadata.
/// @dev Does not custody assets, call DEX contracts, or assert that submitted
///      metrics are truthful. It only records a publisher-supplied content hash.
contract AnalyticsRegistry {
    error ZeroAddress();
    error NotPublisher();
    error NotOwner();
    error EmptyHash();
    error AlreadyPublished();

    address public owner;
    mapping(address => bool) public publishers;
    mapping(bytes32 => uint64) public publishedAt;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PublisherUpdated(address indexed publisher, bool enabled);
    event AttestationPublished(bytes32 indexed contentHash, address indexed publisher, uint64 timestamp);

    constructor() {
        owner = msg.sender;
        publishers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PublisherUpdated(msg.sender, true);
    }

    function setPublisher(address publisher, bool enabled) external {
        if (msg.sender != owner) revert NotOwner();
        if (publisher == address(0)) revert ZeroAddress();
        publishers[publisher] = enabled;
        emit PublisherUpdated(publisher, enabled);
    }

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    function publish(bytes32 contentHash) external {
        if (!publishers[msg.sender]) revert NotPublisher();
        if (contentHash == bytes32(0)) revert EmptyHash();
        if (publishedAt[contentHash] != 0) revert AlreadyPublished();
        uint64 timestamp = uint64(block.timestamp);
        publishedAt[contentHash] = timestamp;
        emit AttestationPublished(contentHash, msg.sender, timestamp);
    }
}