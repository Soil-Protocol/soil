import { Instruction, NftTx } from '../interfaces/instruction'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import parse from 'csv-parse'
import { AccAddress } from '@terra-money/terra.js'
import { Parser } from 'json2csv'
import { SoilData } from '../interfaces/config'
import { mintNfts } from '../command/mint'

export const parseMasterConfig = async (
    configFile: string
) : Promise<Instruction[]> => {
    const instructions = []

    const parser = fs
      .createReadStream(configFile)
      .pipe(parse({
        columns: true
      }))

      const tokenSet = new Set<string>()
      for await (const record of parser) {
  
        if (record.metadata_filename == '') {
          record.metadata_filename = null
        }
  
        // Check token id
        if (!record.id) {
            console.error(chalk.red(`Error: NFT Token Id not found: ${record.id}`))
            process.exit(-1)
        }

        // Check duplicate id
        if (tokenSet.has(record.id)) {
            console.error(chalk.red(`Error: duplicate NFT Token Id: ${record.id}`))
            process.exit(-1)
        }
        tokenSet.add(record.id)

        // Check name exists
        if (!record.name) {
          console.error(chalk.red(`Error: NFT Name not found: ${record.id}`))
          process.exit(-1)
        }
  
        instructions.push({
          tokenId: record.id,
          name: record.name,
          imageFilename: record.image_filename,
          metadataFilename: record.metadata_filename,
          owner: record.owner,
          imageUri: record.ipfs
        } as Instruction)
      }
  
      return instructions
}

export const verifyMasterConfig = (
    instructions: Instruction[],
    imagePath: string,
    metadataPath: string = ''
) => {
    instructions.forEach( (inst, index) => {
        // Check image file is ipfs path otherwise file should exist
        if (inst.imageUri && !inst.imageUri.startsWith('ipfs://') && !fs.existsSync(`${path.join(imagePath, inst.imageFilename)}`)) {
          console.error(chalk.red(`Error: Image file not found nor an IPFS path at index: ${index} , tokenId: ${inst.tokenId}`))
          process.exit(-1)
        }
  
        // Check metadata file exists
        if (metadataPath != '' && inst.metadataFilename && !fs.existsSync(`${path.join(metadataPath, inst.metadataFilename)}`)) {
          console.error(chalk.red(`Error: Metadata file not found at index: ${index} , tokenId: ${inst.tokenId}`))
          process.exit(-1)
        }
    })
}

export const prepareMint = (
    instructions: Instruction[],
    data: SoilData,
    metadataPath: string = '',
    nfts: NftTx[]
) : Instruction[] => {
    // filter minted instruction
    let mintedNftSet = new Set<string>()
    nfts.forEach(n => mintedNftSet.add(n.tokenId))
    let tempInsturctions = instructions.filter(inst => !mintedNftSet.has(inst.tokenId))
    //
    let mintInstructions = []
    tempInsturctions.forEach( (inst, index) => {
        // Check image file is ipfs path
        if (!inst.imageUri) {
          console.error(chalk.red(`Error: Image file not found nor an IPFS path at index: ${index} , tokenId: ${inst.tokenId}`))
          process.exit(-1)
        }
        // Check image file is ipfs path otherwise file should exist
        if (!inst.imageUri.startsWith('ipfs://')) {
          console.error(chalk.red(`Error: Image file not found nor an IPFS path at index: ${index} , tokenId: ${inst.tokenId}`))
          process.exit(-1)
        }
  
        // Check metadata file exists
        if (metadataPath != '' && inst.metadataFilename && !fs.existsSync(`${path.join(metadataPath, inst.metadataFilename)}`)) {
          console.error(chalk.red(`Error: Metadata file not found at index: ${index} , tokenId: ${inst.tokenId}`))
          process.exit(-1)
        }

        const mintInstruction = inst
        // load metadata to instruction
        if (metadataPath != '') {
            const metadatas = JSON.parse(fs.readFileSync(path.join(metadataPath, inst.metadataFilename), 'utf-8').toString())
            mintInstruction.description = metadatas.description || ''
            mintInstruction.attributes = metadatas.attributes || []
        }
        
        // load address
        let owner
        if (data.addresses[inst.owner]) {
            owner = data.addresses[inst.owner]
        } else {
            owner = inst.owner
        }
        if (!AccAddress.validate(owner)) {
            console.error(chalk.red(`Error: Owner address is invalid: ${owner}`))
            process.exit(-1)
        }
        mintInstruction.owner = owner
        mintInstructions.push(mintInstruction)
    })
    return mintInstructions
}

export const exportCsv = (
    instructions: Instruction[],
    outputPath: string
) : string => {
    const fields = [
        {
            label: 'id',
            value: 'tokenId'
        },
        {
            value: 'name'
        },
        {
            label: 'image_filename',
            value: 'imageFilename'
        },
        {
            label: 'metadata_filename',
            value: 'metadataFilename'
        },
        {
            label: 'ipfs',
            value: 'imageUri'
        },
        {
            value: 'owner'
        }
    ]
    const parser = new Parser({
        fields,
        quote: ''
    })
    const configCsv = parser.parse(instructions)
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
    }
    const outputFilename = path.join(outputPath, 'master.csv')
    fs.writeFileSync(outputFilename, configCsv)
    return outputFilename
}

export const readSoilData = (
    outputPath: string
) : SoilData => {
    const configFilename = path.join(outputPath, 'data.json')
    if (!outputPath || !fs.existsSync(configFilename)) {
        return {
            addresses: {},
            network: 'localterra',
            codeIds: {},
            createdAt: new Date(),
            updatedAt: new Date()
        }
    }
    const config = JSON.parse(fs.readFileSync(configFilename, 'utf-8').toString())
    return config
}

export const saveSoilData = (
    outputPath: string,
    config: SoilData
) : string => {
    const filename = path.join(outputPath, 'data.json')
    fs.writeFileSync(filename, JSON.stringify(config, null, 2), 'utf-8')
    return filename
}

export const readNftTxData = async (
    outputPath: string
): Promise<NftTx[]> => {
    let nfts = []
    const nftTxFilename = path.join(outputPath, 'nft_tx.csv')
    if (!outputPath || !fs.existsSync(nftTxFilename)) {
        return []
    }

    const parser = fs
      .createReadStream(nftTxFilename)
      .pipe(parse({
        columns: true
      }))

    for await (const record of parser) {
        nfts.push({
            ...record
          } as NftTx)
    }
    return nfts
}

export const saveNftTxData = (
    outputPath: string,
    nfts: NftTx[]
): string => {
    if (nfts.length <= 0) {
        return
    }
    const filename = path.join(outputPath, 'nft_tx.csv')
    const fields = Object.keys(nfts[0])
    const parser = new Parser({
        fields,
        quote: ''
    })
    const nftTxCsv = parser.parse(nfts)
    fs.writeFileSync(filename, nftTxCsv, 'utf-8')
    return filename
}