import { Instruction, NftTx } from '../interfaces/instruction'
import { Presets, SingleBar} from 'cli-progress'
import { SoilData } from '../interfaces/config'
import { bulkMint } from '../helpers/nft'

const UPLOAD_BATCH_SIZE = 100

export const mintNfts = async (
    data: SoilData,
    instructions: Instruction[],
    network: string,
    mnemonic: string
) => {
    if (instructions.length <= 0) {
        return
    }
    const bar = new SingleBar(null, Presets.shades_classic)
    bar.start(instructions.length, 0)

    const chunkedInstructions = [...instructions]
    let count = 0
    let nfts:NftTx[] = []
    try {
        while (chunkedInstructions.length > 0) {
            const tempInsturctions = chunkedInstructions.splice(0, UPLOAD_BATCH_SIZE)
            const tempNfts = await bulkMint(data, tempInsturctions, network, mnemonic)
            count += tempInsturctions.length
            nfts = [...nfts, ...tempNfts]
            bar.update(count)
        }
        bar.stop()
    } catch (ex) {
        console.error(ex)
    } finally {
        // save current tx
        return nfts
    }
}