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
    .name('candy-manchine-cli')
    .description('cli tool for managing terra 2.0 candy manchine')
    .version('0.0.1')

program.parse()