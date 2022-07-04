import { Instruction, NftTx } from '../interfaces/instruction'
import { Presets, SingleBar} from 'cli-progress'
import { upload } from '../helpers/ipfs'
import { SoilData } from '../interfaces/config'
import { bulkMint } from '../helpers/nft'
import { readNftTxData, saveNftTxData } from '../helpers/minter'
import { Whitelist } from '../interfaces/whitelist'
import { updateWhitelists } from '../helpers/candy'

const UPLOAD_BATCH_SIZE = 100

export const setWhitelists = async (
    data: SoilData,
    whitelists: Whitelist[],
    network: string,
    mnemonic: string
) => {
    if (whitelists.length <= 0) {
        return
    }
    const bar = new SingleBar(null, Presets.shades_classic)
    bar.start(whitelists.length, 0)

    const chunkedWhitelists = [...whitelists]
    let count = 0
    try {
        while (chunkedWhitelists.length > 0) {
            const tempWhitelists = chunkedWhitelists.splice(0, UPLOAD_BATCH_SIZE)
            await updateWhitelists(data, tempWhitelists, network, mnemonic)
            count += tempWhitelists.length
            bar.update(count)
        }
        bar.stop()
    } catch (err) {
        bar.stop()
        throw err
    }
}