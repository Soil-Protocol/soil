import { Nft, NftOwner, NftStandard, NftTrait } from '../interfaces/nft'
import { LCDClient } from '@terra-money/terra.js'
import { queryAtHeight, query } from './terra'
import { extractQmHash } from './nft'
import axios from 'axios'

export type MarketplaceMapperFnSignature = (nftAddress: string, tokenId: string, originalOwner: string, terra: any, height?: number) => Promise<NftOwner>

export type NftInfoMapperFnSignature = (nftAddress: string, tokenId: string, rawData: any) => Nft

export enum Marketplace {
    Knowhere = 'knowhere',
    Talis = 'talis'
}

export const MarketplaceAddressMap: Record<string, Marketplace> = {
    'terra16t9fg9x7pssm39fc90yx508cpw4tv33wfr7sprf6mn3qk84wrk2s2v3qy3': Marketplace.Knowhere,
    'terra1cr6apzg5f3jlqntvykrhehg06668cx7jjy2sh7u7u50f79z48nrshpkxuv': Marketplace.Talis, // marketplace
    'terra1ek8ms3uew0rku4wcrqwvgl3hmgrw6jpn2phxv39y66jthjn4vraqww5gpk': Marketplace.Talis // english auction
}

const KNOWHERE_ADDRESS = 'terra16t9fg9x7pssm39fc90yx508cpw4tv33wfr7sprf6mn3qk84wrk2s2v3qy3'
const TALIS_MARKETPLACE_ADDRESS = 'terra1cr6apzg5f3jlqntvykrhehg06668cx7jjy2sh7u7u50f79z48nrshpkxuv'
const TALIS_AUCTION_ADDRESS = 'terra1ek8ms3uew0rku4wcrqwvgl3hmgrw6jpn2phxv39y66jthjn4vraqww5gpk'

export const queryKnowhereSeller: MarketplaceMapperFnSignature = async (nftAddress: string, tokenId: string, originalOwner: string, terra: LCDClient, height?: number): Promise<NftOwner> => {
    let owner = originalOwner
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
    owner = response.seller
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

export const queryTalisSeller: MarketplaceMapperFnSignature = async (nftAddress: string, tokenId: string, originalOwner: string, terra: LCDClient, height?: number): Promise<NftOwner> => {
    let owner = originalOwner
    if (originalOwner == TALIS_MARKETPLACE_ADDRESS) {
        if (height) {
            const response = await queryAtHeight(terra, TALIS_MARKETPLACE_ADDRESS, {
                sell_order_for_token: {
                    contract_address: nftAddress,
                    token_id: tokenId
                }
            }, height)
            owner = response.order.owner
        } else {
            const response = await query(terra, TALIS_MARKETPLACE_ADDRESS, {
                sell_order_for_token: {
                    contract_address: nftAddress,
                    token_id: tokenId
                }
            })
            owner = response.order.owner
        }
    } else if (originalOwner == TALIS_AUCTION_ADDRESS) {
        if (height) {
            const response = await queryAtHeight(terra, TALIS_AUCTION_ADDRESS, {
                auction_by_collection_and_token_id: {
                    contract_address: nftAddress,
                    token_id: tokenId
                }
            }, height)
            owner = response.creator
        } else {
            const response = await query(terra, TALIS_AUCTION_ADDRESS, {
                auction_by_collection_and_token_id: {
                    contract_address: nftAddress,
                    token_id: tokenId
                }
            })
            owner = response.creator
        }
    }
    return {
        nftContract: nftAddress,
        tokenId,
        owner,
        memo: 'talis',
        createdAt: new Date(),
        height
    }
}

export const queryMarketplaceSeller: Record<Marketplace, MarketplaceMapperFnSignature> = {
    [Marketplace.Knowhere]: queryKnowhereSeller,
    [Marketplace.Talis]: queryTalisSeller
}

export const mapCw721Standard: NftInfoMapperFnSignature = (
    nftContract: string,
    tokenId: string,
    rawData: any,
): Nft => {
    let image = rawData.extension?.image || ''
    return {
        nftContract,
        tokenId,
        name: rawData.extension?.name || rawData.name,
        description: rawData.extension?.description,
        animationUrl: rawData.extension?.animation_url,
        videoUrl: rawData.extension?.animation_url,
        image,
        imageData: rawData.extension?.image_data || rawData.image,
        attributes: rawData.extension?.attributes || [],
    }
}

export const mapTalisStandard: NftInfoMapperFnSignature = (
    nftContract: string,
    tokenId: string,
    rawData: any
): Nft => {
    let keys = Object.keys(rawData)
    let attributes: NftTrait[] = []
    let name = ''
    let description = ''
    let image = ''
    keys.forEach(key => {
        let value = rawData[key]
        if (key == 'title') {
            name = value
        } else if (key == 'description') {
            description = value
        } else if (key == 'media') {
            const ipfsHash = extractQmHash(value)
            const fileName = value.substring(value.lastIndexOf('/') + 1)
            if (ipfsHash) {
                image = `ipfs://${ipfsHash}/${fileName}`
            }
        } else {
            attributes.push({
                trait_type: key,
                value
            })
        }
    })
    return {
        nftContract,
        tokenId,
        name,
        description,
        image,
        attributes
    }
}

export const getSpecificMetadata = async (
    nftContract: string,
    tokenId: string,
    standardType: NftStandard,
    rawData: any
): Promise<any> => {
    if (standardType == NftStandard.TalisStandard) {
        const url = rawData.token_uri
        const metadata = await axios.get(url)
        return metadata.data
    }
    return rawData
}

export const nftDataMapper: Record<NftStandard, NftInfoMapperFnSignature> = {
    [NftStandard.Cw721Standard]: mapCw721Standard,
    [NftStandard.TalisStandard]: mapTalisStandard
}