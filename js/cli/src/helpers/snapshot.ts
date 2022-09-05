import { instantiate, queryAtHeight, query, chainIDMap } from './terra'
import { LCDClient } from '@terra-money/terra.js'
import { MarketplaceAddressMap, queryMarketplaceSeller } from './marketplace'
import fs from 'fs'
import path from 'path'
import parse from 'csv-parse'
import { Parser } from 'json2csv'
import chalk from 'chalk'
import { NftOwner } from '../interfaces/nft'

export const snapshot = async (
    nftAddress: string,
    tokenIds: string[],
    findOriginalOwner: boolean,
    network: string,
    addressMemos: Record<string, string>,
    height?: number
) => {
    // snapshot holder with 
    const terra = instantiate(network)
    let owners: NftOwner[] = []
    await Promise.all(tokenIds.map(async (id) => {
        let response: any
        if (height) {
            response = await queryAtHeight(terra, nftAddress, {
                owner_of: {
                    token_id: id
                }
            }, height)
        } else {
            response = await query(terra, nftAddress, {
                owner_of: {
                    token_id: id
                }
            })
        }
        const originalOwner = response.owner
        owners.push(await findMarketplaceSeller(nftAddress, id, terra, findOriginalOwner, originalOwner, addressMemos, height))
    }))
    return owners
}

export const findMarketplaceSeller = async (
    nftAddress: string,
    tokenId: string,
    terra: LCDClient,
    findOriginalOwner: boolean,
    originalOwner: string,
    addressMemos: Record<string, string>,
    height?: number
): Promise<NftOwner> => {
    const network = chainIDMap[terra.config.chainID]
    if (network != 'mainnet' || !findOriginalOwner) {
        return {
            nftContract: nftAddress,
            tokenId,
            owner: originalOwner,
            memo: addressMemos[originalOwner] || '',
            createdAt: new Date()
        }
    }
    // query based on each marketplace
    const marketplace = MarketplaceAddressMap[originalOwner]
    if (marketplace) {
        return await queryMarketplaceSeller[marketplace](nftAddress, tokenId, originalOwner, terra, height)
    }
    return {
        nftContract: nftAddress,
        tokenId,
        owner: originalOwner,
        memo: '',
        createdAt: new Date()
    }
}

export const exportCsv = (
    owners: NftOwner[],
    nftAddress: string,
    height: number,
    outputPath: string
): string => {
    const fields = [
        {
            label: 'nft_address',
            value: 'nftContract'
        },
        {
            label: 'token_id',
            value: 'tokenId'
        },
        {
            label: 'owner',
            value: 'owner'
        },
        {
            label: 'height',
            value: 'height'
        },
        {
            label: 'memo',
            value: 'memo'
        }
    ]
    const parser = new Parser({
        fields,
        quote: ''
    })
    let sortedOwners = owners.sort((a, b) => {
        if (a.tokenId < b.tokenId) {
            return -1
        } else {
            return 1
        }
    })
    const ownerCsv = parser.parse(sortedOwners)
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
    }
    let timestamp = new Date().toISOString()
    if (height) {
        timestamp = height.toString()
    }
    const outputFilename = path.join(outputPath, `holder_${nftAddress}_${timestamp}.csv`)
    fs.writeFileSync(outputFilename, ownerCsv)
    return outputFilename
}

export const exportJson = (
    owners: NftOwner[],
    nftAddress: string,
    height: number,
    outputPath: string) => {
    let timestamp = new Date().toISOString()
    if (height) {
        timestamp = height.toString()
    }
    const outputFilename = path.join(outputPath, `holder_${nftAddress}_${timestamp}.json`)
    let sortedOwners = owners.sort((a, b) => {
        if (a.tokenId < b.tokenId) {
            return -1
        } else {
            return 1
        }
    })
    fs.writeFileSync(outputFilename, JSON.stringify(sortedOwners, null, 2), 'utf-8')
    return outputFilename
}

export const loadJson = (
    filePath: string
): NftOwner[] => {
    const datas = fs.readFileSync(filePath, 'utf-8').toString()
    return JSON.parse(datas)
}

export const loadCsv = async (
    filePath: string
): Promise<NftOwner[]> => {
    const owners: NftOwner[] = []
    const parser = fs
        .createReadStream(filePath)
        .pipe(parse({
            columns: true
        }))

    const tokenSet = new Set<string>()
    for await (const record of parser) {

        // Check token id
        if (!record.owner) {
            console.error(chalk.red(`Error: owner not found: ${record.token_id}`))
            process.exit(-1)
        }

        // Check duplicate id
        if (tokenSet.has(record.token_id)) {
            console.error(chalk.red(`Error: duplicate NFT Token Id: ${record.token_id}`))
            process.exit(-1)
        }
        tokenSet.add(record.token_id)

        owners.push({
            nftContract: record.nft_address,
            tokenId: record.token_id,
            owner: record.owner,
            height: record.height,
            memo: record.memo
        } as NftOwner)
    }
    return owners
}