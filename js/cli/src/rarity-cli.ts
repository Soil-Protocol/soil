import { program } from 'commander'
import { exportCsv } from './helpers/rarity'
import { parseMasterConfig, prepareMint, readSoilData } from './helpers/minter'
import { getNftInfos } from './command/nft'
import { instantiate } from './helpers/terra'
import { calculateTrait, exportNftJson, findNftStandard, loadNFtJson, parseNftFromMasterConfig, sampleNftTokenId } from './helpers/nft'
import { calculateRarity } from './helpers/rarity'
import { NftRank, RarityModel } from './interfaces/nft'
import fs from 'fs'

require('dotenv').config()

program
    .name('rarity-cli')
    .description('cli tool for get nft information and rarity calculation in terra 2.0 nft')
    .version('0.0.1')

program.command('calculate-trait')
    .description('calculate trait percentage from metadata file')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-c, --config <string>', 'master config file')
    .requiredOption('-m, --metadata <string>', 'metadata path')
    .option('-cn, --name <string>', 'collection name')
    .option('-cd, --description <string>', 'collection descrption')
    .option('-o, --output <string>', 'output filename')
    .action(async (directory, cmd) => {
        const {
            data,
            config,
            metadata,
            name,
            description,
            output
        } = cmd.opts()
        let instructions = await parseMasterConfig(config)
        const soilData = readSoilData(data)
        instructions = prepareMint(instructions, soilData, metadata, [], true)
        if (instructions.length <= 0) {
            console.log('no nft, exiting ...')
            return
        }
        // summarize trait
        const nftAddress = soilData.addresses['collection']
        const collection = parseNftFromMasterConfig(nftAddress, instructions, name, description)
        const calculatedCollection = calculateTrait(collection)
        const outputFilename = exportNftJson(data, calculatedCollection, output)
        console.log(`update nft information file: ${outputFilename}`)
    })

program.command('calculate-trait-onchain')
    .description('retrieve nft information and calculate trait percentage from onchain data')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-c, --contract <string>', 'nft contract')
    .requiredOption('-n, --network <string>', 'terra network: localterra/testnet/mainnet')
    .option('-h, --height <number>', 'block height')
    .option('-o, --output <string>', 'output file name')
    .action(async (directory, cmd) => {
        const {
            data,
            contract,
            network,
            height,
            output
        } = cmd.opts()
        let blockHeight = null
        if (height) {
            blockHeight = Number(height)
        }
        const terra = instantiate(network)
        const sampleTokenId = await sampleNftTokenId(contract, terra)
        const nftStandard = await findNftStandard(contract, sampleTokenId, terra)
        const collection = await getNftInfos(contract, terra, blockHeight, nftStandard)
        const calculatedCollection = calculateTrait(collection)
        let filename = output
        if (!output) {
            filename = `${collection.nftContract}_nfts.json`
        }
        const outputFilename = exportNftJson(data, calculatedCollection, filename)
        console.log(`update nft information file: ${outputFilename}`)
    })

program.command('calculate-rarity')
    .description('calculate rarity score & ranking based on nft information')
    .requiredOption('-d, --data <string>', 'data path')
    .requiredOption('-i, --input <string>', 'nft data file')
    .option('-o, --output <string>', 'output file name')
    .action(async (directory, cmd) => {
        const {
            data,
            input,
            output
        } = cmd.opts()
        const collection = loadNFtJson(input)
        console.log('calculate rarity score...')
        const calculatedCollection = calculateRarity(collection)
        // update collection
        fs.writeFileSync(input, JSON.stringify(calculatedCollection, null, 2), 'utf-8')
        console.log(`updated collection file: ${input}`)
        // export to csv for sorting
        const ranks: NftRank[] = calculatedCollection.nfts.map(nft => {
            return {
                tokenId: nft.tokenId,
                name: nft.name,
                traitRarity: nft.rarities.filter(x => x.rankModel == RarityModel.TraitRarity)[0].rank,
                meanTraitRarity: nft.rarities.filter(x => x.rankModel == RarityModel.MeanTraitRarity)[0].rank,
                statisticalRarity: nft.rarities.filter(x => x.rankModel == RarityModel.StatisticalRarity)[0].rank,
                rarityScore: nft.rarities.filter(x => x.rankModel == RarityModel.RarityScore)[0].rank
            }
        })
        const filename = exportCsv(ranks, collection.nftContract, data, output)
        console.log(`rank file created at: ${filename}`)
    })

program.parse()