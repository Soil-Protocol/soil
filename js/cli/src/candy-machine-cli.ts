import { program } from 'commander'
import {Presets, SingleBar} from 'cli-progress'
import { delay } from './helpers/util'
import prompts from 'prompts'
import chalk from 'chalk'
import { exportCsv, parseMasterConfig, readSoilData, saveSoilData } from './helpers/minter'
import { uploadIpfs } from './command/upload'
import { createCollection } from './helpers/nft'
import { createCandyMachine, extractSeed, setSeed } from './helpers/candy'

require('dotenv').config()

const { PINATA_API_KEY, PINATA_SECRET_KEY, MNEMONIC } = process.env

program
    .name('candy-manchine-cli')
    .description('cli tool for managing terra 2.0 candy manchine')
    .version('0.0.1')

program.command('create')
    .description('create candy manchine contract')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-c, --config <string>', 'master config file')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .requiredOption('--denom <string>', 'denom')
    .requiredOption('--amount <number>', 'amount')
    .requiredOption('--creator <string>', 'creator address')
    .option('--whitelist', 'enable whitelist')
    .action(async (directory, cmd) => {
        const {
            data,
            config,
            network,
            denom,
            amount,
            creator,
            whitelist
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        const instructions = await parseMasterConfig(config)
        soilData = await createCandyMachine(
            instructions,
            soilData,
            network,
            MNEMONIC,
            creator,
            denom,
            amount,
            whitelist)
        console.log(`candy machine create: ${soilData.addresses['candy']}`)
        // update seed
        const seeds = extractSeed(instructions)
        const txhash = await setSeed(soilData, seeds, network, MNEMONIC)
        console.log(`update seed complete at txhash: ${txhash}`)
        // save config to file (update candy contract)
        const filename = saveSoilData(data, soilData)
        console.log(`Updated config file: ${filename}`)
    })

program.command('open')
    .description('create candy manchine contract')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
    })

program.command('close')
    .description('create candy manchine contract')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
    })

program.parse()