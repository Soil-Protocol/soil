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
create candy machine & seed data (no whitelist)
```
npx ts-node src/candy-machine-cli.ts create -d data -c example-assets/master.csv -n testnet --denom uluna --amount 100000 --creator minter
```
create candy machine & seed data (with whitelist)
```
npx ts-node src/candy-machine-cli.ts create -d data -c example-assets/master.csv -n testnet --denom uluna --amount 100000 --creator minter --whitelist
```
mint nft to candy machine
```
npx ts-node src/nft-cli.ts mint -d data -c data/master.csv -n testnet -m example-assets/metadata
```
view candy machine information
```
npx ts-node src/candy-machine-cli.ts info -d data -n testnet
```
open candy machine
```
npx ts-node src/candy-machine-cli.ts open -d data -n testnet
```
close candy machine
```
npx ts-node src/candy-machine-cli.ts close -d data -n testnet
```
set whitelist
```
npx ts-node src/candy-machine-cli.ts set-whitelist -d data -n testnet -w example-assets/whitelist.csv
```
get whitelist
```
npx ts-node src/candy-machine-cli.ts get-whitelist -d data -a terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v -r 1 -n testnet
```
check eligible
```
npx ts-node src/candy-machine-cli.ts eligible -d data -a terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v -n testnet
```
set round
```
npx ts-node src/candy-machine-cli.ts set-round -d data -r 2 -n testnet
```
open public round
```
npx ts-node src/candy-machine-cli.ts open-public-round -d data -n testnet
```
close public round
```
npx ts-node src/candy-machine-cli.ts close-public-round -d data -n testnet
```
