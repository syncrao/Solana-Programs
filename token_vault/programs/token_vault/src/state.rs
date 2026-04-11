use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub vault_id: u64,
}

#[account]
pub struct UserVault {
    pub user: Pubkey,
    pub vault: Pubkey,
    pub balance: u64,
}