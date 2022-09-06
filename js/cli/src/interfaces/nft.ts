export interface NftOwner {
    nftContract: string
    owner: string
    tokenId: string
    createdAt: Date
    memo?: string
    height?: number
}

export interface NftTrait {
    display_type?: string
    trait_type: string
    value: string
}

export interface Nft {
    nftContract: string
    tokenId: string
    name?: string
    description?: string
    image?: string
    imageData?: string
    animationUrl?: string
    videoUrl?: string
    attributes?: NftTrait[]
    height?: number
    rarities?: NftRarity[]
}

export interface NftRarity {
    rankModel: RarityModel
    score: number
    rank: number
}

export enum RarityModel {
    TraitRarity = 'trait_rarity',
    MeanTraitRarity = 'mean_trait_rarity',
    StatisticalRarity = 'statistical_rarity',
    RarityScore = 'rarity_score'
}

export interface Collection {
    nftContract: string
    name: string
    symbol: string
    nfts?: Nft[]
    collectionAttributes?: CollectionAttribute[]
}

export interface CollectionAttribute {
    trait_type: string
    values: CollectionAttributeTrait[]
}

export interface CollectionAttributeTrait {
    value: string
    share: number
    count: number
}

export enum NftStandard {
    Cw721Standard = 'Cw721Standard',
    TalisStandard = 'TalisStandard'
}

export interface NftRank {
    tokenId: string,
    name: string,
    traitRarity: number,
    meanTraitRarity: number,
    statisticalRarity: number,
    rarityScore: number
}