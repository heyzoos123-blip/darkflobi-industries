const { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');

const TREASURY = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
const AMOUNT = 0.004; // SOL
const WOLF_NAME = 'romulus-test-' + Date.now().toString(36).slice(-4);
const WOLF_TYPE = 'scout';
const DESCRIPTION = 'test wolf spawned by darkflobi to verify the spawn flow works end-to-end';

async function main() {
  console.log('🐺 ROMULUS SPAWN TEST\n');
  
  // Load degen wallet
  const keyData = JSON.parse(fs.readFileSync('C:/Users/heyzo/clawd/secrets/degen-wallet.json'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keyData));
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');
  
  if (balance < AMOUNT * 1e9 + 5000) {
    console.error('Insufficient balance');
    process.exit(1);
  }
  
  // Send payment to treasury
  console.log('\n📤 Sending', AMOUNT, 'SOL to treasury...');
  
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(TREASURY),
      lamports: Math.floor(AMOUNT * 1e9)
    })
  );
  
  const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log('✅ Payment sent!');
  console.log('TX:', signature);
  
  // Wait a moment for propagation
  console.log('\n⏳ Waiting for confirmation...');
  await new Promise(r => setTimeout(r, 3000));
  
  // Call spawn function
  console.log('\n🐺 Spawning wolf...');
  console.log('Name:', WOLF_NAME);
  console.log('Type:', WOLF_TYPE);
  
  const response = await fetch('https://darkflobi.com/.netlify/functions/spawn-wolf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wolfName: WOLF_NAME,
      wolfType: WOLF_TYPE,
      description: DESCRIPTION,
      tier: 'premium',
      txSignature: signature
    })
  });
  
  const result = await response.json();
  console.log('\n📦 RESULT:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.firstPost?.success) {
    console.log('\n🎉 WOLF IS ALIVE!');
    console.log('Post URL:', result.firstPost.postUrl);
  }
}

main().catch(console.error);
