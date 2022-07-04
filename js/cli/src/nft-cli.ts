import { program } from 'commander'
import {Presets, SingleBar} from 'cli-progress'
import { delay } from './helpers/util'
import prompts from 'prompts'
import chalk from 'chalk'
import { exportCsv, parseMasterConfig, prepareMint, readNftTxData, readSoilData, saveNftTxData, saveSoilData, verifyMasterConfig } from './helpers/minter'
import { uploadIpfs } from './command/upload'
import { createCollection } from './helpers/nft'
import { mintNfts } from './command/mint'

require('dotenv').config()

const { PINATA_API_KEY, PINATA_SECRET_KEY, MNEMONIC } = process.env

program
    .name('nft-cli')
    .description('cli tool for managing terra 2.0 nft')
    .version('0.0.1')

program.command('upload')
    .description('upload image file to ipfs')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-i, --image <string>', 'image path')
    .requiredOption('-c, --config <string>', 'master config file')
    .option('-m, --metadata <string>', 'metadata path')
    .action(async (directory, cmd) => {
        const {
            data,
            image,
            config,
            metadata
        } = cmd.opts()
        // parse image
        const instructions = await parseMasterConfig(config)
        verifyMasterConfig(instructions, image, metadata)
        // upload
        const uploadedInstructions = await uploadIpfs(instructions, image, PINATA_API_KEY, PINATA_SECRET_KEY)
        // save to output path
        const outputFilename = exportCsv(uploadedInstructions, data)
        console.log(`Updated config file: ${outputFilename}`)
    })

program.command('create')
    .description('create collection')
    .requiredOption('-cn, --name <string>', 'collection name')
    .requiredOption('-cs, --symbol <string>', 'collection symbol')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .option('-d, --data <string>', 'data path')
    .action(async (directory, cmd) => {
        const {
            name,
            symbol,
            network,
            data
        } = cmd.opts()
        const config = await createCollection(name, symbol, network, MNEMONIC, data)
        console.log(`collection create: ${config.addresses['collection']}`)
        if (data) {
            const filename = saveSoilData(data, config)
            console.log(`Updated config file: ${filename}`)
        }
    })

program.command('mint')
    .description('mint nft')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-c, --config <string>', 'master config file')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .option('-m, --metadata <string>', 'metadata path')
    .action(async (directory, cmd) => {
        const {
            data,
            config,
            network,
            metadata
        } = cmd.opts()
        const soilData = readSoilData(data)
        let nfts = await readNftTxData(data)
        let instructions = await parseMasterConfig(config)
        instructions = prepareMint(instructions, soilData, metadata, nfts)
        if (instructions.length <= 0) {
            console.log('no new nft to mint, exiting ...')
            return
        }
        const mintedNfts = await mintNfts(soilData, instructions, network, MNEMONIC)
        nfts = [...nfts, ...mintedNfts]
        const filename = saveNftTxData(data, nfts)
        if (mintedNfts.length > 0) {
            console.log(`Mint success ${mintedNfts.length} nft`)
            console.log(`Updated minted nfts file: ${filename}`)
        }
    })

program.parse()