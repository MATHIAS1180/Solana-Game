use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    hash::hashv,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    system_program,
    sysvar::Sysvar,
};

const ROOM_SEED_PREFIX: &[u8] = b"room";
const VAULT_SEED_PREFIX: &[u8] = b"vault";
const PROFILE_SEED_PREFIX: &[u8] = b"profile";
const RESERVE_SEED_PREFIX: &[u8] = b"reserve";
const COMMIT_DOMAIN: &[u8] = b"FAULTLINE_COMMIT_V1";
const MAX_PLAYERS: usize = 128;
const ZONE_COUNT: usize = 5;
const MAX_WINNERS: usize = 4;
const RESERVE_FEE_BPS: u64 = 200;
const TREASURY_PUBKEY: Pubkey = pubkey!("12dZBGCWRKtLnZVSc1Nxa2uUnvrbjCwpkkbbwHiybHoQ");
const EMPTY_KEY: [u8; 32] = [0u8; 32];

const ROOM_STATE_SIZE: usize = 11423;
const PROFILE_STATE_SIZE: usize = 136;
const RESERVE_STATE_SIZE: usize = 76;

const ROOM_OPEN: u8 = 0;
const ROOM_COMMIT: u8 = 1;
const ROOM_REVEAL: u8 = 2;
const ROOM_RESOLVED: u8 = 3;
const ROOM_CANCELLED: u8 = 4;
const ROOM_EMERGENCY: u8 = 5;
const ROOM_CLOSED: u8 = 6;

const PLAYER_JOINED: u8 = 1;
const PLAYER_COMMITTED: u8 = 2;
const PLAYER_REVEALED: u8 = 3;
const PLAYER_COMMIT_TIMED_OUT: u8 = 4;
const PLAYER_REVEAL_TIMED_OUT: u8 = 5;

const RISK_CALM: u8 = 0;
const RISK_EDGE: u8 = 1;
const RISK_KNIFE: u8 = 2;

#[derive(Clone, Copy, Debug)]
enum FaultlineError {
    InvalidInstruction = 6000,
    MissingSignature,
    InvalidPda,
    InvalidAuthority,
    InvalidRoomState,
    RoomAlreadyInitialized,
    InvalidRoomStatus,
    JoinClosed,
    DuplicateJoin,
    PlayerNotFound,
    InvalidPlayerState,
    ForecastInvalid,
    InvalidZone,
    InvalidRiskBand,
    CommitHashMismatch,
    CommitPhaseNotReady,
    RevealPhaseNotReady,
    ResolveNotReady,
    NothingToClaim,
    AlreadyClaimed,
    InsufficientPlayers,
    ArithmeticOverflow,
    EmergencyDisabled,
    InvalidSystemProgram,
}

