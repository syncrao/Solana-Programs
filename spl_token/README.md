# 💰 USDC Vault (Anchor + Solana)

A simple **USDC vault program** built using the **Anchor framework** on Solana.  
This project demonstrates how to securely **deposit and withdraw SPL tokens (USDC)** using a **Program Derived Address (PDA)** as the vault authority.

---

## 🚀 Features

- Deposit USDC into a vault
- Withdraw USDC from the vault
- PDA-based vault authority (secure & program-controlled)
- Uses `transfer_checked` for safe token transfers
- Fully tested with Anchor Mocha tests

---

## 🧠 Concepts Covered

- Anchor framework basics
- SPL Token Program (`transfer_checked`)
- PDA (Program Derived Address)
- Associated Token Accounts (ATA)
- CPI (Cross Program Invocation)
- Token mint validation

---

### 🔐 Vault Design

- Each user gets a **vault PDA**
- Vault PDA acts as the **authority** of vault token account
- Tokens are stored in **vault ATA**

```

User Wallet ──▶ User Token Account ──▶ Vault Token Account (owned by PDA)

```


---

## ⚙️ Smart Contract Instructions

### 📥 Deposit

Transfers USDC from user to vault.

**Validation:**
- Token mint must match USDC mint
- User must own source token account

**Flow:**
1. User signs transaction
2. Tokens transferred to vault ATA

---

### 📤 Withdraw

Transfers USDC from vault back to user.

**Key Concept:**
- PDA signs using seeds

```rust
seeds = ["vault", user_pubkey]
````

**Flow:**

1. PDA acts as signer
2. Tokens transferred from vault ATA to user ATA

---

## 🧪 Test Workflow

The test suite performs:

1. Create USDC mint (6 decimals)
2. Create user ATA
3. Mint 2 USDC to user
4. Deposit 1 USDC
5. Verify balances
6. Withdraw 1 USDC
7. Verify final balances

---

## ▶️ Getting Started

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Build Program

```bash
anchor build
```

### 3️⃣ Run Tests

```bash
anchor test
```

---

## 🔑 Important Code Snippets

### ✅ Deposit (CPI)

```rust
token::transfer_checked(
    cpi_ctx,
    amount,
    ctx.accounts.usdc_mint.decimals,
)?;
```

---

### ✅ Withdraw (PDA Signer)

```rust
let seeds = &[
    b"vault",
    user_key.as_ref(),
    &[ctx.bumps.vault],
];
```

---

## ⚠️ Security Notes

* ✔️ Mint validation prevents wrong token deposits
* ✔️ PDA ensures only program can control vault funds
* ❗ No advanced access control (can be extended)
* ❗ Always validate accounts in production

---

## 🧩 Future Improvements

* Add multi-user pooled vault
* Add interest/yield logic
* Add admin controls
* Support multiple token types
* Add events for indexing

---

## 📚 Tech Stack

* Rust (Anchor Framework)
* Solana Web3.js
* SPL Token Library
* TypeScript (Tests)

---

## 🙌 Author

Built by **Shah Rukh Rao**
Aspiring Blockchain & Solana Developer

---

## ⭐ If you like this project

Give it a ⭐ on GitHub and share it!

```
```
