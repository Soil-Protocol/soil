import { Instruction } from '../interfaces/instruction'
import { Presets, SingleBar } from 'cli-progress'
import { SoilData } from '../interfaces/config'
import { snapshot } from '../helpers/snapshot'
import { queryAtHeight, instantiate, query } from '../helpers/terra'
import { delay } from '../helpers/util'
import { NftOwner } from '../interfaces/nft'
import { getNftTokenIds } from './nft'

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
        bar.stop()
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
    const bar = new SingleBar(null, Presets.shades_classic)
    const terra = instantiate(network)
    const tokenIds = await getNftTokenIds(nftAddress, terra, height)

    console.log('finding owner of nft...')
    let addressMemos: Record<string, string> = {}
    let ids: string[] = [...tokenIds]
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
            await delay(2000)
        }
        bar.stop()
    } catch (ex) {
        console.error(ex)
        bar.stop()
    } finally {
        return owners
    }
}