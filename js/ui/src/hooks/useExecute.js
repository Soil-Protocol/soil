import { MsgExecuteContract, StdFee } from '@terra-money/terra.js'
import { useConnectedWallet, useWallet } from '@terra-money/wallet-provider'
import { addresses } from './constants/address'
import { useCallback } from 'react'
import axios from 'axios'
import { Networks } from './constants/network'

export const useExecuteService = () => {
  const { network } = useWallet()
  const connectedWallet = useConnectedWallet()

  const getGasPrice = useCallback(async (denom) => {
    const response = await axios.get(`${Networks[network.name].fcd}/v1/txs/gas_prices`)
    return parseFloat(response.data[denom])
  }, [network.name])


  const mint = useCallback(async () => {
    if (!connectedWallet) return
    const networkName = network.name
    let gasLimit = 500000
    // const { gasLimit, gasFee } = gas[networkName].methods.candyMachine
    const candyMachineAddr = addresses[networkName].candyMachine

    const response = await connectedWallet.post({
      msgs: [
        new MsgExecuteContract(
          connectedWallet.walletAddress,
          candyMachineAddr,
          {
            mint: {},
          },
          '1000000uusd',
        ),
      ],
    })

    return response
  }, [connectedWallet, getGasPrice, network.name])

  return {
    mint
  }
}
