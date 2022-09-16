import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumberish } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber'
import hre from 'hardhat'
import log from 'ololog'

import {RoundIdFetcher } from '../typechain/RoundIdFetcher'
import { RoundIdFetcher__factory } from '../typechain/factories/RoundIdFetcher__factory'

import { feedABI } from '../scripts/abi/feed'

let fetcher: RoundIdFetcher
let feed: any
let deployer: any
let signer: any
let feedAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
let testTimestamp = "1637625600" // Nov 23, 2021
let correctSearchRound = "92233720368547772447" // first round after timestamp

describe('RoundIdFetcher', () => {
    before(async () => {
        let signers = await ethers.getSigners()
        deployer = signers[0]
        feed = new ethers.Contract(feedAddress, JSON.parse(feedABI), deployer)

    })

    beforeEach(async () => {
        const Fetcher: RoundIdFetcher__factory = (await ethers.getContractFactory("RoundIdFetcher")) as RoundIdFetcher__factory
        fetcher = await Fetcher.deploy()
    })

    it('should fetch the correct phase', async () => {
        const result = await fetcher.getPhaseForTimestamp(feedAddress, testTimestamp)
        let firstRoundOfPhase = result[0]
        let firstTimeOfPhase = result[1]
        let firstRoundOfCurrentPhase = result[2]

        let correctFirstRoundOfPhase = "92233720368547758081"
        let correctFirstTimeOfPhase = "1620758509"
        let correctFirstRoundOfCurrentPhase = "92233720368547758081"

        expect(firstRoundOfPhase).to.equal(correctFirstRoundOfPhase)
        expect(firstTimeOfPhase).to.equal(correctFirstTimeOfPhase)
        expect(firstRoundOfCurrentPhase).to.equal(correctFirstRoundOfCurrentPhase) 

        let prevResult = await feed.getRoundData(firstRoundOfPhase.sub(1))
        expect(prevResult[1].toString()).to.equal("0")
        expect(prevResult[2].toString()).to.equal("0")
        expect(prevResult[3].toString()).to.equal("0")

        prevResult = await feed.getRoundData(firstRoundOfCurrentPhase.sub(1))
        expect(prevResult[1].toString()).to.equal("0")
        expect(prevResult[2].toString()).to.equal("0")
        expect(prevResult[3].toString()).to.equal("0")

    })

    it('should fetch the correct round id -- May 11, 2021', async () => {
        let testTimestamp = "1620758009" // May 11, 2021
        let correctRound = "73786976294838210046" // timestamp -> 1620757437
        let nextRound = "73786976294838210047" // timestamp -> 1620758060
        const roundId = await fetcher.getRoundId(feedAddress, testTimestamp);
        expect(roundId).to.be.equal(correctRound);
    })

    it('should fetch the correct round id -- Nov 23, 2021', async () => {
        let testTimestamp = "1637625600" // Nov 23, 2021
        const roundId = await fetcher.getRoundId(feedAddress, testTimestamp);
        expect(roundId).to.be.equal(correctSearchRound);
    })

    it('should fetch the timestamp from the latest valid round', async () => {
        let testTimestamp = "1621492840" // May 20, 2021
        let correctRound = "92233720368547759513" // timestamp -> 1621492777
        let previoudRound = "73786976294838211520" // timestamp -> 1621492839 (Also a valid timestamp for deadline)
        const roundId = await fetcher.getRoundId(feedAddress, testTimestamp);
        expect(roundId).to.be.equal(correctRound);
    })
    
})                      