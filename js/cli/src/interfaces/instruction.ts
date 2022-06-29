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