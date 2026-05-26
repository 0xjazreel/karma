// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {KarmaRegistry}   from "../src/KarmaRegistry.sol";
import {KarmaHook}       from "../src/KarmaHook.sol";
import {IPoolManager}    from "v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner}       from "v4-periphery/src/utils/HookMiner.sol";
import {Hooks}           from "v4-core/src/libraries/Hooks.sol";

contract DeployKarmaProtocol is Script {

    // IMPORTANT: Replace this with the actual V4 PoolManager address on X Layer
    // Ask in the X Layer Builder Hub Telegram for the correct address
    // Check: https://docs.uniswap.org/contracts/v4/deployments
    // If V4 is not on X Layer Mainnet, use testnet (Chain ID: 1952)
    address constant POOL_MANAGER = 0x0000000000000000000000000000000000000000;

    function run() external {
        uint256 deployerKey  = vm.envUint("PRIVATE_KEY");
        address agentWallet  = vm.envAddress("AGENT_WALLET");
        address deployer     = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Agent wallet:", agentWallet);
        console.log("PoolManager:", POOL_MANAGER);

        vm.startBroadcast(deployerKey);

        // 1. Deploy KarmaRegistry (agent is the only writer)
        KarmaRegistry registry = new KarmaRegistry(agentWallet);
        console.log("KarmaRegistry deployed at:", address(registry));

        // 2. Mine a valid hook address (V4 requires specific address bits)
        //    beforeSwap flag = bit 7 of the lower byte
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);
        (address hookAddress, bytes32 salt) = HookMiner.find(
            deployer,
            flags,
            type(KarmaHook).creationCode,
            abi.encode(address(POOL_MANAGER), address(registry))
        );
        console.log("Mined hook address:", hookAddress);
        console.log("Salt:", vm.toString(salt));

        // 3. Deploy KarmaHook at the mined address using CREATE2
        KarmaHook hook = new KarmaHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            address(registry)
        );
        require(address(hook) == hookAddress, "Hook address mismatch");
        console.log("KarmaHook deployed at:", address(hook));

        vm.stopBroadcast();

        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("KarmaRegistry:", address(registry));
        console.log("KarmaHook:    ", address(hook));
        console.log("Save these addresses in your .env and agent config.");
    }
}
