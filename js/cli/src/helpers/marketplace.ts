import { SoilData } from '../interfaces/config'
import { Instruction, NftTx } from '../interfaces/instruction'
import { readSoilData } from './minter'
import { NftOwner } from './snapshot'
import { LCDClient } from '@terra-money/terra.js'
import { queryAtHeight, query } from './terra'

export type MapperFnSignature = (nftAddress: string, tokenId: string, terra: any, height?: number) => Promise<NftOwner>

export enum Marketplace {
    Knowhere = 'knowhere',
    Talis = 'talis'
}

export const MarketplaceAddressMap: Record<string, Marketplace> = {
    'terra16t9fg9x7pssm39fc90yx508cpw4tv33wfr7sprf6mn3qk84wrk2s2v3qy3': Marketplace.Knowhere
}

const KNOWHERE_ADDRESS = 'terra16t9fg9x7pssm39fc90yx508cpw4tv33wfr7sprf6mn3qk84wrk2s2v3qy3'

export const queryKnowhereSeller: MapperFnSignature = async (nftAddress: string, tokenId: string, terra: LCDClient, height?: number): Promise<NftOwner> => {
    let response: any
    if (height) {
        response = await queryAtHeight(terra, KNOWHERE_ADDRESS, {
            nft_auction: {
                nft_contract: nftAddress,
                token_id: tokenId
            }
        }, height)
    } else {
        response = await query(terra, KNOWHERE_ADDRESS, {
            nft_auction: {
                nft_contract: nftAddress,
                token_id: tokenId
            }
        })
    }
    let owner = response.seller
    if (response.is_settled) {
        owner = response.bidder
    }
    return {
        nftContract: nftAddress,
        tokenId,
        owner,
        memo: 'knowhere',
        createdAt: new Date(),
        height
    }
}

export const queryTalisSeller: MapperFnSignature = async (nftAddress: string, tokenId: string, terra: LCDClient, height?: number): Promise<NftOwner> => {
    return null
}

export const queryMarketplaceSeller: Record<Marketplace, MapperFnSignature> = {
    [Marketplace.Knowhere]: queryKnowhereSeller,
    [Marketplace.Talis]: queryTalisSeller
}
