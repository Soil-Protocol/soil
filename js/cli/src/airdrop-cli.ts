import { program } from 'commander'
import path from 'path'
import fs from 'fs'
import { exportCsv, exportJson } from './helpers/snapshot'
import { parseMasterConfig, readSoilData } from './helpers/minter'
import { createCollection } from './helpers/nft'
import { mintNfts } from './command/mint'
import { holderSnapshot, nftHolderSnapshot } from './command/snapshot'

require('dotenv').config()

program
    .name('airdrop-cli')
    .description('cli tool for snapshot and airdrop in terra 2.0 nft')
    .version('0.0.1')

program.command('snapshot')
    .description('snapshot nft holder')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .requiredOption('-c, --config <string>', 'master config file')
    .requiredOption('-f, --format <string>', 'format of result file: csv/json')
    .option('-h, --height <number>', 'block height')
    .option('-ori, --original <boolean>', 'find original owner')

    .action(async (directory, cmd) => {
        const {
            data,
            config,
            network,
            height,
            original,
            format
        } = cmd.opts()
        const soilData = readSoilData(data)
        let instructions = await parseMasterConfig(config)
        // find token holder
        const findOriginalOwner = original === 'true' ? true : false
        let blockHeight = null
        if (height) {
            blockHeight = Number(height)
        }
        const nftAddress = soilData.addresses['collection']
        const owners = await nftHolderSnapshot(
            soilData,
            instructions,
            findOriginalOwner,
            network,
            blockHeight
        )
        // construct output file
        let outputFilename
        if (format == 'csv') {
            outputFilename = exportCsv(owners, nftAddress, height, data)
        } else {
            outputFilename = exportJson(owners, nftAddress, height, data)
        }
        console.log(`holder output file: ${outputFilename}`)
    })

program.command('nft-snapshot')
    .description('snapshot nft holder from contract address')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-c, --contract <string>', 'nft contract address')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .requiredOption('-f, --format <string>', 'format of result file: csv/json')
    .option('-h, --height <number>', 'block height')
    .option('-ori, --original <boolean>', 'find original owner')

    .action(async (directory, cmd) => {
        const {
            data,
            contract,
            network,
            height,
            original,
            format
        } = cmd.opts()
        // find token holder
        const findOriginalOwner = original === 'true' ? true : false
        let blockHeight = null
        if (height) {
            blockHeight = Number(height)
        }
        const owners = await holderSnapshot(
            contract,
            findOriginalOwner,
            network,
            blockHeight
        )
        // construct output file
        let outputFilename
        if (format == 'csv') {
            outputFilename = exportCsv(owners, contract, height, data)
        } else {
            outputFilename = exportJson(owners, contract, height, data)
        }
        console.log(`holder output file: ${outputFilename}`)
    })

program.parse()