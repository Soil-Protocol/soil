import { Collection, CollectionAttributeTrait, RarityModel, NftRarity, NftRank } from '../interfaces/nft'
import path from 'path'
import fs from 'fs'
import { Parser } from 'json2csv'

export const calculateRarity = (
    collection: Collection
) => {
    let calculatedCollection = collection
    let attributeDict: Record<string, Record<string, CollectionAttributeTrait>> = {}
    collection.collectionAttributes.forEach(attr => {
        if (!attributeDict[attr.trait_type]) {
            attributeDict[attr.trait_type] = {}
        }
        attr.values.forEach(value => {
            attributeDict[attr.trait_type][value.value] = value
        })
    })
    // calculate trait rarity model
    const traitRarityNft = calculateTraitRarity(collection, attributeDict)
    // calculate mean trait rarity model
    const meanTraitRarityNft = calculateMeanTraitRarity(collection, attributeDict)
    // calculate statistical rarity model
    const statRarityNft = calculatStatisticalRarity(collection, attributeDict)
    // calculate rarity score model
    const rarityScoreNft = calculatRarityScore(collection, attributeDict)
    // combine all
    calculatedCollection.nfts.forEach(nft => {
        nft.rarities = [
            traitRarityNft[nft.tokenId],
            meanTraitRarityNft[nft.tokenId],
            statRarityNft[nft.tokenId],
            rarityScoreNft[nft.tokenId]
        ]
    })
    return calculatedCollection
}

export const calculateTraitRarity = (
    collection: Collection,
    attributeDict: Record<string, Record<string, CollectionAttributeTrait>>
): Record<string, NftRarity> => {
    let traitRarities: Record<string, number> = {}
    let traitRarityNft: Record<string, NftRarity> = {}
    let traitRarityShares = new Set<number>()
    collection.collectionAttributes
    collection.nfts.forEach(nft => {
        let min = 100
        nft.attributes.forEach(attr => {
            if (attr.value == '[none]') {
                return
            }
            const share = attributeDict[attr.trait_type][attr.value].share
            if (share < min) {
                min = share
            }
        })
        traitRarities[nft.tokenId] = min
        traitRarityShares.add(min)
    })
    const sortedTraitRarityShares = [...traitRarityShares].sort((a, b) => a - b)
    const traitRarityRankMap: Record<number, number> = {}
    let count = 1
    sortedTraitRarityShares.forEach(share => {
        traitRarityRankMap[share] = count
        count += 1
    })
    collection.nfts.forEach(nft => {
        traitRarityNft[nft.tokenId] = {
            rankModel: RarityModel.TraitRarity,
            score: traitRarities[nft.tokenId],
            rank: traitRarityRankMap[traitRarities[nft.tokenId]]
        }
    })
    return traitRarityNft
}

export const calculateMeanTraitRarity = (
    collection: Collection,
    attributeDict: Record<string, Record<string, CollectionAttributeTrait>>
): Record<string, NftRarity> => {
    let meanTraitRarities: Record<string, number> = {}
    let meanTraitRarityNft: Record<string, NftRarity> = {}
    let meanTraitRarityShares = new Set<number>()
    collection.collectionAttributes
    collection.nfts.forEach(nft => {
        let sum = 0
        let count = 0
        nft.attributes.forEach(attr => {
            if (attr.value == '[none]') {
                return
            }
            const share = attributeDict[attr.trait_type][attr.value].share
            sum += share
            count += 1
        })
        const mean = sum / count
        meanTraitRarities[nft.tokenId] = mean
        meanTraitRarityShares.add(mean)
    })
    const sortedMeanTraitRarityShares = [...meanTraitRarityShares].sort((a, b) => a - b)
    const meanTraitRarityRankMap: Record<number, number> = {}
    let count = 1
    sortedMeanTraitRarityShares.forEach(mean => {
        meanTraitRarityRankMap[mean] = count
        count += 1
    })
    collection.nfts.forEach(nft => {
        meanTraitRarityNft[nft.tokenId] = {
            rankModel: RarityModel.MeanTraitRarity,
            score: meanTraitRarities[nft.tokenId],
            rank: meanTraitRarityRankMap[meanTraitRarities[nft.tokenId]]
        }
    })
    return meanTraitRarityNft
}

