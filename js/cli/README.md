how to use cli
```
cd js/cli
npm install
```
upload image to pinata
```
npx ts-node src/nft-cli.ts upload -d data -i "example-assets/images" -c "example-assets/master.csv"
```
create nft contract
```
npx ts-node src/nft-cli.ts create -cn soil-test -cs SOIL -n testnet -d data
```
create candy machine & seed data
```
npx ts-node src/candy-machine-cli.ts create -d data -c example-assets/master.csv -n testnet --denom uluna --amount 100000 --creator minter
```
mint nft to candy machine
```
npx ts-node src/nft-cli.ts mint -d data -c data/master.csv -n testnet -m example-assets/metadata
```
open candy machine
```
```
set whitelist
```
```