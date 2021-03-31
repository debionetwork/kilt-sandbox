// import the KILT SDK
const Kilt = require('@kiltprotocol/sdk-js')

// impoty polkadot utilities
const ps = require('@polkadot/util-crypto')

// wrap call inside async function
async function createMnemonic() {
  // await initialization
  await ps.cryptoWaitReady()
  const claimerMnemonic = Kilt.Identity.generateMnemonic()
  // console.log('Claimer mnemonic: ', claimerMnemonic)
  // const claimer = Kilt.Identity.buildFromMnemonic(claimerMnemonic)
  // console.log('Claimer address: ', claimer.address)
  return claimerMnemonic
}

// wrap call inside async function
async function createClaimAndAttest(mnemonic, claimContents) {
  // await initialization
  await ps.cryptoWaitReady()

  // <claimerMnemonic> is for example 'gold upset segment cake universe carry demand comfort dawn invite element capital'
  const claimer = Kilt.Identity.buildFromMnemonic(mnemonic)

  const ctype = Kilt.CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Debio Account',
    properties: {
      password: {
        type: 'string',
      },
    },
    type: 'object',
  })

  // const claimContents = {
  //   password: 'alice',
  // }

  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    claimContents,
    claimer.address
  )

  const requestForAttestationStruct = Kilt.RequestForAttestation.fromClaimAndIdentity(claim, claimer)
  
  // use the attester mnemonic you've generated in the Identity step
  const attester = Kilt.Identity.buildFromMnemonic('aspect execute comic resist there poet vital garment circle garment kite hair')

  // use the JSON string representation of the request attestation generated in the previous step
  // const requestForAttestationStruct = JSON.parse(
  //   requestForAttestationJsonString
  // )
  
  const requestForAttestation = Kilt.RequestForAttestation.fromRequest(
    requestForAttestationStruct
  )
  
  const isDataValid = requestForAttestation.verifyData()
  const isSignatureValid = requestForAttestation.verifySignature()
  console.log('\n')
  if(isDataValid) console.log('Data is valid')
  if(isSignatureValid) console.log('Signature is valid')
  console.log('\n')

  // build the attestation object
  const attestation = await Kilt.Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )

  // connect to the chain (this is one KILT testnet node)
  await Kilt.init({address: 'wss://full-nodes.kilt.io:9944'})
  await Kilt.connect()
  console.log(
    '\nSuccessfully connected to KILT testnet, storing attestation next...'
  )

  // store the attestation on chain
  await attestation.store(attester).then(async (tx) => {
    await Kilt.BlockchainUtils.submitSignedTx(tx, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
    })
    console.log('Attestation saved on chain.')
  })
  // the attestation was successfully stored on the chain, so you can now create the AttestedClaim object
  const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    attestation
  )
  // log the attestedClaim so you can copy/send it back to the claimer
  console.log('attestedClaimJSONString:\n', JSON.stringify(attestedClaim))

  // disconnect from the chain
  await Kilt.disconnect()
  console.log('Disconnected from KILT testnet')
}

// Import readline
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Create a promise based version of rl.question so we can use it in async functions
const question = (str) => new Promise(resolve => rl.question(str, resolve))

const steps = {
  start: async () => {
    const choice = await question("\nWhat do you want to do?\n1. Login\n2. Register\n3. Exit\nOption: ")
    if (choice == "1") { console.log("\nLogin is not available at the moment sorry...") }
    if (choice == "2") { return steps.register() }
    if (choice == "3") { return steps.end() }
  },
  register: async () => {
    let mnemonic = await createMnemonic()
    console.log("\nHere is your mnemonic, please keep it somewhere safe:\n" + mnemonic)
    
    let password = await question("\nPlease enter your password: ")
    let data = {
      password: password
    }

    try{
      let generatedClaim = await createClaimAndAttest(mnemonic, data)
      console.log("\nHere is your generated claim: " + generatedClaim)
    }
    catch(ex){
      console.log("An error occured: " + ex + ".\nPlease try again later.")
    }
    
    return steps.start()
  },
  end: async () => {
    rl.close()
  },
}

// execute calls
steps.start()