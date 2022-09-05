import { Instruction } from '../interfaces/instruction'
import { Presets, SingleBar } from 'cli-progress'
import { SoilData } from '../interfaces/config'
import { snapshot } from '../helpers/snapshot'
import { queryAtHeight, instantiate, query } from '../helpers/terra'
import { delay } from '../helpers/util'
import { NftOwner } from '../interfaces/nft'
import { LCDClient } from '@terra-money/terra.js'

export const getNftTokenIds = async (
    nftAddress: string,
    terra: LCDClient,
    height?: number
): Promise<string[]> => {
    // find tokenId
    console.log('find total token id...')
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
    return tokenIds
}