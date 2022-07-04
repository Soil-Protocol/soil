import { program } from 'commander'
import {Presets, SingleBar} from 'cli-progress'
import { delay } from './helpers/util'
import prompts from 'prompts'
import chalk from 'chalk'
import { exportCsv, parseMasterConfig, readSoilData, readWhitelistData, saveSoilData } from './helpers/minter'
import { uploadIpfs } from './command/upload'
import { createCollection } from './helpers/nft'
import { closeCandyMachine, createCandyMachine, extractSeed, info, openCandyMachine, setPublicRound, setRound, setSeed } from './helpers/candy'
import { setWhitelists } from './command/whitelist'

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

program.command('info')
    .description('get info on deployed candy machine')
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

program.command('set-round')
    .description('set round on candy machine')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .requiredOption('-r, --round <number>', 'round number')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
            round
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        const txhash = await setRound(soilData, round, network, MNEMONIC)
        console.log(`update round complete: ${txhash}`)
    })

program.command('set-public-round')
    .description('change candy machine to public round, which disable whitelist')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
            round
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        const txhash = await setPublicRound(soilData, network, MNEMONIC)
        console.log(`set public round complete: ${txhash}`)
    })

program.command('set-whitelist')
    .description('set whitelist on round')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-w, --whitelist <string>', 'whitelist file')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
            whitelist
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        let whitelists = await readWhitelistData(whitelist)
        try {
            await setWhitelists(soilData, whitelists, network, MNEMONIC)
            console.log('set whitelist complete')
        } catch (err) {
            console.error(err)
        }
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
        const txhash = await openCandyMachine(soilData, network, MNEMONIC)
        console.log(`open candy machine complete: ${txhash}`)
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
        const txhash = await closeCandyMachine(soilData, network, MNEMONIC)
        console.log(`close candy machine complete: ${txhash}`)
    })

program.parse()