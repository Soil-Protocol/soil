import { program } from 'commander'
import {Presets, SingleBar} from 'cli-progress'
import { delay } from './helpers/util'
import prompts from 'prompts'
import chalk from 'chalk'
import { exportCsv, parseMasterConfig, readSoilConfig, saveSoilConfig } from './helpers/minter'
import { uploadIpfs } from './command/upload'
import { createCollection } from './helpers/nft'

require('dotenv').config()

const { PINATA_API_KEY, PINATA_SECRET_KEY, MNEMONIC } = process.env

program
    .name('nft-cli')
    .description('cli tool for managing terra 2.0 nft')
    .version('0.0.1')

program.command('upload')
    .description('upload image file to ipfs')
    .requiredOption('-o, --output <string>', 'output path')
    .requiredOption('-i, --image <string>', 'image path')
    .requiredOption('-c, --config <string>', 'master config file')
    .option('-m, --metadata <string>', 'metadata path')
    .action(async (directory, cmd) => {
        const {
            output,
            image,
            config,
            metadata
        } = cmd.opts()
        // parse image
        const instructions = await parseMasterConfig(config, image, metadata)
        // upload
        const uploadedInstructions = await uploadIpfs(instructions, image, PINATA_API_KEY, PINATA_SECRET_KEY)
        // save to output path
        const outputFilename = exportCsv(uploadedInstructions, output)
        console.log(`Updated config file: ${outputFilename}`)
    })

program.command('create')
    .description('create collection')
    .requiredOption('-cn, --name <string>', 'collection name')
    .requiredOption('-cs, --symbol <string>', 'collection symbol')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .option('-o, --output <string>', 'output path')
    .action(async (directory, cmd) => {
        const {
            name,
            symbol,
            network,
            output
        } = cmd.opts()
        const config = await createCollection(name, symbol, network, MNEMONIC, output)
        console.log(`collection create: ${config.addresses['collection']}`)
        if (output) {
            const filename = saveSoilConfig(output, config)
            console.log(`Updated config file: ${filename}`)
        }
    })

program.parse()