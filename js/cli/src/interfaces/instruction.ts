export interface Instruction {
    tokenId: string,
    name: string,
    imageFilename: string,
    metadataFilename: string | null,
    imageUri?: string,
    owner: string,
    description?: string,
    attributes?: Trait[]
}

export interface Trait {
    trait_type: string,
    value: string
}

export interface NftTx {
    tokenId: string,
    height: number,
    timestamp: Date,
    txhash: string,
    msgIndex: number
}