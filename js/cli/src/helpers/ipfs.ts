import { Instruction } from '../interfaces/instruction'
import fs from 'fs'
import { delay } from './util'
import path from 'path'
import FormData from 'form-data'
import axios from 'axios'

const PINATA_BASE_URL = 'https://api.pinata.cloud'

export const upload = async (
    instructions: Instruction[],
    uniqueImageFilenames: string[],
    imagePath: string,
    pinataApiKey: string,
    pinataSecretKey: string
) : Promise<Instruction[]> => {
    const url = `${PINATA_BASE_URL}/pinning/pinFileToIPFS`
    const filenameToUri: Record<string,string> = {}

    await Promise.all(uniqueImageFilenames.map(async (imageFilename) => {
        // Spread the requests out up to 1 second apart to avoid Too Many Requests error (Pinata's rate limit at 30 pins/minute)
        await delay(Math.round(Math.random() * 1000 * uniqueImageFilenames.length))

        let data = new FormData()
        const imageFile = path.join(imagePath, imageFilename)
        data.append('file', fs.createReadStream(imageFile))

        try {
            const response = await axios
                .post(url, data, {
                    maxBodyLength: Infinity, //this is needed to prevent axios from erroring out with large files
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
                        pinata_api_key: pinataApiKey,
                        pinata_secret_api_key: pinataSecretKey
                    }
                })
            filenameToUri[imageFilename] = `ipfs://${response.data.IpfsHash}`
        } catch (err) {
            console.error('File pinning failed.')
            console.error('  File:', imageFile)

            if (err.response) {
                console.error('  Status:', err.response.status)
                console.error('  Status text:', err.response.statusText)
                console.error('  Response:', err.response.data)
            } else {
                console.error('  Error:', err)
            }
            throw err
        }
    }))

    let updatedInstructions = []
    instructions.map(inst => {
        if (!filenameToUri[inst.imageFilename]) {
            return
        }
      
        updatedInstructions.push(
            { 
                ...inst, 
                imageUri: filenameToUri[inst.imageFilename] }
        )
    })

    return updatedInstructions
}