impl From<FaultlineError> for ProgramError {
    fn from(value: FaultlineError) -> Self {
        ProgramError::Custom(value as u32)
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct RoomState {
    pub version: u8,
    pub room_bump: u8,
    pub vault_bump: u8,
    pub status: u8,
    pub zone_count: u8,
    pub min_players: u8,
    pub max_players: u8,
    pub player_count: u8,
    pub committed_count: u8,
    pub revealed_count: u8,
    pub active_count: u8,
    pub winner_count: u8,
    pub preset_id: u8,
    pub flags: u8,
    pub stake_lamports: u64,
    pub total_staked_lamports: u64,
    pub distributable_lamports: u64,
    pub reserve_fee_lamports: u64,
    pub slashed_to_reserve_lamports: u64,
    pub created_slot: u64,
    pub join_deadline_slot: u64,
    pub commit_duration_slots: u64,
    pub commit_deadline_slot: u64,
    pub reveal_duration_slots: u64,
    pub reveal_deadline_slot: u64,
    pub resolve_slot: u64,
    pub creator: [u8; 32],
    pub vault: [u8; 32],
    pub reserve: [u8; 32],
    pub treasury: [u8; 32],
    pub room_seed: [u8; 32],
    pub final_histogram: [u8; 5],
    pub winner_indices: [u8; 4],
    pub payout_bps: [u16; 4],
    pub player_keys: [[u8; 32]; MAX_PLAYERS],
    pub player_status: [u8; MAX_PLAYERS],
    pub player_claimed: [u8; MAX_PLAYERS],
    pub player_zone: [u8; MAX_PLAYERS],
    pub player_risk: [u8; MAX_PLAYERS],
    pub player_commit_hashes: [[u8; 32]; MAX_PLAYERS],
    pub player_forecasts: [[u8; 5]; MAX_PLAYERS],
    pub player_errors: [u16; MAX_PLAYERS],
    pub player_scores_bps: [u32; MAX_PLAYERS],
    pub player_rewards_lamports: [u64; MAX_PLAYERS],
}

impl RoomState {
    pub fn new(
        room_bump: u8,
        vault_bump: u8,
        creator: &Pubkey,
        vault: &Pubkey,
        reserve: &Pubkey,
        room_seed: [u8; 32],
        stake_lamports: u64,
        min_players: u8,
        max_players: u8,
        preset_id: u8,
        created_slot: u64,
        join_deadline_slot: u64,
        commit_duration_slots: u64,
        reveal_duration_slots: u64,
    ) -> Self {
        let (winner_count, payout_bps) = get_payout_ladder(max_players as usize);
        Self {
            version: 1,
            room_bump,
            vault_bump,
            status: ROOM_OPEN,
            zone_count: ZONE_COUNT as u8,
            min_players,
            max_players,
            player_count: 0,
            committed_count: 0,
            revealed_count: 0,
            active_count: 0,
            winner_count,
            preset_id,
            flags: 0,
            stake_lamports,
            total_staked_lamports: 0,
            distributable_lamports: 0,
            reserve_fee_lamports: 0,
            slashed_to_reserve_lamports: 0,
            created_slot,
            join_deadline_slot,
            commit_duration_slots,
            commit_deadline_slot: 0,
            reveal_duration_slots,
            reveal_deadline_slot: 0,
            resolve_slot: 0,
            creator: creator.to_bytes(),
            vault: vault.to_bytes(),
            reserve: reserve.to_bytes(),
            treasury: TREASURY_PUBKEY.to_bytes(),
            room_seed,
            final_histogram: [0; 5],
            winner_indices: [u8::MAX; 4],
            payout_bps,
            player_keys: [EMPTY_KEY; MAX_PLAYERS],
            player_status: [0; MAX_PLAYERS],
            player_claimed: [0; MAX_PLAYERS],
            player_zone: [0; MAX_PLAYERS],
            player_risk: [0; MAX_PLAYERS],
            player_commit_hashes: [[0u8; 32]; MAX_PLAYERS],
            player_forecasts: [[0u8; 5]; MAX_PLAYERS],
            player_errors: [0; MAX_PLAYERS],
            player_scores_bps: [0; MAX_PLAYERS],
            player_rewards_lamports: [0; MAX_PLAYERS],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct ProfileState {
    pub version: u8,
    pub bump: u8,
    pub flags: u16,
    pub owner: [u8; 32],
    pub games_joined: u32,
    pub games_committed: u32,
    pub games_revealed: u32,
    pub games_resolved: u32,
    pub games_won: u32,
    pub top1_count: u32,
    pub top2_count: u32,
    pub top3_count: u32,
    pub calm_count: u32,
    pub edge_count: u32,
    pub knife_count: u32,
    pub knife_hits: u32,
    pub commit_timeout_count: u16,
    pub reveal_timeout_count: u16,
    pub cumulative_abs_error: u64,
    pub cumulative_profit_lamports: i64,
    pub last_free_access_slot: u64,
    pub last_game_slot: u64,
    pub reserved: [u8; 16],
}

impl ProfileState {
    pub fn new(owner: &Pubkey, bump: u8) -> Self {
        Self {
            version: 1,
            bump,
            flags: 0,
            owner: owner.to_bytes(),
            games_joined: 0,
            games_committed: 0,
            games_revealed: 0,
            games_resolved: 0,
            games_won: 0,
            top1_count: 0,
            top2_count: 0,
            top3_count: 0,
            calm_count: 0,
            edge_count: 0,
            knife_count: 0,
            knife_hits: 0,
            commit_timeout_count: 0,
            reveal_timeout_count: 0,
            cumulative_abs_error: 0,
            cumulative_profit_lamports: 0,
            last_free_access_slot: 0,
            last_game_slot: 0,
            reserved: [0; 16],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct ReserveState {
    pub version: u8,
    pub bump: u8,
    pub paused: bool,
    pub free_access_enabled: bool,
    pub total_collected_lamports: u64,
    pub total_distributed_lamports: u64,
    pub anti_grief_collected_lamports: u64,
    pub reveal_timeout_collected_lamports: u64,
    pub free_access_distributed_lamports: u64,
    pub authority: [u8; 32],
}

impl ReserveState {
    pub fn new(authority: &Pubkey, bump: u8) -> Self {
        Self {
            version: 1,
            bump,
            paused: false,
            free_access_enabled: false,
            total_collected_lamports: 0,
            total_distributed_lamports: 0,
            anti_grief_collected_lamports: 0,
            reveal_timeout_collected_lamports: 0,
            free_access_distributed_lamports: 0,
            authority: authority.to_bytes(),
        }
    }
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (&tag, rest) = instruction_data
        .split_first()
        .ok_or(FaultlineError::InvalidInstruction)?;

    match tag {
        0 => process_init_room(program_id, accounts, rest),
        1 => process_join_room(program_id, accounts),
        2 => process_submit_commit(program_id, accounts, rest),
        3 => process_reveal_decision(program_id, accounts, rest),
        4 => process_resolve_game(program_id, accounts),
        5 => process_claim_reward(program_id, accounts),
        6 => process_force_timeout(program_id, accounts),
        7 => process_cancel_expired_room(program_id, accounts),
        8 => Err(FaultlineError::EmergencyDisabled.into()),
        9 => process_close_room(program_id, accounts),
        _ => Err(FaultlineError::InvalidInstruction.into()),
    }
}

fn process_init_room(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let creator = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let reserve_ai = next_account_info(&mut iter)?;
    let system_program_ai = next_account_info(&mut iter)?;

    require_signer(creator)?;
    require_system_program(system_program_ai)?;

    let room_seed = take_32(&mut input)?;
    let stake_lamports = take_u64(&mut input)?;
    let min_players = take_u8(&mut input)?;
    let max_players = take_u8(&mut input)?;
    let join_window_slots = take_u64(&mut input)?;
    let commit_window_slots = take_u64(&mut input)?;
    let reveal_window_slots = take_u64(&mut input)?;
    let preset_id = take_u8(&mut input)?;

    if stake_lamports == 0 || min_players < 2 || min_players > max_players || max_players as usize > MAX_PLAYERS {
        return Err(FaultlineError::InvalidRoomState.into());
    }

    let (expected_room, room_bump) = Pubkey::find_program_address(&[ROOM_SEED_PREFIX, &room_seed], program_id);
    if expected_room != *room_state_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    let (expected_vault, vault_bump) = Pubkey::find_program_address(&[VAULT_SEED_PREFIX, room_state_ai.key.as_ref()], program_id);
    if expected_vault != *vault_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    let (expected_reserve, reserve_bump) = Pubkey::find_program_address(&[RESERVE_SEED_PREFIX], program_id);
    if expected_reserve != *reserve_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    if room_state_ai.lamports() > 0 {
        return Err(FaultlineError::RoomAlreadyInitialized.into());
    }

    create_pda_account(
        creator,
        room_state_ai,
        system_program_ai,
        program_id,
        ROOM_STATE_SIZE,
        &[ROOM_SEED_PREFIX, &room_seed, &[room_bump]],
    )?;

    create_pda_account(
        creator,
        vault_ai,
        system_program_ai,
        program_id,
        0,
        &[VAULT_SEED_PREFIX, room_state_ai.key.as_ref(), &[vault_bump]],
    )?;

    if reserve_ai.lamports() == 0 {
        create_pda_account(
            creator,
            reserve_ai,
            system_program_ai,
            program_id,
            RESERVE_STATE_SIZE,
            &[RESERVE_SEED_PREFIX, &[reserve_bump]],
        )?;
        let reserve = ReserveState::new(creator.key, reserve_bump);
        store_state(&reserve, reserve_ai)?;
    } else {
        verify_reserve(program_id, reserve_ai)?;
        let reserve: ReserveState = load_state(reserve_ai)?;
        if reserve.authority != creator.key.to_bytes() {
            return Err(FaultlineError::InvalidAuthority.into());
        }
    }

    let slot = Clock::get()?.slot;
    let room = RoomState::new(
        room_bump,
        vault_bump,
        creator.key,
        vault_ai.key,
        reserve_ai.key,
        room_seed,
        stake_lamports,
        min_players,
        max_players,
        preset_id,
        slot,
        slot.checked_add(join_window_slots).ok_or(FaultlineError::ArithmeticOverflow)?,
        commit_window_slots,
        reveal_window_slots,
    );
    store_state(&room, room_state_ai)?;
    msg!("RoomInitialized");
    Ok(())
}

fn process_join_room(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let profile_ai = next_account_info(&mut iter)?;
    let system_program_ai = next_account_info(&mut iter)?;

    require_signer(player)?;
    require_system_program(system_program_ai)?;
    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;

    let slot = Clock::get()?.slot;
    if room.status != ROOM_OPEN || slot > room.join_deadline_slot {
        return Err(FaultlineError::JoinClosed.into());
    }
    if room.player_count as usize >= room.max_players as usize {
        return Err(FaultlineError::JoinClosed.into());
    }
    if find_player_index(&room, player.key).is_some() {
        return Err(FaultlineError::DuplicateJoin.into());
    }

    let (expected_profile, profile_bump) = Pubkey::find_program_address(&[PROFILE_SEED_PREFIX, player.key.as_ref()], program_id);
    if expected_profile != *profile_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    if profile_ai.lamports() == 0 {
        create_pda_account(
            player,
            profile_ai,
            system_program_ai,
            program_id,
            PROFILE_STATE_SIZE,
            &[PROFILE_SEED_PREFIX, player.key.as_ref(), &[profile_bump]],
        )?;
        let profile = ProfileState::new(player.key, profile_bump);
        store_state(&profile, profile_ai)?;
    }

    let mut profile: ProfileState = load_state(profile_ai)?;
    invoke(
        &system_instruction::transfer(player.key, vault_ai.key, room.stake_lamports),
        &[player.clone(), vault_ai.clone(), system_program_ai.clone()],
    )?;

    let index = room.player_count as usize;
    room.player_keys[index] = player.key.to_bytes();
    room.player_status[index] = PLAYER_JOINED;
    room.player_claimed[index] = 0;
    room.player_count += 1;
    room.total_staked_lamports = room
        .total_staked_lamports
        .checked_add(room.stake_lamports)
        .ok_or(FaultlineError::ArithmeticOverflow)?;

    if room.status == ROOM_OPEN && room.player_count >= room.min_players && room.committed_count > 0 && room.commit_deadline_slot == 0 {
        room.status = ROOM_COMMIT;
        room.commit_deadline_slot = slot
            .checked_add(room.commit_duration_slots)
            .ok_or(FaultlineError::ArithmeticOverflow)?;
    }

    profile.games_joined = profile.games_joined.saturating_add(1);
    profile.last_game_slot = slot;
    store_state(&profile, profile_ai)?;
    store_state(&room, room_state_ai)?;
    msg!("PlayerJoined");
    Ok(())
}

fn process_submit_commit(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let profile_ai = next_account_info(&mut iter)?;

    require_signer(player)?;
    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    let (expected_profile, _) = Pubkey::find_program_address(&[PROFILE_SEED_PREFIX, player.key.as_ref()], program_id);
    if expected_profile != *profile_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }
    let mut profile: ProfileState = load_state(profile_ai)?;
    let commit_hash = take_32(&mut input)?;
    let index = find_player_index(&room, player.key).ok_or(FaultlineError::PlayerNotFound)?;
    let slot = Clock::get()?.slot;

    if room.status == ROOM_OPEN && slot > room.join_deadline_slot && room.player_count < room.min_players {
        return Err(FaultlineError::JoinClosed.into());
    }

    if room.status != ROOM_OPEN && room.status != ROOM_COMMIT {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }
    if room.status == ROOM_COMMIT && slot > room.commit_deadline_slot {
        return Err(FaultlineError::CommitPhaseNotReady.into());
    }
    if room.player_status[index] != PLAYER_JOINED {
        return Err(FaultlineError::InvalidPlayerState.into());
    }

    room.player_commit_hashes[index] = commit_hash;
    room.player_status[index] = PLAYER_COMMITTED;
    room.committed_count = room.committed_count.saturating_add(1);
    profile.games_committed = profile.games_committed.saturating_add(1);

    if room.status == ROOM_OPEN && room.player_count >= room.min_players {
        room.status = ROOM_COMMIT;
        if room.commit_deadline_slot == 0 {
            room.commit_deadline_slot = slot
                .checked_add(room.commit_duration_slots)
                .ok_or(FaultlineError::ArithmeticOverflow)?;
        }
    }

    if room.status == ROOM_COMMIT && room.committed_count == room.player_count {
        room.status = ROOM_REVEAL;
        room.reveal_deadline_slot = slot
            .checked_add(room.reveal_duration_slots)
            .ok_or(FaultlineError::ArithmeticOverflow)?;
    }

    store_state(&profile, profile_ai)?;
    store_state(&room, room_state_ai)?;
    msg!("CommitSubmitted");
    Ok(())
}

fn process_reveal_decision(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let profile_ai = next_account_info(&mut iter)?;

    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    let (expected_profile, _) = Pubkey::find_program_address(&[PROFILE_SEED_PREFIX, player.key.as_ref()], program_id);
    if expected_profile != *profile_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }
    let mut profile: ProfileState = load_state(profile_ai)?;
    let zone = take_u8(&mut input)?;
    let risk_band = take_u8(&mut input)?;
    let forecast = take_5(&mut input)?;
    let nonce = take_32(&mut input)?;

    if zone as usize >= ZONE_COUNT {
        return Err(FaultlineError::InvalidZone.into());
    }
    if risk_band > RISK_KNIFE {
        return Err(FaultlineError::InvalidRiskBand.into());
    }
    if !forecast_is_valid(&forecast, room.min_players, room.max_players) {
        return Err(FaultlineError::ForecastInvalid.into());
    }
    if nonce == [0u8; 32] {
        return Err(FaultlineError::InvalidInstruction.into());
    }

    if room.status == ROOM_COMMIT {
        if room.committed_count != room.player_count {
            return Err(FaultlineError::RevealPhaseNotReady.into());
        }
        room.status = ROOM_REVEAL;
        if room.reveal_deadline_slot == 0 {
            room.reveal_deadline_slot = Clock::get()?
                .slot
                .checked_add(room.reveal_duration_slots)
                .ok_or(FaultlineError::ArithmeticOverflow)?;
        }
    }

    if room.status != ROOM_REVEAL || Clock::get()?.slot > room.reveal_deadline_slot {
        return Err(FaultlineError::RevealPhaseNotReady.into());
    }

    let index = find_player_index(&room, player.key).ok_or(FaultlineError::PlayerNotFound)?;
    if room.player_status[index] != PLAYER_COMMITTED {
        return Err(FaultlineError::InvalidPlayerState.into());
    }

    let expected_commit = build_commit_hash(room_state_ai.key, player.key, zone, risk_band, &forecast, &nonce);
    if room.player_commit_hashes[index] != expected_commit {
        return Err(FaultlineError::CommitHashMismatch.into());
    }

    room.player_zone[index] = zone;
    room.player_risk[index] = risk_band;
    room.player_forecasts[index] = forecast;
    room.player_status[index] = PLAYER_REVEALED;
    room.revealed_count = room.revealed_count.saturating_add(1);
    room.active_count = room.revealed_count;

    match risk_band {
        RISK_CALM => profile.calm_count = profile.calm_count.saturating_add(1),
        RISK_EDGE => profile.edge_count = profile.edge_count.saturating_add(1),
        _ => profile.knife_count = profile.knife_count.saturating_add(1),
    }
    profile.games_revealed = profile.games_revealed.saturating_add(1);

    store_state(&profile, profile_ai)?;
    store_state(&room, room_state_ai)?;
    msg!("DecisionRevealed");
    Ok(())
}

fn process_force_timeout(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let _caller = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let reserve_ai = next_account_info(&mut iter)?;

    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    verify_reserve(program_id, reserve_ai)?;
    let mut reserve: ReserveState = load_state(reserve_ai)?;
    let slot = Clock::get()?.slot;

    match room.status {
        ROOM_COMMIT => {
            if slot <= room.commit_deadline_slot || room.commit_deadline_slot == 0 {
                return Err(FaultlineError::CommitPhaseNotReady.into());
            }

            let mut slashed: u64 = 0;
            let mut active_after_timeout: u8 = 0;
            for index in 0..room.player_count as usize {
                if room.player_status[index] == PLAYER_JOINED {
                    room.player_status[index] = PLAYER_COMMIT_TIMED_OUT;
                    room.player_rewards_lamports[index] = room.stake_lamports / 2;
                    slashed = slashed
                        .checked_add(room.stake_lamports / 2)
                        .ok_or(FaultlineError::ArithmeticOverflow)?;
                }
                if room.player_status[index] == PLAYER_COMMITTED {
                    active_after_timeout = active_after_timeout.saturating_add(1);
                }
            }

            if slashed > 0 {
                move_lamports(vault_ai, reserve_ai, slashed)?;
                reserve.total_collected_lamports = reserve.total_collected_lamports.saturating_add(slashed);
                reserve.anti_grief_collected_lamports = reserve.anti_grief_collected_lamports.saturating_add(slashed);
                room.slashed_to_reserve_lamports = room.slashed_to_reserve_lamports.saturating_add(slashed);
            }

            room.active_count = active_after_timeout;
            if active_after_timeout < room.min_players {
                room.status = ROOM_CANCELLED;
                for index in 0..room.player_count as usize {
                    if room.player_status[index] == PLAYER_COMMITTED {
                        room.player_rewards_lamports[index] = room.stake_lamports;
                    }
                }
            } else {
                room.status = ROOM_REVEAL;
                room.reveal_deadline_slot = slot
                    .checked_add(room.reveal_duration_slots)
                    .ok_or(FaultlineError::ArithmeticOverflow)?;
            }
        }
        ROOM_REVEAL => {
            if slot <= room.reveal_deadline_slot || room.reveal_deadline_slot == 0 {
                return Err(FaultlineError::RevealPhaseNotReady.into());
            }

            let mut slashed: u64 = 0;
            let mut active_after_timeout: u8 = 0;
            for index in 0..room.player_count as usize {
                if room.player_status[index] == PLAYER_COMMITTED {
                    room.player_status[index] = PLAYER_REVEAL_TIMED_OUT;
                    let reserve_cut = room.stake_lamports / 4;
                    slashed = slashed.checked_add(reserve_cut).ok_or(FaultlineError::ArithmeticOverflow)?;
                }
                if room.player_status[index] == PLAYER_REVEALED {
                    active_after_timeout = active_after_timeout.saturating_add(1);
                }
            }

            if slashed > 0 {
                move_lamports(vault_ai, reserve_ai, slashed)?;
                reserve.total_collected_lamports = reserve.total_collected_lamports.saturating_add(slashed);
                reserve.reveal_timeout_collected_lamports = reserve.reveal_timeout_collected_lamports.saturating_add(slashed);
                room.slashed_to_reserve_lamports = room.slashed_to_reserve_lamports.saturating_add(slashed);
            }

            room.active_count = active_after_timeout;
            if active_after_timeout == 0 {
                room.status = ROOM_CANCELLED;
            }
        }
        _ => return Err(FaultlineError::InvalidRoomStatus.into()),
    }

    store_state(&reserve, reserve_ai)?;
    store_state(&room, room_state_ai)?;
    msg!("TimeoutForced");
    Ok(())
}

fn process_resolve_game(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let _caller = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let reserve_ai = next_account_info(&mut iter)?;
    let treasury_ai = next_account_info(&mut iter)?;

    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    verify_reserve(program_id, reserve_ai)?;
    verify_treasury(treasury_ai, &room)?;

    if room.status != ROOM_REVEAL {
        return Err(FaultlineError::ResolveNotReady.into());
    }

    if Clock::get()?.slot > room.reveal_deadline_slot {
        for index in 0..room.player_count as usize {
            if room.player_status[index] == PLAYER_COMMITTED {
                return Err(FaultlineError::ResolveNotReady.into());
            }
        }
    }

    let mut active_indices = [u8::MAX; MAX_PLAYERS];
    let mut active_count = 0usize;
    let mut histogram = [0u8; 5];
    for index in 0..room.player_count as usize {
        if room.player_status[index] == PLAYER_REVEALED {
            active_indices[active_count] = index as u8;
            active_count += 1;
            histogram[room.player_zone[index] as usize] = histogram[room.player_zone[index] as usize].saturating_add(1);
        }
    }

    if active_count == 0 {
        return Err(FaultlineError::InsufficientPlayers.into());
    }

    let locked_refunds = sum_locked_refunds(&room);
    if room.reserve_fee_lamports == 0 {
        let reserve_fee = (room.total_staked_lamports * RESERVE_FEE_BPS) / 10_000;
        if reserve_fee > 0 {
            move_lamports(vault_ai, treasury_ai, reserve_fee)?;
        }
        room.reserve_fee_lamports = reserve_fee;
    }

    room.distributable_lamports = room
        .total_staked_lamports
        .checked_sub(room.reserve_fee_lamports)
        .and_then(|value| value.checked_sub(room.slashed_to_reserve_lamports))
        .and_then(|value| value.checked_sub(locked_refunds))
        .ok_or(FaultlineError::ArithmeticOverflow)?;

    for active_slot in 0..active_count {
        let index = active_indices[active_slot] as usize;
        let error = compute_error(room.player_forecasts[index], histogram);
        let base = core::cmp::max(1u32, (5u32 * active_count as u32).saturating_sub(error as u32));
        let multiplier = risk_multiplier(room.player_risk[index], room.player_zone[index], histogram);
        let score = base.saturating_mul(multiplier as u32);
        room.player_errors[index] = error;
        room.player_scores_bps[index] = score;
    }

    sort_active_indices(&room, &mut active_indices, active_count, histogram);
    let reward_count = room.winner_count as usize;
    let rewards = compute_rewards(room.distributable_lamports, room.payout_bps);
    for reward_index in 0..reward_count {
        if reward_index >= active_count {
            break;
        }
        let player_index = active_indices[reward_index] as usize;
        room.winner_indices[reward_index] = player_index as u8;
        room.player_rewards_lamports[player_index] = room.player_rewards_lamports[player_index]
            .checked_add(rewards[reward_index])
            .ok_or(FaultlineError::ArithmeticOverflow)?;
    }

    room.final_histogram = histogram;
    room.active_count = active_count as u8;
    room.resolve_slot = Clock::get()?.slot;
    room.status = ROOM_RESOLVED;

    store_state(&room, room_state_ai)?;
    msg!("GameResolved");
    Ok(())
}

fn process_claim_reward(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let _system_program_ai = next_account_info(&mut iter)?;

    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    if room.status != ROOM_RESOLVED && room.status != ROOM_CANCELLED && room.status != ROOM_EMERGENCY {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }

    let index = find_player_index(&room, player.key).ok_or(FaultlineError::PlayerNotFound)?;
    if room.player_claimed[index] == 1 {
        return Err(FaultlineError::AlreadyClaimed.into());
    }
    let amount = room.player_rewards_lamports[index];
    if amount == 0 {
        return Err(FaultlineError::NothingToClaim.into());
    }

    move_lamports(vault_ai, player, amount)?;
    room.player_rewards_lamports[index] = 0;
    room.player_claimed[index] = 1;
    store_state(&room, room_state_ai)?;
    msg!("RewardClaimed");
    Ok(())
}

fn process_cancel_expired_room(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let _caller = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let _vault_ai = next_account_info(&mut iter)?;

    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    if room.status != ROOM_OPEN || Clock::get()?.slot <= room.join_deadline_slot || room.player_count >= room.min_players {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }

    room.status = ROOM_CANCELLED;
    for index in 0..room.player_count as usize {
        if room.player_status[index] == PLAYER_JOINED || room.player_status[index] == PLAYER_COMMITTED {
            room.player_rewards_lamports[index] = room.stake_lamports;
        }
    }

    store_state(&room, room_state_ai)?;
    msg!("RoomCancelled");
    Ok(())
}

fn process_close_room(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let recipient = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;

    require_signer(recipient)?;
    let mut room: RoomState = load_state(room_state_ai)?;
    verify_room_ownership(program_id, room_state_ai, &room)?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;

    if room.status != ROOM_RESOLVED && room.status != ROOM_CANCELLED && room.status != ROOM_EMERGENCY {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }
    if room.player_rewards_lamports.iter().any(|value| *value > 0) {
        return Err(FaultlineError::ResolveNotReady.into());
    }

    room.status = ROOM_CLOSED;
    store_state(&room, room_state_ai)?;
    close_account(vault_ai, recipient)?;
    close_account(room_state_ai, recipient)?;
    msg!("RoomClosed");
    Ok(())
}

fn require_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        return Err(FaultlineError::MissingSignature.into());
    }
    Ok(())
}

fn require_system_program(account: &AccountInfo) -> ProgramResult {
    if *account.key != system_program::ID {
        return Err(FaultlineError::InvalidSystemProgram.into());
    }
    Ok(())
}

fn create_pda_account<'a>(
    payer: &AccountInfo<'a>,
    account: &AccountInfo<'a>,
    system_program_ai: &AccountInfo<'a>,
    owner: &Pubkey,
    space: usize,
    seeds: &[&[u8]],
) -> ProgramResult {
    if account.lamports() > 0 {
        return Ok(());
    }

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);
    solana_program::program::invoke_signed(
        &system_instruction::create_account(payer.key, account.key, lamports, space as u64, owner),
        &[payer.clone(), account.clone(), system_program_ai.clone()],
        &[seeds],
    )?;
    Ok(())
}

fn verify_room_ownership(program_id: &Pubkey, room_ai: &AccountInfo, room: &RoomState) -> ProgramResult {
    if room_ai.owner != program_id || room.version != 1 {
        return Err(FaultlineError::InvalidRoomState.into());
    }
    Ok(())
}

fn verify_vault(program_id: &Pubkey, room_key: &Pubkey, vault_ai: &AccountInfo, vault_bump: u8) -> ProgramResult {
    let expected = Pubkey::create_program_address(&[VAULT_SEED_PREFIX, room_key.as_ref(), &[vault_bump]], program_id)
        .map_err(|_| FaultlineError::InvalidPda)?;
    if expected != *vault_ai.key || vault_ai.owner != program_id {
        return Err(FaultlineError::InvalidPda.into());
    }
    Ok(())
}

fn verify_reserve(program_id: &Pubkey, reserve_ai: &AccountInfo) -> ProgramResult {
    let (expected, _) = Pubkey::find_program_address(&[RESERVE_SEED_PREFIX], program_id);
    if expected != *reserve_ai.key || reserve_ai.owner != program_id {
        return Err(FaultlineError::InvalidPda.into());
    }
    Ok(())
}

fn verify_treasury(treasury_ai: &AccountInfo, room: &RoomState) -> ProgramResult {
    if treasury_ai.key.to_bytes() != room.treasury || *treasury_ai.key != TREASURY_PUBKEY {
        return Err(FaultlineError::InvalidPda.into());
    }
    Ok(())
}

fn load_state<T: BorshDeserialize>(account: &AccountInfo) -> Result<T, ProgramError> {
    let data = account.try_borrow_data()?;
    T::try_from_slice(&data).map_err(|_| FaultlineError::InvalidRoomState.into())
}

fn store_state<T: BorshSerialize>(value: &T, account: &AccountInfo) -> ProgramResult {
    let mut data = account.try_borrow_mut_data()?;
    value.serialize(&mut &mut data[..]).map_err(|_| FaultlineError::InvalidRoomState.into())
}

fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> ProgramResult {
    if amount == 0 {
        return Ok(());
    }
    **from.try_borrow_mut_lamports()? = from
        .lamports()
        .checked_sub(amount)
        .ok_or(FaultlineError::ArithmeticOverflow)?;
    **to.try_borrow_mut_lamports()? = to
        .lamports()
        .checked_add(amount)
        .ok_or(FaultlineError::ArithmeticOverflow)?;
    Ok(())
}

fn close_account(account: &AccountInfo, recipient: &AccountInfo) -> ProgramResult {
    let amount = account.lamports();
    if amount > 0 {
        move_lamports(account, recipient, amount)?;
    }
    let mut data = account.try_borrow_mut_data()?;
    data.fill(0);
    Ok(())
}

fn find_player_index(room: &RoomState, player: &Pubkey) -> Option<usize> {
    let key_bytes = player.to_bytes();
    (0..room.player_count as usize).find(|index| room.player_keys[*index] == key_bytes)
}

fn forecast_is_valid(forecast: &[u8; 5], min_players: u8, max_players: u8) -> bool {
    let total: u16 = forecast.iter().map(|value| *value as u16).sum();
    total >= min_players as u16 && total <= max_players as u16
}

fn build_commit_hash(
    room: &Pubkey,
    player: &Pubkey,
    zone: u8,
    risk_band: u8,
    forecast: &[u8; 5],
    nonce: &[u8; 32],
) -> [u8; 32] {
    hashv(&[
        COMMIT_DOMAIN,
        room.as_ref(),
        player.as_ref(),
        &[zone],
        &[risk_band],
        forecast,
        nonce,
    ])
    .to_bytes()
}

fn compute_error(forecast: [u8; 5], histogram: [u8; 5]) -> u16 {
    let mut total = 0u16;
    for zone in 0..ZONE_COUNT {
        total = total.saturating_add((forecast[zone] as i16 - histogram[zone] as i16).unsigned_abs());
    }
    total
}

fn risk_multiplier(risk_band: u8, zone: u8, histogram: [u8; 5]) -> u16 {
    match risk_band {
        RISK_CALM => 10_000,
        RISK_EDGE => {
            let mut sorted = histogram;
            sorted.sort_unstable();
            if histogram[zone as usize] <= sorted[1] {
                15_500
            } else {
                2_500
            }
        }
        _ => {
            let minimum = *histogram.iter().min().unwrap_or(&0);
            if histogram[zone as usize] == minimum {
                24_000
            } else {
                0
            }
        }
    }
}

fn get_payout_ladder(max_players: usize) -> (u8, [u16; 4]) {
    if max_players <= 4 {
        (2, [9000, 800, 0, 0])
    } else if max_players <= 24 {
        (3, [7200, 1800, 800, 0])
    } else {
        (4, [6400, 2000, 1000, 400])
    }
}

fn sum_locked_refunds(room: &RoomState) -> u64 {
    let mut total = 0u64;
    for index in 0..room.player_count as usize {
        if room.player_status[index] != PLAYER_REVEALED {
            total = total.saturating_add(room.player_rewards_lamports[index]);
        }
    }
    total
}

fn compute_rewards(distributable_lamports: u64, payout_bps: [u16; 4]) -> [u64; 4] {
    let mut rewards = [0u64; 4];
    let mut remainder = distributable_lamports;
    for index in 0..MAX_WINNERS {
        if payout_bps[index] == 0 {
            continue;
        }
        rewards[index] = distributable_lamports.saturating_mul(payout_bps[index] as u64) / 10_000;
        remainder = remainder.saturating_sub(rewards[index]);
    }
    rewards[0] = rewards[0].saturating_add(remainder);
    rewards
}

fn sort_active_indices(room: &RoomState, active_indices: &mut [u8; MAX_PLAYERS], active_count: usize, histogram: [u8; 5]) {
    for left in 0..active_count {
        for right in (left + 1)..active_count {
            let lhs = active_indices[left] as usize;
            let rhs = active_indices[right] as usize;
            if player_should_rank_after(room, lhs, rhs, histogram) {
                active_indices.swap(left, right);
            }
        }
    }
}

fn player_should_rank_after(room: &RoomState, lhs: usize, rhs: usize, histogram: [u8; 5]) -> bool {
    if room.player_scores_bps[lhs] != room.player_scores_bps[rhs] {
        return room.player_scores_bps[lhs] < room.player_scores_bps[rhs];
    }
    if room.player_errors[lhs] != room.player_errors[rhs] {
        return room.player_errors[lhs] > room.player_errors[rhs];
    }

    let lhs_occupancy = histogram[room.player_zone[lhs] as usize];
    let rhs_occupancy = histogram[room.player_zone[rhs] as usize];
    if lhs_occupancy != rhs_occupancy {
        return lhs_occupancy > rhs_occupancy;
    }
    if room.player_risk[lhs] != room.player_risk[rhs] {
        return room.player_risk[lhs] < room.player_risk[rhs];
    }
    room.player_keys[lhs] > room.player_keys[rhs]
}

fn take_u8(input: &mut &[u8]) -> Result<u8, ProgramError> {
    let (&value, rest) = input.split_first().ok_or(FaultlineError::InvalidInstruction)?;
    *input = rest;
    Ok(value)
}

fn take_u64(input: &mut &[u8]) -> Result<u64, ProgramError> {
    let bytes = take_n::<8>(input)?;
    Ok(u64::from_le_bytes(bytes))
}

fn take_32(input: &mut &[u8]) -> Result<[u8; 32], ProgramError> {
    take_n::<32>(input)
}

fn take_5(input: &mut &[u8]) -> Result<[u8; 5], ProgramError> {
    take_n::<5>(input)
}

fn take_n<const N: usize>(input: &mut &[u8]) -> Result<[u8; N], ProgramError> {
    if input.len() < N {
        return Err(FaultlineError::InvalidInstruction.into());
    }
    let (head, rest) = input.split_at(N);
    let mut output = [0u8; N];
    output.copy_from_slice(head);
    *input = rest;
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commit_hash_matches_reference_vector_shape() {
        let room = Pubkey::new_from_array([1u8; 32]);
        let player = Pubkey::new_from_array([2u8; 32]);
        let forecast = [3, 4, 5, 2, 6];
        let nonce = [7u8; 32];
        let hash = build_commit_hash(&room, &player, 2, 1, &forecast, &nonce);

        assert_eq!(hash.len(), 32);
        assert_ne!(hash, [0u8; 32]);
    }
}