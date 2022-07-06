const mainnet = {
  name: 'mainnet',
  chainID: 'phoenix-1',
  lcd: 'https://phoenix-lcd.terra.dev',
  fcd: 'https://phoenix-fcd.terra.dev',
}

const testnet = {
  name: 'testnet',
  chainID: 'pisco-1',
  lcd: 'https://pisco-lcd.terra.dev',
  fcd: 'https://pisco-fcd.terra.dev',
}

export const Networks = {
  mainnet,
  testnet
}

// WalletConnect separates chainId by number.
// Currently TerraStation Mobile uses 0 as Testnet, 1 as Mainnet.
export const walletConnectChainIds = {
  0: testnet,
  1: mainnet,
}
