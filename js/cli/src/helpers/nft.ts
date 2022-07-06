import { SoilData } from '../interfaces/config'
import { Instruction, NftTx } from '../interfaces/instruction'
import { readSoilData } from './minter'
import { batchExecute, create_wallet, execute, init, instantiate, upload } from './terra'

const cw721_codeids = {
    'testnet': 1434,
    'mainnet': 193
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

export const bulkMint = async(
    data: SoilData,
    instructions: Instruction[],
    network: string,
    mnemonic: string
): Promise<NftTx[]> => {
    const terra = instantiate(network)
    const wallet = create_wallet(terra, mnemonic)
    const candyAddress = data.addresses['collection']
    let nfts:NftTx[] = []
    let msgs = instructions.map(inst => {
        return {
            mint: {
                token_id: inst.tokenId,
                owner: inst.owner,
                token_uri: '',
                extension: {
                    image: inst.imageUri,
                    description: inst.description,
                    name: inst.name,
                    attributes: inst.attributes
                }
            }
        }
    })
    const response = await batchExecute(terra, wallet, candyAddress, msgs)
    instructions.forEach((inst,index) => {
        nfts.push({
            tokenId: inst.tokenId,
            txhash: response.txhash,
            height: response.height,
            msgIndex: index,
            timestamp: new Date(response.timestamp)
        })
    })
    return nfts
}