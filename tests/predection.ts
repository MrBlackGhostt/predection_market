import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Predection } from "../target/types/predection";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { assert } from "chai";
import {
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("predection", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  let provider = anchor.getProvider();
  const program = anchor.workspace.predection as Program<Predection>;

  let user = anchor.web3.Keypair.generate();
  let market_creator = anchor.web3.Keypair.generate();
  let lamport = anchor.web3.LAMPORTS_PER_SOL;
  let resolver = anchor.web3.Keypair.generate();
  let protocolFeeCollector = anchor.web3.Keypair.generate();

  let marketId = 1;
  const marketIdBuffer = Buffer.alloc(8); // ?? i dont not know what is this
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId)); // what this do ??

  const [marketPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), market_creator.publicKey.toBytes(), marketIdBuffer],
    program.programId
  );
  let collateralMint; // ← Declare but don't initialize
  let yesMint;
  let yesMintPda;
  let noMint;
  let noMintPda;
  let userCollateralAta;
  let feeCollectorColletralAta;
  let protocolFeeCollectorAta;
  let marketVault;

  before("Before any methods", async () => {
    console.log("💰 Funding accounts...");

    // Use direct transfers instead of airdrops
    const transaction = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: market_creator.publicKey,
        lamports: 5 * lamport,
      }),
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: user.publicKey,
        lamports: 5 * lamport,
      }),
anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: protocolFeeCollector.publicKey,
          lamports: 5 * lamport,
        }),
        anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: resolver.publicKey,
          lamports: 5 * lamport,
        })
    );

    await provider.sendAndConfirm(transaction);
    console.log("✅ Accounts funded!");

    [yesMintPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("yes_mint"), marketPDA.toBuffer()],
      program.programId
    );

    [noMintPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("no_mint"), marketPDA.toBuffer()],
      program.programId
    );

    // For localnet testing, create a test USDC mint
    // (In production, we'd use actual USDC: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
    collateralMint = await createMint(
      provider.connection,
      market_creator, // Payer
      market_creator.publicKey, // Mint authority
      null, // Freeze authority
      6 // Decimals (like USDC)
    );
    
    // Don't create YES/NO mints manually - the program will create them via init
    // They are PDAs created during the initialize instruction

    marketVault = await getAssociatedTokenAddress(
      collateralMint,
      marketPDA,
      true
    );

    userCollateralAta = await getAssociatedTokenAddress(
      collateralMint,
      user.publicKey
    );

    feeCollectorColletralAta = await getAssociatedTokenAddress(
      collateralMint,
      market_creator.publicKey
    );

    // Create the ATA for fee collector
    await createAssociatedTokenAccount(
      provider.connection,
      market_creator,
      collateralMint,
      market_creator.publicKey
    );

    protocolFeeCollectorAta = await getAssociatedTokenAddress(
      collateralMint,
      protocolFeeCollector.publicKey
    );

    // Create the ATA for protocol fee collector
    await createAssociatedTokenAccount(
      provider.connection,
      market_creator, // payer
      collateralMint,
      protocolFeeCollector.publicKey
    );

    marketVault = await getAssociatedTokenAddress(
      collateralMint,
      marketPDA,
      true // allowOwnerOffCurve (PDAs can own ATAs)
    );
    console.log("YES Mint PDA:", yesMintPda.toString());
    console.log("NO Mint PDA:", noMintPda.toString());
    console.log("Market Vault:", marketVault.toString());
  });

  it("Is initialized!", async () => {
    // Add your test here.
    let market_id = new anchor.BN(1);
    let question = "Will BTC reach $150k by end of 2026?";  // Longer question (>= 10 chars)
    let questionBytes = Buffer.from(question, 'utf-8');
    let duration_time = new anchor.BN(0); // immediate resolution for testing
    let fee = new anchor.BN(500);
    
    // Re-derive market PDA with the EXACT market_id being passed
    const market_id_buffer = Buffer.alloc(8);
    market_id_buffer.writeBigUInt64LE(BigInt(market_id.toNumber()));
    
    const [derivedMarketPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), market_creator.publicKey.toBytes(), market_id_buffer],
      program.programId
    );
    
    console.log("Derived Market PDA:", derivedMarketPDA.toString());
    console.log("Original Market PDA:", marketPDA.toString());
    
    const tx = await program.methods
      .initialize(resolver.publicKey, market_id, questionBytes, duration_time, fee)
      .accounts({
        marketCreator: market_creator.publicKey,
        market: derivedMarketPDA,  // Use the correctly derived PDA
        collateralMint: collateralMint,
        feeCollectorColletralAta: feeCollectorColletralAta,
        protocolFeeCollector: protocolFeeCollector.publicKey,
        protocolFeeCollectorAta: protocolFeeCollectorAta,
        yesMint: yesMintPda,
        noMint: noMintPda,
        marketVault: marketVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([market_creator]) // ← MISSING      })
      .rpc();

    await provider.connection.confirmTransaction(tx);

    const market_acc = await program.account.market.fetch(derivedMarketPDA);

    assert.equal(market_acc.authority.toBase58(), market_creator.publicKey.toBase58());

    console.log("✅ Market created successfully!");
    console.log("Transaction signature:", tx);
    console.log("Market account:", market_acc);
  });

  it("Buy YES shares", async () => {
    // User wants to buy 10 USDC worth of YES shares
    const buyAmount = new anchor.BN(10 * 1_000_000); // 10 USDC (6 decimals)
    
    // First, mint some collateral to the user
    const { mintTo } = await import("@solana/spl-token");
    
    // Create user's collateral ATA if it doesn't exist
    const userCollateralAta = await getAssociatedTokenAddress(
      collateralMint,
      user.publicKey
    );
    
    try {
      await createAssociatedTokenAccount(
        provider.connection,
        user,
        collateralMint,
        user.publicKey
      );
    } catch (e) {
      // ATA might already exist, ignore
    }
    
    // Mint 100 USDC to user for testing
    await mintTo(
      provider.connection,
      market_creator, // Payer
      collateralMint,
      userCollateralAta,
      market_creator.publicKey, // Mint authority
      100 * 1_000_000 // 100 USDC
    );
    
    console.log("💰 User funded with 100 USDC");
    
    // Re-derive market PDA
    const market_id_buffer = Buffer.alloc(8);
    market_id_buffer.writeBigUInt64LE(BigInt(1));
    
    const [marketPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), market_creator.publicKey.toBytes(), market_id_buffer],
      program.programId
    );
    
    // Derive YES and NO mint PDAs
    const [yesMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("yes_mint"), marketPDA.toBuffer()],
      program.programId
    );
    
    const [noMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("no_mint"), marketPDA.toBuffer()],
      program.programId
    );
    
    // Get user's YES and NO token accounts (will be created by init_if_needed)
    const userYesAta = await getAssociatedTokenAddress(
      yesMintPda,
      user.publicKey
    );
    
    const userNoAta = await getAssociatedTokenAddress(
      noMintPda,
      user.publicKey
    );
    
    // Get market vault
    const marketVault = await getAssociatedTokenAddress(
      collateralMint,
      marketPDA,
      true // allowOwnerOffCurve
    );
    
    console.log("📊 Buying 10 USDC worth of YES shares...");
    
    const tx = await program.methods
      .buyShare(buyAmount, new anchor.BN(1), true) // amount, market_id, is_yes
      .accounts({
        signer: user.publicKey,
        feeCollectorAta: feeCollectorColletralAta,
        protocolFeeCollectorAta: protocolFeeCollectorAta,
        market: marketPDA,
        marketVault: marketVault,
        collateralMint: collateralMint,
        userCollateralMintAta: userCollateralAta,
        yesMint: yesMintPda,
        noMint: noMintPda,
        yesMintAta: userYesAta,
        noMintAta: userNoAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    
    await provider.connection.confirmTransaction(tx);
    
    console.log("✅ Purchase successful!");
    console.log("Transaction signature:", tx);
    
    // Fetch balances to verify
    const userYesBalance = await provider.connection.getTokenAccountBalance(userYesAta);
    const marketVaultBalance = await provider.connection.getTokenAccountBalance(marketVault);
    const feeCollectorBalance = await provider.connection.getTokenAccountBalance(feeCollectorColletralAta);
    const protocolFeeBalance = await provider.connection.getTokenAccountBalance(protocolFeeCollectorAta);
    
    console.log("\n📈 Balances after purchase:");
    console.log("  User YES tokens:", userYesBalance.value.uiAmount);
    console.log("  Market vault USDC:", marketVaultBalance.value.uiAmount);
    console.log("  Fee collector USDC:", feeCollectorBalance.value.uiAmount);
    console.log("  Protocol fee USDC:", protocolFeeBalance.value.uiAmount);
    
    // Assertions
    // With 5% fee (500 BPS), buying 10 USDC:
    // - Fee = 10 * 0.05 = 0.5 USDC
    // - Net amount = 10 - 0.5 = 9.5 USDC goes to vault
    // - User gets 9.5 YES tokens
    // - Protocol gets 0.25 USDC (50% of fee)
    // - Creator gets 0.25 USDC (50% of fee)
    
    const expectedYesTokens = 9.5; // 10 - 0.5 fee
    const expectedVaultAmount = 9.5;
    const expectedFeeAmount = 0.25; // 50% of 0.5 USDC fee
    
    assert.equal(userYesBalance.value.uiAmount, expectedYesTokens, "User should have 9.5 YES tokens");
    assert.equal(marketVaultBalance.value.uiAmount, expectedVaultAmount, "Vault should have 9.5 USDC");
    assert.equal(feeCollectorBalance.value.uiAmount, expectedFeeAmount, "Fee collector should have 0.25 USDC");
    assert.equal(protocolFeeBalance.value.uiAmount, expectedFeeAmount, "Protocol should have 0.25 USDC");
  });

  it("Resolves market with correct outcome", async () => {
    const buyAmount = new anchor.BN(10 * 1_000_000); // 10 USDC
    // Buy NO shares to enable resolution on both sides
    const userYesAta = await getAssociatedTokenAddress(yesMintPda, user.publicKey);
    const userNoAta = await getAssociatedTokenAddress(noMintPda, user.publicKey);
    const buyNoTx = await program.methods
      .buyShare(buyAmount, new anchor.BN(1), false)
      .accounts({
        signer: user.publicKey,
        feeCollectorAta: feeCollectorColletralAta,
        protocolFeeCollectorAta: protocolFeeCollectorAta,
        market: marketPDA,
        marketVault: marketVault,
        collateralMint: collateralMint,
        userCollateralMintAta: userCollateralAta,
        yesMint: yesMintPda,
        noMint: noMintPda,
        yesMintAta: userYesAta,
        noMintAta: userNoAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    await provider.connection.confirmTransaction(buyNoTx);

    const resolveTx = await program.methods
      .resolveMarket(true)
      .accounts({
        resolver: resolver.publicKey,
        market: marketPDA,
        yesMint: yesMintPda,
        noMint: noMintPda,
      })
      .signers([resolver])
      .rpc();
    await provider.connection.confirmTransaction(resolveTx);
    const marketAccount = await program.account.market.fetch(marketPDA);
    assert.equal(marketAccount.option, true, "Market option should be true");
    assert.ok("resolved" in marketAccount.status, "Market status should be Resolved");
  });
});
