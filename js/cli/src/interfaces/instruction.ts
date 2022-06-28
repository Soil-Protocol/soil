export interface Instruction {
    tokenId: string,
    name: string,
    imageFilename: string,
    metadataFilename: string | null,
    imageUri?: string,
    owner: string,
}