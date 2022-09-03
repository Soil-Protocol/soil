import { Instruction, NftTx } from '../interfaces/instruction'
import { Presets, SingleBar } from 'cli-progress'
import { upload } from '../helpers/ipfs'
import { SoilData } from '../interfaces/config'
import { bulkMint } from '../helpers/nft'
import { readNftTxData, saveNftTxData } from '../helpers/minter'
import { Whitelist } from '../interfaces/whitelist'
import { updateWhitelists } from '../helpers/candy'
import { NftOwner, snapshot } from '../helpers/snapshot'
import { queryAtHeight, instantiate, query } from '../helpers/terra'
import { delay } from '../helpers/util'

export const nftHolderSnapshot = async (
    soilData: SoilData,
    instructions: Instruction[],
    findOriginalOwner: boolean,
    network: string,
    height?: number
) => {
    const nftContract = soilData.addresses['collection']
    const tokenIds = instructions.map(inst => inst.tokenId)
    if (tokenIds.length <= 0) {
        return
    }
    let addressMemos: Record<string, string> = {}
    const addressKeys = Object.keys(soilData.addresses)
    addressKeys.map(key => {
        addressMemos[soilData.addresses[key]] = key
    })
    const bar = new SingleBar(null, Presets.shades_classic)
    bar.start(tokenIds.length, 0)
    const ids = [...tokenIds]
    let count = 0
    let owners: NftOwner[] = []
    try {
        while (ids.length > 0) {
            const tempIds = ids.splice(0, 30)
            const tempOwners = await snapshot(nftContract, tempIds, findOriginalOwner, network, addressMemos, height)
            count += tempOwners.length
            owners = [...owners, ...tempOwners]
            bar.update(count)
            await delay(2000) // delay to prevent rate limit
        }
        bar.stop()
    } catch (ex) {
        console.error(ex)
    } finally {
        return owners
    }
}


export const holderSnapshot = async (
    nftAddress: string,
    findOriginalOwner: boolean,
    network: string,
    height?: number
) => {
    // find tokenId
    console.log('find total token id...')
    const terra = instantiate(network)
    let tokenIdCount = 0
    if (height) {
        const response = await queryAtHeight(terra, nftAddress, {
            num_tokens: {}
        }, height)
        tokenIdCount = response.count
    } else {
        const response = await query(terra, nftAddress, {
            num_tokens: {}
        })
        tokenIdCount = response.count
    }
    if (tokenIdCount <= 0) {
        return
    }
    const bar = new SingleBar(null, Presets.shades_classic)
    bar.start(tokenIdCount, 0)
    let tokenIds: string[] = []
    let startAfter = undefined
    let needProcess = true
    let ids: any
    while (needProcess) {
        if (height) {
            ids = await queryAtHeight(terra, nftAddress, {
                all_tokens: {
                    limit: 30,
                    ...(!!startAfter && { start_after: startAfter }),
                }
            }, height)
        } else {
            ids = await query(terra, nftAddress, {
                all_tokens: {
                    limit: 30,
                    ...(!!startAfter && { start_after: startAfter }),
                }
            })
        }
        // check that nft is talis standard
        if (ids.tokens.length > 0 && ids.tokens[0].token_id) {
            ids.tokens = ids.tokens.map((x) => x.token_id)
        }
        tokenIds = [...tokenIds, ...ids.tokens]
        startAfter = ids.tokens[ids.tokens.length - 1]
        bar.update(tokenIds.length)
        if (ids.tokens.length < 30) {
            needProcess = false
            bar.stop()
        }
        await delay(1000)
    }

    console.log('finding owner of nft...')
    let addressMemos: Record<string, string> = {}
    ids = [...tokenIds]
    let count = 0
    let owners: NftOwner[] = []
    try {
        bar.start(tokenIds.length, 0)
        while (ids.length > 0) {
            const tempIds = ids.splice(0, 30)
            const tempOwners = await snapshot(nftAddress, tempIds, findOriginalOwner, network, addressMemos, height)
            count += tempOwners.length
            owners = [...owners, ...tempOwners]
            bar.update(count)
        }
        bar.stop()
    } catch (ex) {
        console.error(ex)
    } finally {
        return owners
    }
}