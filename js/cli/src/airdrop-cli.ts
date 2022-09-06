import { program } from 'commander'
import { exportCsv, exportJson, loadCsv, loadJson } from './helpers/snapshot'
import { parseMasterConfig, readSoilData, createMasterConfigFromSnapshot, exportCsv as exportMasterConfigCsv } from './helpers/minter'
import { holderSnapshot, nftHolderSnapshot } from './command/snapshot'
import chalk from 'chalk'
import { NftOwner } from './interfaces/nft'

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

program.command('snapshot-onchain')
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

program.command('create-airdrop')
    .description('create new master file for new collection with 1:1 airdrop')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-s, --snapshot <string>', 'snapshot holder file')
    .requiredOption('-f, --format <string>', 'snapshot format file: csv/json')
    .option('-o, --output <string>', 'output file name')
    .action(async (directory, cmd) => {
        const {
            data,
            snapshot,
            format,
            output
        } = cmd.opts()
        // load snapshot file
        let owners: NftOwner[] = []
        if (format == 'csv') {
            owners = await loadCsv(snapshot)
        } else if (format == 'json') {
            owners = loadJson(snapshot)
        } else {
            console.log(chalk.red(`snapshot format file is not correct, it must be csv or json`))
        }
        // create instructions
        const instructions = createMasterConfigFromSnapshot(owners)
        // export to csv
        let outputFilename
        if (output) {
            outputFilename = output
        } else {
            outputFilename = `new_master`
        }
        const outputPath = exportMasterConfigCsv(instructions, data, outputFilename)
        console.log(`new master config file: ${outputPath}`)
    })
program.parse()