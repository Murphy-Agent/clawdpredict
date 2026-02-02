import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real prediction markets with accurate descriptions
const markets = [
  // Politics
  {
    slug: 'russia-ukraine-ceasefire-march-2026',
    title: 'Russia x Ukraine ceasefire by March 31, 2026?',
    description: 'This market resolves YES if there is an officially announced ceasefire agreement between Russia and Ukraine that goes into effect on or before March 31, 2026. The ceasefire must be announced by both governments or through an official international mediator. A temporary truce of less than 7 days does not count. Partial ceasefires covering only specific regions do not count.',
    category: 'politics',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Flag_of_Ukraine.svg/200px-Flag_of_Ukraine.svg.png',
    endDate: new Date('2026-03-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'jd-vance-2028-republican-nomination',
    title: 'Will J.D. Vance win the 2028 Republican presidential nomination?',
    description: 'This market resolves YES if J.D. Vance officially becomes the Republican Party nominee for President of the United States in the 2028 election. Resolution occurs when the Republican National Convention formally nominates their candidate.',
    category: 'politics',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/J._D._Vance_official_portrait_118th_Congress.jpg/200px-J._D._Vance_official_portrait_118th_Congress.jpg',
    endDate: new Date('2028-08-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'gavin-newsom-2028-democratic-nomination',
    title: 'Will Gavin Newsom win the 2028 Democratic presidential nomination?',
    description: 'This market resolves YES if Gavin Newsom officially becomes the Democratic Party nominee for President of the United States in the 2028 election. Resolution occurs when the Democratic National Convention formally nominates their candidate.',
    category: 'politics',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gavin_Newsom_official_photo.jpg/200px-Gavin_Newsom_official_photo.jpg',
    endDate: new Date('2028-08-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'putin-out-president-end-2026',
    title: 'Putin out as President of Russia by end of 2026?',
    description: 'This market resolves YES if Vladimir Putin is no longer serving as President of Russia by December 31, 2026, 23:59 Moscow time. This includes death, resignation, removal from office, or loss of power through any means. Acting presidents or temporary transfers of power lasting less than 30 days do not count.',
    category: 'politics',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Vladimir_Putin_-_2012.jpg/200px-Vladimir_Putin_-_2012.jpg',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'trump-impeached-again-2026',
    title: 'Will Trump be impeached again in 2025-2026?',
    description: 'This market resolves YES if the U.S. House of Representatives votes to impeach Donald Trump during his second presidential term (2025-2026). Impeachment requires a simple majority vote in the House. The market does not require conviction by the Senate.',
    category: 'politics',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'china-taiwan-military-action-2026',
    title: 'Chinese military action against Taiwan in 2026?',
    description: 'This market resolves YES if China initiates direct military action against Taiwan in 2026. This includes invasion, blockade, missile strikes, or significant military engagement. Minor incursions into airspace or cyber attacks alone do not count.',
    category: 'politics',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  
  // Crypto & Tech
  {
    slug: 'bitcoin-1m-before-gta-vi',
    title: 'Will Bitcoin hit $1M before GTA VI release?',
    description: 'This market resolves YES if Bitcoin (BTC) reaches a price of $1,000,000 USD or higher on any of the following exchanges: Coinbase, Binance, Kraken, or Bitstamp, before the official worldwide release date of Grand Theft Auto VI. Price must be sustained for at least 1 hour.',
    category: 'crypto-tech',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/200px-Bitcoin.svg.png',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'bitcoin-150k-2026',
    title: 'Will Bitcoin reach $150,000 in 2026?',
    description: 'This market resolves YES if Bitcoin (BTC) reaches a price of $150,000 USD or higher on Coinbase at any point during 2026. The price must be the official Coinbase spot price.',
    category: 'crypto-tech',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/200px-Bitcoin.svg.png',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'ethereum-10k-2026',
    title: 'Will Ethereum reach $10,000 in 2026?',
    description: 'This market resolves YES if Ethereum (ETH) reaches a price of $10,000 USD or higher on Coinbase at any point during 2026.',
    category: 'crypto-tech',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'openai-ipo-2026',
    title: 'Will OpenAI IPO in 2026?',
    description: 'This market resolves YES if OpenAI completes an initial public offering (IPO) with shares trading on a major stock exchange (NYSE, NASDAQ) by December 31, 2026. Direct listings count. SPACs do not count.',
    category: 'crypto-tech',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/200px-OpenAI_Logo.svg.png',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'agi-achieved-2026',
    title: 'AGI announced by major lab in 2026?',
    description: 'This market resolves YES if OpenAI, Anthropic, Google DeepMind, or Meta AI officially announces they have achieved Artificial General Intelligence (AGI) in 2026. The announcement must come from official company communications, not third-party assessments.',
    category: 'crypto-tech',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'apple-ai-device-2026',
    title: 'Apple releases dedicated AI hardware device in 2026?',
    description: 'This market resolves YES if Apple announces and releases a new hardware product category specifically designed for AI/ML applications in 2026. This excludes updates to existing products (iPhone, Mac, etc.) but includes new wearables or home devices with AI as primary function.',
    category: 'crypto-tech',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },

  // Pop Culture
  {
    slug: 'gta-vi-released-before-june-2026',
    title: 'GTA VI released before June 2026?',
    description: 'This market resolves YES if Grand Theft Auto VI is officially released and available for purchase or download on any platform (PlayStation, Xbox, PC) before June 1, 2026, 00:00 UTC. Early access or beta releases do not count.',
    category: 'pop-culture',
    image: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a5/Rockstar_Games_Logo.svg/200px-Rockstar_Games_Logo.svg.png',
    endDate: new Date('2026-06-01T00:00:00Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'gta-vi-100-dollars',
    title: 'Will GTA VI standard edition cost $100+?',
    description: 'This market resolves YES if the standard (non-special, non-collector) edition of Grand Theft Auto VI has a retail price of $99.99 USD or more at launch in the United States. Digital and physical prices are both considered.',
    category: 'pop-culture',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'taylor-swift-super-bowl-2027',
    title: 'Taylor Swift Super Bowl 2027 halftime performer?',
    description: 'This market resolves YES if Taylor Swift is announced as the headlining performer for the Super Bowl LXI halftime show in February 2027. Guest appearances do not count; she must be the primary headliner.',
    category: 'pop-culture',
    endDate: new Date('2027-02-15T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'avatar-3-release-2026',
    title: 'Avatar 3 released in 2026?',
    description: 'This market resolves YES if Avatar 3 (Fire and Ash) has its worldwide theatrical premiere in 2026. The premiere must be a public release, not a festival screening.',
    category: 'pop-culture',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'disney-buy-ea',
    title: 'Will Disney acquire EA by end of 2026?',
    description: 'This market resolves YES if The Walt Disney Company announces a completed acquisition of Electronic Arts (EA) by December 31, 2026. The deal must be officially closed, not just announced.',
    category: 'pop-culture',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },

  // Sports
  {
    slug: 'italy-qualify-2026-world-cup',
    title: 'Will Italy qualify for the 2026 FIFA World Cup?',
    description: 'This market resolves YES if the Italy national football team qualifies for the 2026 FIFA World Cup to be held in United States, Canada, and Mexico. Italy must be among the 48 teams in the final tournament.',
    category: 'sports',
    image: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/FIGC_Logo_2021.svg/200px-FIGC_Logo_2021.svg.png',
    endDate: new Date('2026-06-01T00:00:00Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'lebron-retirement-2026',
    title: 'Will LeBron James retire by end of 2026?',
    description: 'This market resolves YES if LeBron James officially announces his retirement from professional basketball by December 31, 2026. Temporary breaks or injuries do not count.',
    category: 'sports',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'messi-world-cup-2026',
    title: 'Will Messi play in 2026 World Cup?',
    description: 'This market resolves YES if Lionel Messi plays at least one minute in an official 2026 FIFA World Cup match for Argentina.',
    category: 'sports',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_20180626.jpg/200px-Lionel_Messi_20180626.jpg',
    endDate: new Date('2026-07-19T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'usa-win-2026-world-cup',
    title: 'Will USA win the 2026 FIFA World Cup?',
    description: 'This market resolves YES if the United States Men\'s National Team wins the 2026 FIFA World Cup, defeating all opponents to claim the championship.',
    category: 'sports',
    endDate: new Date('2026-07-19T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },

  // Economy
  {
    slug: 'us-recession-2026',
    title: 'Will the US enter a recession in 2026?',
    description: 'This market resolves YES if the National Bureau of Economic Research (NBER) officially declares that the US entered a recession at any point during 2026. NBER is the official arbiter of US recessions.',
    category: 'economy',
    endDate: new Date('2027-06-30T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'fed-rate-below-3-2026',
    title: 'Fed Funds Rate below 3% by end of 2026?',
    description: 'This market resolves YES if the Federal Reserve target rate upper bound is below 3.00% on December 31, 2026. Resolution based on the official Federal Reserve announcement.',
    category: 'economy',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'sp500-above-7000-2026',
    title: 'S&P 500 closes above 7000 in 2026?',
    description: 'This market resolves YES if the S&P 500 index closes above 7000 points on any trading day in 2026. Based on official closing price from NYSE.',
    category: 'economy',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'nvidia-4t-market-cap-2026',
    title: 'Nvidia reaches $4T market cap in 2026?',
    description: 'This market resolves YES if Nvidia\'s market capitalization reaches $4 trillion USD at any point during 2026, based on official market data.',
    category: 'economy',
    image: 'https://upload.wikimedia.org/wikipedia/sco/thumb/2/21/Nvidia_logo.svg/200px-Nvidia_logo.svg.png',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  },
  {
    slug: 'oil-below-50-2026',
    title: 'Will crude oil drop below $50/barrel in 2026?',
    description: 'This market resolves YES if WTI Crude Oil futures drop below $50 per barrel at any point during 2026.',
    category: 'economy',
    endDate: new Date('2026-12-31T23:59:59Z'),
    outcomes: ['Yes', 'No']
  }
]

async function main() {
  console.log('🎰 Seeding Clawdpredict database...\n')

  // Clear existing data
  console.log('Clearing existing data...')
  await prisma.prediction.deleteMany()
  await prisma.agent.deleteMany()
  await prisma.market.deleteMany()

  // Create markets only
  console.log('\n📊 Creating markets...')
  
  for (const market of markets) {
    await prisma.market.create({
      data: {
        slug: market.slug,
        title: market.title,
        description: market.description,
        image: market.image || null,
        category: market.category,
        outcomes: JSON.stringify(market.outcomes),
        endDate: market.endDate
      }
    })
    console.log(`  ✓ ${market.title.substring(0, 60)}...`)
  }

  // Print summary
  const marketCount = await prisma.market.count()
  const agentCount = await prisma.agent.count()
  const predictionCount = await prisma.prediction.count()

  console.log('\n' + '='.repeat(50))
  console.log('🎰 CLAWDPREDICT SEED COMPLETE')
  console.log('='.repeat(50))
  console.log(`📊 Markets:     ${marketCount}`)
  console.log(`🤖 Agents:      ${agentCount}`)
  console.log(`📈 Predictions: ${predictionCount}`)
  console.log('='.repeat(50))
  console.log('\nPlatform is ready for real agents to register!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
