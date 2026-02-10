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
    let duration_time = new anchor.BN(1000000);
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
});
