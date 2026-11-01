# Optional analytics registry

`AnalyticsRegistry.sol` is a minimal, optional on-chain timestamp anchor for a content hash. The read-only analytics product does not require this contract to function. It stores **no metrics** and does not validate claims; users must retrieve content elsewhere and independently evaluate the publisher and data. It has no token, fee, custody, approvals, or arbitrary call functionality.

The owner initially is the deployer and is initially an enabled publisher. The owner may enable/disable publisher addresses and transfer ownership. Publishing is irreversible and duplicate content hashes revert. Keep private data out of content represented by public hashes (hashing reduces disclosure but does not guarantee secrecy for low-entropy inputs).

Compile and test with Solidity 0.8.24. Deployment must be on chain ID 968 only. Deployment tooling must require an explicit `BOT_TESTNET_PRIVATE_KEY`; never commit it or pass it in command-line arguments. This source has **not** been compiled or deployed in this environment yet because no Solidity compiler or deployer key is available here.