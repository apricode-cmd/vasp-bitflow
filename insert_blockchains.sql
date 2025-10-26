-- Insert popular blockchain networks
INSERT INTO "BlockchainNetwork" (id, code, name, "nativeToken", "nativeAsset", "explorerUrl", "rpcUrl", "chainId", "minConfirmations", confirmations, "isActive", priority, metadata, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'BITCOIN', 'Bitcoin', 'BTC', 'BTC', 'https://blockstream.info', NULL, NULL, 6, 6, true, 0, '{}', NOW(), NOW()),
  (gen_random_uuid(), 'ETHEREUM', 'Ethereum', 'ETH', 'ETH', 'https://etherscan.io', 'https://mainnet.infura.io', 1, 12, 12, true, 1, '{}', NOW(), NOW()),
  (gen_random_uuid(), 'BSC', 'Binance Smart Chain', 'BNB', 'BNB', 'https://bscscan.com', 'https://bsc-dataseed.binance.org', 56, 15, 15, true, 2, '{}', NOW(), NOW()),
  (gen_random_uuid(), 'POLYGON', 'Polygon', 'MATIC', 'MATIC', 'https://polygonscan.com', 'https://polygon-rpc.com', 137, 128, 128, true, 3, '{}', NOW(), NOW()),
  (gen_random_uuid(), 'TRON', 'Tron', 'TRX', 'TRX', 'https://tronscan.org', 'https://api.trongrid.io', NULL, 19, 19, true, 4, '{}', NOW(), NOW()),
  (gen_random_uuid(), 'SOLANA', 'Solana', 'SOL', 'SOL', 'https://explorer.solana.com', 'https://api.mainnet-beta.solana.com', NULL, 32, 32, true, 5, '{}', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
