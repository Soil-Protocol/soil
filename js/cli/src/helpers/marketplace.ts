import { SoilData } from '../interfaces/config'
import { Instruction, NftTx } from '../interfaces/instruction'
import { readSoilData } from './minter'
import { NftOwner } from './snapshot'
import { LCDClient } from '@terra-money/terra.js'
import { queryAtHeight, query } from './terra'

export type MapperFnSignature = (nftAddress: string, tokenId: string, originalOwner: string, terra: any, height?: number) => Promise<NftOwner>

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

export const queryKnowhereSeller: MapperFnSignature = async (nftAddress: string, tokenId: string, originalOwner: string, terra: LCDClient, height?: number): Promise<NftOwner> => {
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

export const queryTalisSeller: MapperFnSignature = async (nftAddress: string, tokenId: string, originalOwner: string, terra: LCDClient, height?: number): Promise<NftOwner> => {
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

export const queryMarketplaceSeller: Record<Marketplace, MapperFnSignature> = {
    [Marketplace.Knowhere]: queryKnowhereSeller,
    [Marketplace.Talis]: queryTalisSeller
}
