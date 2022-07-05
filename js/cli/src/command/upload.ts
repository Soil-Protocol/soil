import { Instruction } from '../interfaces/instruction'
import { Presets, SingleBar} from 'cli-progress'
import { upload } from '../helpers/ipfs'

const UPLOAD_BATCH_SIZE = 30

export const uploadIpfs = async (
    instructions: Instruction[],
    imagePath: string,
    pinataApiKey: string,
    pinataSecretKey: string
) : Promise<Instruction[]> => {
    const bar = new SingleBar(null, Presets.shades_classic)
    bar.start(instructions.length, 0)

    const uniqueImageFilenames = [...new Set(instructions.filter(inst => !inst.imageUri).map(inst => inst.imageFilename))]
    let chunkedImageFilenames = [...uniqueImageFilenames]
    let updatedInstructions = []
    while (chunkedImageFilenames.length > 0) {
        let tempImageFilenames = chunkedImageFilenames.splice(0, UPLOAD_BATCH_SIZE)
        const tempInsturctions = await upload(instructions, tempImageFilenames, imagePath, pinataApiKey, pinataSecretKey)
        updatedInstructions = [...updatedInstructions, ...tempInsturctions]
        bar.update(updatedInstructions.length)
    }
    bar.stop()

    return updatedInstructions
}