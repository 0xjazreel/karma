// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console}        from "forge-std/Script.sol";
import {IPoolManager}           from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey}                from "v4-core/src/types/PoolKey.sol";
import {Currency}               from "v4-core/src/types/Currency.sol";
import {LPFeeLibrary}           from "v4-core/src/libraries/LPFeeLibrary.sol";
import {IHooks}                 from "v4-core/src/interfaces/IHooks.sol";
import {TickMath}               from "v4-core/src/libraries/TickMath.sol";

contract CreateKarmaPool is Script {
    // TODO: Fill in from deployments.json after running Deploy.s.sol
    address constant POOL_MANAGER = 0x0000000000000000000000000000000000000000;
    address constant KARMA_HOOK   = 0x0000000000000000000000000000000000000000;
    address constant TOKEN0       = 0x0000000000000000000000000000000000000000; // OKB or WOKB
    address constant TOKEN1       = 0x0000000000000000000000000000000000000000; // USDC on X Layer

    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(TOKEN0),
            currency1: Currency.wrap(TOKEN1),
            fee:       LPFeeLibrary.DYNAMIC_FEE_FLAG,  // MUST be dynamic for fee override
            tickSpacing: 60,
            hooks:     IHooks(KARMA_HOOK)
        });

        // Initialize pool at 1:1 price (sqrtPriceX96 = sqrt(1) * 2^96)
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // = 1.0
        IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96, "");
        console.log("Pool initialized with KarmaHook");

        vm.stopBroadcast();
    }
}
