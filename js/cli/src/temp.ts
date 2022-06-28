import { program } from 'commander'
import {Presets, SingleBar} from 'cli-progress'
import { delay } from './helpers/util'
import prompts from 'prompts'
import chalk from 'chalk'

program
    .name('test program')
    .description('hello world')
    .version('0.0.1')

program.command('upload')
    .description('mint an nft')
    .argument('<contractAddress>', 'contract address')
    .action(async (contractAddress) => {
        console.log(contractAddress)
        const response = await prompts({
            type: 'confirm',
            name: 'confirm',
            message: 'do it now',
            initial: false
        })
        if (!response.confirm) {
            return console.error(chalk.red('denied by user'))
        }
        const bar = new SingleBar(null, Presets.shades_classic)
        bar.start(100,20)
        await delay(1000)
        bar.update(50)
        await delay(1000)
        bar.update(100)
        bar.stop()
        console.log('ok')
    })

program.parse()
