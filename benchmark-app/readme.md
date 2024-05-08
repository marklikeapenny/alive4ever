# PoC CPU Benchmark App

## Description

This app is part of a multi-project Proof of Concept (PoC), designed to demonstrate some of the capabilities of the [Evernode](https://evernode.org/) Consensus as a Service Smart Contract solution.

On itself it's a simple Node.js application that measures the time it takes to execute a CPU-intensive task. The underlying idea is that more powerful CPUs should be able to complete this task quicker than less powerful CPUs.

The app repeatedly creates a random string of a specified size and calculates its SHA256 hash. The time it takes to complete this process is measured in milliseconds. Finally, the results are fed back into the accompanying Evernode smart contract, so they can be reported back to the client application.

While this simple CPU benchmark was chosen as an example application, it is not the actual focus of the PoC. The main purpose is to demonstrate how an Evernode contract can spawn this app as a detached process alongside the cyclically executed smart contract, running in parallel as a long-running process.

## Usage

The smart contract will spawn a detached NodeJS process to execute this script within a HotPocket instace. For successful operation the smart contract will need to some arguments:

-   `argv[2]` = A unique ID to identify a single benchmark run.
-   `argv[3]` = URLs of smart contract nodes that can be used to report back the results of the benchmark-app.
-   `argv[4]` = Public Key of the HotPocket instance that got benchmarked.
-   `argv[5]` = Public key of user that requested the benchmark.

## Reporting of Benchmark Result

The app will try to connect to the Evernode smart contract and provide the benchmark results as user input. This input will be a semicolon-seperated string:

```text
    RESULT;<benchmarkId>;<pubKeyOfBenchmarkedNode>;<requestingUserPubKey>;<cpuBenchmarkDurationMs>
```

## Deployment

1. Execute the build script: `npm run prepare`.
2. Verify that the contents of the `dist` directory was successfully copied to the `dist` directory of the `smart-contract` project.
3. Continue to build and deploy the `smart-contract` project.
4. Use `client-app` project to start a CPU benchmark for the UNL nodes of an Evernode cluster and display the results.
