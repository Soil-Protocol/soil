import { SoilData } from '../interfaces/config'
import { readSoilData } from './minter'
import { create_wallet, execute, init, instantiate, upload } from './terra'

const cw721_codeids = {
    'testnet': 1434,
    'mainnet': 0
}

export const createCollection = async(
    name: string,
    symbol: string,
    network: string,
    mnemonic: string,
    output: string = ''
) : Promise<SoilData> => {
    const terra = instantiate(network)
    const wallet = create_wallet(terra, mnemonic)
    let codeId
    if (network == 'localterra') {
        // need to upload wasm first
        codeId = await upload(terra, wallet, '../../rust/wasm/cw721_metadata_onchain.wasm')
    } else {
        codeId = cw721_codeids[network]
    }
    const initResponse = await init(terra, wallet, codeId, {
        name,
        symbol,
        minter: wallet.key.accAddress
    }, 'soil cw721-metadata')
    const config = readSoilData(output)
    config.network = network
    config.addresses['collection'] = initResponse.contract_addr
    config.addresses['minter'] = wallet.key.accAddress
    config.codeIds['collection'] = codeId
    config.updatedAt = new Date()
    return config
}