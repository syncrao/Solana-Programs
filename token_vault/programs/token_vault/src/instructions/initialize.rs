use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};

use crate::state::*;

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        seeds = [b"vault", vault_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 8
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK:
    #[account(
        mut,
        seeds = [b"vault_treasury", vault_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault_treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}


pub fn handler(ctx: Context<Initialize>, vault_id: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.vault_id = vault_id;

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(0);

    let vault_id_bytes = vault_id.to_le_bytes();

    let seeds: &[&[u8]] = &[
        b"vault_treasury",
        vault_id_bytes.as_ref(),
        &[ctx.bumps.vault_treasury],
    ];

    let ix = system_instruction::create_account(
        &ctx.accounts.user.key(),
        &ctx.accounts.vault_treasury.key(),
        lamports,
        0,
        &ctx.accounts.system_program.key(),
    );

    invoke_signed(
        &ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.vault_treasury.to_account_info(),
        ],
        &[seeds],
    )?;

    Ok(())
}
