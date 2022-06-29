import { SoilData } from '../interfaces/config'
import { Instruction } from '../interfaces/instruction'
import chalk from 'chalk'
import { create_wallet, execute, init, instantiate, upload } from './terra'
import { AccAddress } from '@terra-money/terra.js'

const candy_codeids = {
    'testnet': 0,
    'mainnet': 0
}

export const createCandyMachine = async(
    instructions: Instruction[],
    data: SoilData,
    network: string,
    mnemonic: string,
    creator: string,
    denom: string,
    amount: number,
    enableWhitelist: boolean = false
) : Promise<SoilData> => {
    const terra = instantiate(network)
    const wallet = create_wallet(terra, mnemonic)
    let codeId
    if (network == 'localterra') {
        // need to upload wasm first
        codeId = await upload(terra, wallet, '../../rust/wasm/soil_candy_machine.wasm')
    } else {
        codeId = candy_codeids[network]
    }
    // find parameter for initialize candy machine
    const collectionAddress = data.addresses['collection']
    if (!collectionAddress || !AccAddress.validate(collectionAddress)) {
        console.error(chalk.red(`Error: invalid collection address : ${collectionAddress}`))
        process.exit(-1)
    }
    const totalSupply = instructions.filter(inst => inst.owner == 'candy').length
    if (totalSupply == 0) {
        console.error(chalk.red(`Error: invalid total supply : 0`))
        process.exit(-1)
    }
    let creatorAddress = creator
    if (data.addresses[creator]) {
        creatorAddress = data.addresses[creator]
    }
    if (!AccAddress.validate(creatorAddress)) {
        console.error(chalk.red(`Error: invalid creator address : ${creatorAddress}`))
        process.exit(-1)
    }
    // initialize candy machine contract
    const initResponse = await init(terra, wallet, codeId, {
        token_addr: collectionAddress,
        creator: creatorAddress,
        mint_asset: {
            info: {
                native_token: {
                    denom
                }
            },
            amount: amount.toString()
        },
        protocol_fee: '0',
        enable_whitelist: enableWhitelist,
        collector: creatorAddress,
        total_supply: totalSupply.toString(),
        total_token_count: totalSupply.toString()
    }, 'soil candy-machine')
    // update data
    data.addresses['candy'] = initResponse.contract_addr
    data.codeIds['candy'] = codeId
    data.updatedAt = new Date()
    return data
}