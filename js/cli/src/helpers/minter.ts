import { Instruction } from '../interfaces/instruction'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import parse from 'csv-parse'
import { AccAddress } from '@terra-money/terra.js'
import { Parser } from 'json2csv'

export const parseMasterConfig = async (
    configFile: string,
    imagePath: string,
    metadataPath: string = ''
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
  
        // Check image file is ipfs path otherwise file should exist
        if (!record.ipfs.startsWith('ipfs://') && !fs.existsSync(`${imagePath}/${record.image_filename}`)) {
          console.error(chalk.red(`Error: Image file not found nor an IPFS path: ${record.image_filename}`))
          process.exit(-1)
        }
  
        // Check metadata file exists
        if (metadataPath != '' && record.metadata_filename && !fs.existsSync(`${metadataPath}/${record.metadata_filename}`)) {
          console.error(chalk.red(`Error: Metadata file not found: ${record.metadata_filename}`))
          process.exit(-1)
        }
  
        // Check owner exists
        if (record.owner != 'candy' && !AccAddress.validate(record.owner)) {
            console.error(chalk.red(`Error: Owner address is invalid: ${record.owner}`))
            process.exit(-1)
        }
  
        instructions.push({
          tokenId: record.id,
          name: record.name,
          imageFilename: record.image_filename,
          metadataFilename: record.metadata_filename,
          owner: record.owner,
        } as Instruction)
      }
  
      return instructions
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