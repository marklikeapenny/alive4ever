const HotPocket = require("hotpocket-js-client");
const { createHash } = require("crypto");

function keepCpuBusy(iterations, length) {
    // The sole purpose of this function is to keep the CPU busy for some time.
    // It repeatedly creates some random string and calculates a SHA256 hash for it.

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < iterations; i++) {
        let randomString = "";

        for (let c = 0; c < length; c++)
            randomString += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );

        createHash("sha256").update(randomString).digest("hex");
    }
}

async function startBenchmark() {
    // Now keep that CPU busy and record how long it takes to complete the task.
    const start = process.hrtime.bigint();
    keepCpuBusy(100000, 1024);
    const end = process.hrtime.bigint();
    const cpuBenchmarkDurationMs = (end - start) / BigInt(1000000);

    // Feed results back into smart contract.
    const benchmarkId = process.argv[2];
    const nodeUrls = process.argv[3].split(",");
    const pubKeyOfBenchmarkedNode = process.argv[4];
    const requestingUserPubKey = process.argv[5];
    const userKeyPair = await HotPocket.generateKeys(); // consider argv set by sc for security

    const client = await HotPocket.createClient(nodeUrls, userKeyPair);
    if (!(await client.connect()))
        throw new Error("Unable to connect to smart contract.");

    for (let x = 1; x < 10; x++) await client.submitContractInput("WARMUP" + x);
    await client.submitContractInput(
        `RESULT;${benchmarkId};${pubKeyOfBenchmarkedNode};${requestingUserPubKey};${cpuBenchmarkDurationMs.toString()}`
    );
    for (let x = 10; x < 20; x++)
        await client.submitContractInput("COOLDOWN" + x);
    await client.close();
}

// Called from smart contract: node <benchmarkAppScriptFile> <benchmarkId> <nodeUrls> <pubKeyOfBenchmarkedNode> <requestingUserPubKey>
startBenchmark();
