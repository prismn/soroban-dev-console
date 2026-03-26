#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Env};

#[contracttype]
pub enum DataKey {
    Count,
}

#[contract]
pub struct CounterFixture;

#[contractimpl]
impl CounterFixture {
    pub fn get(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Count)
            .unwrap_or(0)
    }

    pub fn set(env: Env, value: u32) {
        env.storage().persistent().set(&DataKey::Count, &value);
    }

    pub fn increment(env: Env) -> u32 {
        let next = Self::get(env.clone()) + 1;
        env.storage().persistent().set(&DataKey::Count, &next);
        next
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn counter_defaults_to_zero() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CounterFixture);
        let client = CounterFixtureClient::new(&env, &contract_id);

        assert_eq!(client.get(), 0);
    }

    #[test]
    fn counter_can_be_set_and_incremented() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CounterFixture);
        let client = CounterFixtureClient::new(&env, &contract_id);

        client.set(&7);
        assert_eq!(client.get(), 7);
        assert_eq!(client.increment(), 8);
        assert_eq!(client.get(), 8);
    }
}
