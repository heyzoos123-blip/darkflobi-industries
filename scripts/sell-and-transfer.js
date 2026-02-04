const { Connection, Keypair, VersionedTransaction, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const DEGEN_WALLET_PATH = path.join(__dirname, '..', 'secrets', 'degen-wallet.json');
const TREASURY_WALLET = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JARVIS_MINT = '12veWoXCbbaEQppWx6x4ohwbHsv98gRLHh4FgMR3pump';
const JUPITER_API = 'https://public.jupiterapi.com';

async function sellAndTransfer() {
  const secretKey = JSON.parse(fs.readFileSync(DEGEN_WALLET_PATH));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('Degen Wallet:', keypair.publicKey.toBase58());
  console.log('Treasury:', TREASURY_WALLET);
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Get JARVIS balance
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  });
  
  let jarvisAmount = 0;
  for (const account of tokenAccounts.value) {
    const info = account.account.data.parsed.info;
    if (info.mint === JARVIS_MINT) {
      jarvisAmount = info.tokenAmount.amount; // raw amount
      console.log(`JARVIS balance: ${info.tokenAmount.uiAmount} (${jarvisAmount} raw)`);
    }
  }
  
  if (jarvisAmount === '0' || !jarvisAmount) {
    console.log('No JARVIS to sell, skipping to transfer...');
  } else {
    // STEP 1: Sell JARVIS for SOL
    console.log('\n--- STEP 1: Sell JARVIS for SOL ---');
    
    const quoteResp = await fetch(
      `${JUPITER_API}/quote?inputMint=${JARVIS_MINT}&outputMint=${SOL_MINT}&amount=${jarvisAmount}&slippageBps=2500`
    );
    const quote = await quoteResp.json();
    
    if (quote.error) {
      console.error('Quote error:', quote.error);
      return;
    }
    
    console.log(`Quote: ${jarvisAmount} JARVIS → ${(parseInt(quote.outAmount) / 1e9).toFixed(6)} SOL`);
    
    const swapResp = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: keypair.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 500000,
            priorityLevel: "high"
          }
        }
      })
    });
    
    const swapData = await swapResp.json();
    
    if (swapData.error) {
      console.error('Swap error:', swapData.error);
      return;
    }
    
    const tx = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, 'base64'));
    tx.sign([keypair]);
    
    console.log('Sending sell tx...');
    const txid = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 3
    });
    console.log(`TX: https://solscan.io/tx/${txid}`);
    
    // Wait for confirmation
    console.log('Confirming sell...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const status = await connection.getSignatureStatus(txid);
      if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
        if (status.value.err) {
          console.error('Sell TX failed:', JSON.stringify(status.value.err));
          return;
        }
        console.log('Sell SUCCESS!');
        break;
      }
      process.stdout.write('.');
    }
    
    // Wait a bit for balance to update
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // STEP 2: Transfer all SOL to treasury (leave 0.001 for rent)
  console.log('\n--- STEP 2: Transfer SOL to Treasury ---');
  
  const solBalance = await connection.getBalance(keypair.publicKey);
  const transferAmount = solBalance - 5000; // leave 5000 lamports for tx fee
  
  console.log(`SOL balance: ${solBalance / 1e9} SOL`);
  console.log(`Transferring: ${transferAmount / 1e9} SOL`);
  
  if (transferAmount <= 0) {
    console.log('Not enough SOL to transfer');
    return;
  }
  
  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(TREASURY_WALLET),
      lamports: transferAmount
    })
  );
  
  transferTx.feePayer = keypair.publicKey;
  const blockhash = await connection.getLatestBlockhash();
  transferTx.recentBlockhash = blockhash.blockhash;
  transferTx.sign(keypair);
  
  console.log('Sending transfer...');
  const transferTxid = await connection.sendRawTransaction(transferTx.serialize(), {
    skipPreflight: false,
    maxRetries: 3
  });
  console.log(`TX: https://solscan.io/tx/${transferTxid}`);
  
  // Confirm
  console.log('Confirming transfer...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await connection.getSignatureStatus(transferTxid);
    if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
      if (status.value.err) {
        console.error('Transfer TX failed:', JSON.stringify(status.value.err));
        return;
      }
      console.log('Transfer SUCCESS!');
      console.log(`\nDegen wallet closed out. SOL sent to treasury: ${TREASURY_WALLET}`);
      return;
    }
    process.stdout.write('.');
  }
}

sellAndTransfer().catch(console.error);
