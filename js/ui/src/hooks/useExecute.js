import { MsgExecuteContract, StdFee } from '@terra-money/terra.js'
import { useConnectedWallet, useWallet } from '@terra-money/wallet-provider'
import { addresses } from './constants/address'
import { useCallback } from 'react'
import axios from 'axios'
import { Networks } from './constants/network'
import { useQueryService } from "../hooks/useQuery";

export const useExecuteService = () => {
  const { network } = useWallet()
  const connectedWallet = useConnectedWallet()
  const { queryCandyRemaining } = useQueryService()

  const getGasPrice = useCallback(async (denom) => {
    const response = await axios.get(`${Networks[network.name].fcd}/v1/txs/gas_prices`)
    return parseFloat(response.data[denom])
  }, [network.name])


  const mint = useCallback(async () => {
    if (!connectedWallet) return
    const networkName = network.name
    const candyMachineAddr = addresses[networkName].candyMachine

    const candy = await queryCandyRemaining()
    // now, support only native token
    const denom = candy.mint_asset.info.native_token.denom
    const amount = candy.mint_asset.amount
    const response = await connectedWallet.post({
      msgs: [
        new MsgExecuteContract(
          connectedWallet.walletAddress,
          candyMachineAddr,
          {
            mint: {},
          },
          `${amount}${denom}`,
        ),
      ],
    })

    return response
  }, [connectedWallet, getGasPrice, network.name])

  return {
    mint
  }
}
