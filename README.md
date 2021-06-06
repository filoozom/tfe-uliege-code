# Master Thesis

This repository contains all the code related to my master thesis.

## Ethereum

The `ethereum` folder contains the smart contract used as an example in the "Blockchain for this work" chapter.

It can be deployed using the following commands:

```bash
$ cd ethereum
$ npm i
$ npx truffle deploy --network goerli
$ npx truffle run verify --network goerli Platform
```

## Platform

The `platform` folder contains the proof of concept code for the proposed protocol. It contains its owns `README`.
