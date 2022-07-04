import { program } from 'commander'
import {Presets, SingleBar} from 'cli-progress'
import { delay } from './helpers/util'
import prompts from 'prompts'
import chalk from 'chalk'
import { exportCsv, parseMasterConfig, readSoilData, readWhitelistData, saveSoilData } from './helpers/minter'
import { uploadIpfs } from './command/upload'
import { createCollection } from './helpers/nft'
import { checkEligible, closeCandyMachine, createCandyMachine, extractSeed, info, openCandyMachine, queryWhitelist, setPublicRound, setRound, setSeed } from './helpers/candy'
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
        const config = await info(soilData, network)
        console.log(`network: ${chalk.green(network)}`)
        console.log(`candy machine address: ${chalk.green(soilData.addresses['candy'])}`)
        console.log(`owner: ${chalk.green(config.owner)}`)
        console.log(`nft address: ${chalk.green(config.token_addr)}`)
        const amount = Number(config.mint_asset.amount)
        if (config.mint_asset.info.native_token) {
            const denom = config.mint_asset.info.native_token.denom
            console.log(`mint price: ${chalk.green(amount)} ${chalk.green(denom)}`)
        } else {
            console.log(`mint token address: ${config.mint_asset.info.token.contract_addr}`)
            console.log(`mint price: ${chalk.green(amount)}`)
        }
        console.log(`minting fee receiver wallet: ${chalk.green(config.creator)}`)
        console.log(`whitelist enable: ${chalk.yellow(config.enable_whitelist)}`)
        if (!config.enable_whitelist) {
            console.log(`current round: ${chalk.green('public')}`)
        } else {
            console.log(`current round: ${chalk.green(config.round)}`)
        }
        if (config.is_open) {
            console.log(`status: ${chalk.green('open')}`)
        } else {
            console.log(`status: ${chalk.red('close')}`)
        }
        const mintedAmount = Number(config.total_supply) - Number(config.total_token_count)
        console.log(`total minted: ${chalk.yellow(mintedAmount)} / ${chalk.yellow(config.total_supply)}`)
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

program.command('open-public-round')
    .description('change candy machine to public round, which disable whitelist')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        const txhash = await setPublicRound(soilData, true, network, MNEMONIC)
        console.log(`open public round complete: ${txhash}`)
    })

program.command('close-public-round')
    .description('change candy machine to public round, which disable whitelist')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        const txhash = await setPublicRound(soilData, false, network, MNEMONIC)
        console.log(`close public round complete: ${txhash}`)
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

program.command('get-whitelist')
    .description('set whitelist on round')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-a, --address <string>', 'address for checking whitelist')
    .requiredOption('-r, --round <number>', 'round number')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
            address,
            round
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        let response = await queryWhitelist(soilData, address, round, network)
        console.log(`address: ${chalk.green(address)}`)
        console.log(`round: ${chalk.yellow(round)}`)
        if (response) {
            console.log(`total: ${chalk.yellow(response.count)}`)
        } else {
            console.log(`total: ${chalk.yellow(0)}`)
        }
    })

program.command('eligible')
    .description('check the eligible for address to mint')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-a, --address <string>', 'address for checking whitelist')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .action(async (directory, cmd) => {
        const {
            data,
            network,
            address,
            round
        } = cmd.opts()
        // read config file and nft address to initialize contract
        let soilData = readSoilData(data)
        let response = await checkEligible(soilData, address, network)
        console.log(`address: ${chalk.green(address)}`)
        if (response) {
            console.log(`total: ${chalk.yellow(response.count)}`)
        } else {
            console.log(`total: ${chalk.yellow(0)}`)
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