export const calculatStatisticalRarity = (
    collection: Collection,
    attributeDict: Record<string, Record<string, CollectionAttributeTrait>>
): Record<string, NftRarity> => {
    let statRarities: Record<string, number> = {}
    let statRarityNft: Record<string, NftRarity> = {}
    let statRarityShares = new Set<number>()
    collection.collectionAttributes
    collection.nfts.forEach(nft => {
        let mul = 1
        nft.attributes.forEach(attr => {
            if (attr.value == '[none]') {
                return
            }
            const share = attributeDict[attr.trait_type][attr.value].share
            mul = mul * share
        })
        statRarities[nft.tokenId] = mul
        statRarityShares.add(mul)
    })
    const sortedMeanTraitRarityShares = [...statRarityShares].sort((a, b) => a - b)
    const statRarityRankMap: Record<number, number> = {}
    let count = 1
    sortedMeanTraitRarityShares.forEach(mean => {
        statRarityRankMap[mean] = count
        count += 1
    })
    collection.nfts.forEach(nft => {
        statRarityNft[nft.tokenId] = {
            rankModel: RarityModel.StatisticalRarity,
            score: statRarities[nft.tokenId],
            rank: statRarityRankMap[statRarities[nft.tokenId]]
        }
    })
    return statRarityNft
}

export const calculatRarityScore = (
    collection: Collection,
    attributeDict: Record<string, Record<string, CollectionAttributeTrait>>
): Record<string, NftRarity> => {
    const totalSupply = collection.nfts.length
    let rarityScoreMap: Record<string, number> = {}
    let rarityScoreNft: Record<string, NftRarity> = {}
    let rarityScores = new Set<number>()
    collection.nfts.forEach(nft => {
        let totalScore = 0
        nft.attributes.forEach(attr => {
            if (attr.value == '[none]') {
                return
            }
            const count = attributeDict[attr.trait_type][attr.value].count
            const score = 1 / (count / totalSupply)
            totalScore += score
        })
        rarityScores.add(totalScore)
        rarityScoreMap[nft.tokenId] = totalScore
    })
    const sortedRarityScore = [...rarityScores].sort((a, b) => a - b).reverse()
    console.log(sortedRarityScore)
    const rarityScoreRankMap: Record<number, number> = {}
    let count = 1
    sortedRarityScore.forEach(score => {
        rarityScoreRankMap[score] = count
        count += 1
    })
    collection.nfts.forEach(nft => {
        rarityScoreNft[nft.tokenId] = {
            rankModel: RarityModel.RarityScore,
            score: rarityScoreMap[nft.tokenId],
            rank: rarityScoreRankMap[rarityScoreMap[nft.tokenId]]
        }
    })
    return rarityScoreNft
}

export const exportCsv = (
    ranks: NftRank[],
    nftAddress: string,
    outputPath: string,
    filename?: string
): string => {
    const fields = [
        {
            label: 'token_id',
            value: 'tokenId'
        },
        {
            label: 'name',
            value: 'name'
        },
        {
            label: 'trait_rarity',
            value: 'traitRarity'
        },
        {
            label: 'mean_trait_rarity',
            value: 'meanTraitRarity'
        },
        {
            label: 'statistical_rarity',
            value: 'statisticalRarity'
        },
        {
            label: 'rarity_score',
            value: 'rarityScore'
        },
    ]
    const parser = new Parser({
        fields,
        quote: ''
    })
    let sortedRanks = ranks.sort((a, b) => {
        if (a.tokenId < b.tokenId) {
            return -1
        } else {
            return 1
        }
    })
    const ownerCsv = parser.parse(sortedRanks)
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
    }
    let outputFilename
    if (filename) {
        outputFilename = path.join(outputPath, `${filename}.csv`)
    } else {
        outputFilename = path.join(outputPath, `rank_${nftAddress}.csv`)
    }
    fs.writeFileSync(outputFilename, ownerCsv)
    return outputFilename
}