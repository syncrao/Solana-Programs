use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;
pub mod events;

use instructions::*;

declare_id!("DjXGiteZtZX2SpyC76PAT7iyZyzs1xjZydYT8edBdNDb");

#[program]
pub mod token_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, vault_id: u64) -> Result<()> {
        instructions::initialize::handler(ctx, vault_id);
        Ok(())
    }
}

