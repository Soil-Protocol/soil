import { SoilData } from '../interfaces/config'
import { Instruction, NftTx } from '../interfaces/instruction'
import { Collection, Nft, CollectionAttribute, CollectionAttributeTrait, NftStandard, RarityModel, NftRarity } from '../interfaces/nft'
import { readSoilData } from './minter'
import { batchExecute, create_wallet, execute, init, instantiate, query, queryAtHeight, upload } from './terra'
import path from 'path'
import fs from 'fs'
import { LCDClient } from '@terra-money/terra.js'
import { getSpecificMetadata, nftDataMapper } from './marketplace'
import { mintNfts } from '../command/mint'

const cw721_codeids = {
    'testnet': 1434,
    'mainnet': 193
}

export const createCollection = async (
    name: string,
    symbol: string,
    network: string,
    mnemonic: string,
    output: string = ''
): Promise<SoilData> => {
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

export const bulkMint = async (
    data: SoilData,
    instructions: Instruction[],
    network: string,
    mnemonic: string
): Promise<NftTx[]> => {
    const terra = instantiate(network)
    const wallet = create_wallet(terra, mnemonic)
    const candyAddress = data.addresses['collection']
    let nfts: NftTx[] = []
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
    instructions.forEach((inst, index) => {
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

export const parseNftFromMasterConfig = (
    nftAddress: string,
    instructions: Instruction[],
    name?: string,
    description?: string
): Collection => {
    const nfts: Nft[] = instructions.map(inst => {
        return {
            nftContract: nftAddress,
            tokenId: inst.tokenId,
            attributes: inst.attributes,
            image: inst.imageUri,
            name: inst.name,
            description: inst.description
        }
    })
    const collection: Collection = {
        nftContract: nftAddress,
        name: name,
        symbol: description,
        nfts
    }
    return collection
}

export const calculateTrait = (collection: Collection): Collection => {
    let calculatedCollection = collection
    let uniqueTraitType = new Set<string>()
    collection.nfts.forEach(nft => {
        nft.attributes.forEach(trait => {
            uniqueTraitType.add(trait.trait_type)
        })
    })

    const attributes: CollectionAttribute[] = []
    // for each trait_type -> find distinct trait value and append obj to collections Attribute
    for (const _key of uniqueTraitType) {
        const countDict: Record<string, number> = {}
        // init set of unique trait value
        const uniqueTraitValue = new Set<string>()
        uniqueTraitValue.add('[none]')

        // for each nft -> find the attribute that match with key -> add it to set
        collection.nfts.forEach((nft) => {
            if (nft) {
                const traitArr = nft.attributes.filter((trait) => {
                    return trait.trait_type == _key
                })
                const traitValue = traitArr[0]?.value ?? '[none]'
                uniqueTraitValue.add(traitValue)
                if (!countDict[traitValue]) {
                    countDict[traitValue] = 0
                }
                countDict[traitValue]++
            }
        })

        // construct object with {trait_type, values} and push it to collectionAttributes
        const traits: CollectionAttributeTrait[] = []
        const keys = Object.keys(countDict)
        keys.map(key => {
            traits.push({
                value: key,
                count: countDict[key],
                share: ((countDict[key] * 100) / collection.nfts.length)
            })
        })
        attributes.push({
            trait_type: _key,
            values: traits
        })
    }
    calculatedCollection.collectionAttributes = attributes
    return calculatedCollection
}

export const getNftInfos = async (
    nftAddress: string,
    tokenIds: string[],
    terra: LCDClient,
    height?: number,
    nftStandard: NftStandard = NftStandard.Cw721Standard
): Promise<Nft[]> => {
    let nfts: Nft[] = []
    await Promise.all(tokenIds.map(async (id) => {
        let nftInfo: any
        try {
            if (height) {
                nftInfo = await queryAtHeight(terra, nftAddress, {
                    nft_info: {
                        token_id: id.toString()
                    }
                }, height)
            } else {
                nftInfo = await query(terra, nftAddress, {
                    nft_info: {
                        token_id: id.toString()
                    }
                })
            }
            if (nftStandard == NftStandard.TalisStandard) {
                nftInfo = await getSpecificMetadata(nftAddress, id, nftStandard, nftInfo)
            }
            const nft = nftDataMapper[nftStandard](nftAddress, id, nftInfo)
            nfts.push(nft)
        } catch (err) {
            console.log(`error at token id:${id}`)
        }
    }))
    return nfts
}

export const sampleNftTokenId = async (
    nftAddress: string,
    terra: LCDClient
): Promise<string> => {
    const ids = await query(terra, nftAddress, {
        all_tokens: {
            limit: 1,
        }
    })
    return ids.tokens[0]
}

export const findNftStandard = async (
    nftAddress: string,
    tokenId: String,
    terra: LCDClient
): Promise<NftStandard> => {
    try {
        const response = await query(terra, nftAddress, {
            "nft_info": {
                "token_id": tokenId
            }
        })
        if (response.token_uri.includes('talis')) {
            return NftStandard.TalisStandard
        }
        return NftStandard.Cw721Standard
    } catch (err) {
        console.log(err)
        console.error('unknown nft standard')
    }
}

export const exportNftJson = (
    outputPath: string,
    collection: Collection,
    outputFilename?: string
): string => {
    let filename
    if (outputFilename) {
        filename = path.join(outputPath, outputFilename)
    } else {
        filename = path.join(outputPath, 'nfts.json')
    }
    fs.writeFileSync(filename, JSON.stringify(collection, null, 2), 'utf-8')
    return filename
}

export const loadNFtJson = (
    inputFile: string
): Collection => {
    const data = fs.readFileSync(inputFile, 'utf-8').toString()
    const collection = JSON.parse(data)
    return collection
}

export const QM_HASH_REGEX =
    /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/g

export const extractQmHash = (input: string): string => {
    const matches: RegExpMatchArray = input.match(QM_HASH_REGEX)
    return matches?.[0]
}