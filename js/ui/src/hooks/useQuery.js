import { LCDClient } from '@terra-money/terra.js'
import { useConnectedWallet, useWallet } from '@terra-money/wallet-provider'
import { addresses } from './constants/address'
import { useCallback, useMemo, useState, useEffect } from 'react'


export const useQueryService = () => {
  const { network } = useWallet()

  const lcdClient = useMemo(
    () =>
      new LCDClient({
        URL: network.lcd,
        chainID: network.chainID,
        isClassic: false,
      }),
    [network],
  )

  const queryCandyRemaining = useCallback(async () => {
    const networkName = network.name
    const candyAddress = addresses[networkName].candyMachine
    const response = await lcdClient.wasm.contractQuery(candyAddress, {
      config: {},
    })
    return response
  }, [lcdClient.wasm, network.name])


  const queryNFT = useCallback(
    async (nft, tokenId) => {
      const response = await lcdClient.wasm.contractQuery(nft, {
        nft_info: {
          token_id: tokenId,
        },
      })
      return response
    },
    [lcdClient.wasm],
  )


  const queryNFTByIds = useCallback(
    async (nft, tokenIds) =>
      Promise.all(tokenIds.map(async (tokenId) => queryNFT(nft, tokenId))),
    [queryNFT],
  )

  const queryNftTokenIdsByAddress = useCallback(
    async (owner, nft) => {
      let tokenIds = []
      let startAfter;
      const { tokens } = await lcdClient.wasm.contractQuery(nft, {
        tokens: {
          owner,
          limit: 30,
          ...(!!startAfter && { start_after: startAfter }),
        },
      })
      tokenIds = [...tokenIds, ...tokens]
      startAfter = tokenIds[tokenIds.length - 1]
      return tokenIds
    },
    [lcdClient.wasm],
  )


  const useQueryMyNFT = (nftAddress, newNftAddress) => {
    const connectedWallet = useConnectedWallet()
    const [nfts, setNFTs] = useState([])
    const { queryNftTokenIdsByAddress } = useQueryService()

    const newNft = useMemo(() => newNftAddress, [newNftAddress])

    useEffect(() => {
      if (!connectedWallet?.walletAddress) return
      async function fetch() {
        // TODO

        const newAllTokenIds = await queryNftTokenIdsByAddress(connectedWallet.walletAddress, newNft)
        let newNFTs = await queryNFTByIds(newNft, newAllTokenIds)
        setNFTs([...newNFTs])
      }
      fetch()
    }, [connectedWallet, queryNftTokenIdsByAddress, newNft])

    return nfts
  }



  return {
    lcdClient,
    queryCandyRemaining,
    queryNftTokenIdsByAddress,
    queryNFT,
    useQueryMyNFT,
  }
}
