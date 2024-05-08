const HotPocket = require("hotpocket-nodejs-contract");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BENCHMARK_APP = "benchmark-app.js";

function getNodeJsRuntime() {
    return process.argv[0];
}

function spawnDetachedProcess(executable, params = []) {
    const newProcess = spawn(executable, params, {
        detached: true, // avoid automatic teardown when HotPocket ends a smart contract round
        stdio: "ignore",
    });
    newProcess.unref(); // don't wait for the end of spawned child process
}

function handleInputMessage(ctx, user, message) {
    const msgParts = message.split(";");
    switch (msgParts[0]) {
        case "START":
            // Start of benchmark per instance. (This is the initial request from the client app.)
            spawnDetachedProcess(getNodeJsRuntime(), [
                path.join("../../../seed/state", BENCHMARK_APP),
                msgParts[1], // Unique benchmark ID
                msgParts[2], // Node URLs to be used for reporting benchmark results
                ctx.publicKey,
                user.publicKey,
            ]);

            break;
        case "RESULT":
            // Recording of benchmark results. (This is feedback from an UNL node.)
            const benchmarkId = msgParts[1];
            const pubKeyOfBenchmarkedNode = msgParts[2];

            // group all results for current benchmark inside a directory
            const subDir = "b-" + benchmarkId;
            if (!fs.existsSync(subDir)) fs.mkdirSync(subDir);
            fs.writeFileSync(
                path.join(subDir, pubKeyOfBenchmarkedNode),
                message
            );
            break;
    }
}

function reportCompletedBenchmark(ctx) {
    // Check if there are any pending benchmarks.
    const benchmarkDirectories = fs
        .readdirSync(".", { withFileTypes: true })
        .filter(
            (dirEntry) =>
                dirEntry.isDirectory() && dirEntry.name.startsWith("b-")
        )
        .map((dirEntry) => path.join(".", dirEntry.name));
    if (benchmarkDirectories.length === 0) return;

    benchmarkDirectories.forEach((subDir) => {
        // A pending benchmark is completed once each unl node reported results.
        const benchmarkResultFiles = fs
            .readdirSync(subDir, { withFileTypes: true })
            .filter((dirEntry) => !dirEntry.isDirectory());
        if (benchmarkResultFiles.length === ctx.unl.count()) {
            // Found completed benchmark. Consolidate and report to requesting user.
            const keys = [];
            const benchmarkResults = {};
            benchmarkResultFiles.forEach((dirEntry) => {
                const contents = fs
                    .readFileSync(path.join(dirEntry.path, dirEntry.name))
                    .toString();
                keys.push(dirEntry.name);
                benchmarkResults[dirEntry.name] = contents.split(";");
            });

            let totalTimeMs = 0;
            const consolidatedResult = { unlNodes: [] };
            keys.sort().forEach((k) => {
                consolidatedResult.unlNodes.push({
                    publicKey: benchmarkResults[k][2],
                    benchmarkTimeMs: benchmarkResults[k][4],
                });
                totalTimeMs += parseInt(benchmarkResults[k][4]);
            });
            consolidatedResult["benchmarkId"] = benchmarkResults[keys[0]][1];
            consolidatedResult["averageBenchmarkTimeMs"] = Math.floor(
                totalTimeMs / keys.length
            );
            const userId = benchmarkResults[keys[0]][3];
            const user = ctx.users.find(userId);
            const userOutput =
                "BENCHMARKRESULTS;" + JSON.stringify(consolidatedResult);
            user.send(userOutput);

            // Remove subdirectory of completed benchmark
            fs.rmSync(subDir, { recursive: true });
        }
    });
}

async function contract(ctx) {
    if (!ctx.readonly) {
        // This benchmark by design only supports UNL nodes
        for (const user of ctx.users.list()) {
            for (const input of user.inputs) {
                const buffer = await ctx.users.read(input);
                const message = buffer.toString();
                handleInputMessage(ctx, user, message);
            }
        }
        reportCompletedBenchmark(ctx);
    }
}

const hpc = new HotPocket.Contract();
hpc.init(contract);
