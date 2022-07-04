

export const gas = {
  mainnet: {
    gasAdjustment: 1.6,
    defaultGasFee: 100000,
    methods: {
      mint: { gasLimit: 500000, gasFee: 200000 },
    },
  },
  testnet: {
    gasAdjustment: 1.6,
    defaultGasFee: 100000,
    methods: {
      mint: { gasLimit: 500000, gasFee: 200000 },
    },
  },
}
