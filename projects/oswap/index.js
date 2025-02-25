/**
 * Oswap is a decentralized token swap protocol on the Obyte ledger.
 *
 * @see https://oswap.io/
 * @see https://v2-stats.oswap.io/
 *
 * @see https://v1.oswap.io/
 * @see https://v1-stats.oswap.io/
 */
const {fetchBaseAABalances, fetchOswapExchangeRates, fetchOswapAssets} = require('../helper/obyte')

// TODO support time travel for the exchange rate, currently it always returns the latest rates
async function tvl(timestamp) {
    const [exchangeRates, assetMetadata] = await Promise.all([
        fetchOswapExchangeRates(),
        fetchOswapAssets()
    ])

    return Promise.all([
        fetchBaseAABalances(timestamp, "GS23D3GQNNMNJ5TL4Z5PINZ5626WASMA"), // Oswap v1
        fetchBaseAABalances(timestamp, "2JYYNOSRFGLI3TBI4FVSE6GFBUAZTTI3"), // Oswap v2
        fetchBaseAABalances(timestamp, "DYZOJKX4MJOQRAUPX7K6WCEV5STMKOHI")  // Oswap v2.1
    ]).then(baseAABalances => {

        const summingAssetTvl = (total, [asset, assetDetails]) => {
            if (!assetMetadata?.hasOwnProperty(asset)) return total

            const decimals = assetMetadata[asset].decimals ?? 0
            const baseCurrency = (asset === "base") ? "GBYTE" : asset
            const usdRate = exchangeRates[`${baseCurrency}_USD`] ?? 0
            const usdValue = assetDetails.balance / Math.pow(10, decimals) * usdRate
            // console.log(`  ${assetMetadata[asset]?.symbol ?? asset} = ${usdValue.toFixed(2)}`)
            return total + usdValue
        }

        const summingAddressTvl = (total, [address, addressDetails]) => {
            // console.log(`${address}:`)
            return total + Object.entries(addressDetails.assets)
                .filter(([asset, assetDetails]) => !assetDetails.selfIssued)
                .reduce(summingAssetTvl, 0)
        }

        const summingBaseAATvl = (total, balances) => {
            return total + Object.entries(balances.addresses).reduce(summingAddressTvl, 0)
        }

        return baseAABalances.reduce(summingBaseAATvl, 0)
    })
}

module.exports = {
    timetravel: false,
    doublecounted: false,
    methodology:
        "The TVL is the USD value of the all non-self issued assets locked into the autonomous agents extending the Oswap protocol.",
    obyte: {
        fetch: tvl
    },
    fetch: tvl
}
