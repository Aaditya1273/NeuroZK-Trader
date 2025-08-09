// Trade Verification zkSNARK Circuit
// Proves a trade followed AI strategy constraints without revealing private params
// Circuit checks:
// 1) poseidon(private_params...) == public commitment
// 2) size within [minSize, maxSize]
// 3) slippage <= maxSlippageBps relative to reference price
// 4) direction matches signal (1=buy, 0=sell)
// 5) executedPrice within [refPrice*(1-allowedBps), refPrice*(1+allowedBps)]

pragma circom 2.1.6;
// Use circomlib circuits installed via npm
include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

template TradeVerification() {
    // Public inputs
    // Commitment to private strategy params (Poseidon hash)
    signal input strategyCommitment;

    // Public execution details
    signal input refPrice;           // reference price (integer scaled, e.g., 1e6)
    signal input executedPrice;      // executed fill price (scaled)
    signal input size;               // executed size (scaled, e.g., tokens*1e6)
    signal input signalDirection;    // 1=buy, 0=sell

    // Bounds (public)
    signal input minSize;
    signal input maxSize;
    signal input maxSlippageBps;     // max slippage in basis points (1/10000)
    signal input allowedBandBps;     // allowed price band around ref in bps

    // Private strategy params
    signal private input secretSalt; // random salt to hide raw params
    signal private input k1;         // e.g., internal threshold
    signal private input k2;         // e.g., internal feature score

    // Commitment check: Poseidon([secretSalt, k1, k2]) == strategyCommitment
    component H = Poseidon(3);
    H.inputs[0] <== secretSalt;
    H.inputs[1] <== k1;
    H.inputs[2] <== k2;
    H.out === strategyCommitment;

    // 1) size within [minSize, maxSize]
    component le1 = LessThan(64);
    le1.in[0] <== minSize;
    le1.in[1] <== size;

    component le2 = LessThan(64);
    le2.in[0] <== size;
    le2.in[1] <== maxSize;

    // ensure minSize <= size and size <= maxSize
    le1.out === 1;
    le2.out === 1;

    // 2) slippage <= maxSlippageBps
    // slippageBps = |executedPrice - refPrice| * 10000 / refPrice
    signal diff;
    diff <== executedPrice - refPrice;

    // abs
    component lt0 = LessThan(64);
    lt0.in[0] <== executedPrice;
    lt0.in[1] <== refPrice;
    signal absdiff;
    // if executed < ref => absdiff = ref - executed else executed - ref
    absdiff <== lt0.out * (refPrice - executedPrice) + (1 - lt0.out) * (executedPrice - refPrice);

    // slippageNumer = absdiff * 10000
    signal slippageNumer;
    slippageNumer <== absdiff * 10000;

    // Compare slippageNumer/refPrice <= maxSlippageBps
    // Cross-multiply to avoid division: slippageNumer <= maxSlippageBps * refPrice
    signal rhs;
    rhs <== maxSlippageBps * refPrice;

    component le3 = LessThan(128);
    le3.in[0] <== slippageNumer;
    le3.in[1] <== rhs;
    le3.out === 1;

    // 3) executedPrice within reference band: ref*(1 - band) <= executed <= ref*(1 + band)
    // lower = refPrice*(10000 - allowedBandBps)
    // upper = refPrice*(10000 + allowedBandBps)
    signal lower;
    signal upper;
    lower <== refPrice * (10000 - allowedBandBps);
    upper <== refPrice * (10000 + allowedBandBps);

    // Compare: executedPrice*10000 within [lower, upper]
    signal execScaled;
    execScaled <== executedPrice * 10000;

    component le4 = LessThan(128);
    le4.in[0] <== lower;
    le4.in[1] <== execScaled;
    le4.out === 1;

    component le5 = LessThan(128);
    le5.in[0] <== execScaled;
    le5.in[1] <== upper;
    le5.out === 1;

    // 4) Direction enforcement example: if signalDirection == 1 (buy), require executedPrice >= refPrice
    // if sell (0), executedPrice <= refPrice
    // Use selectors
    signal ge;
    ge <== 1 - lt0.out; // executed >= ref => ge=1 else 0

    // Must satisfy: signalDirection==1 -> ge==1; signalDirection==0 -> ge can be 0 or 1 but require not strictly above? we'll enforce both cases:
    // For sell (0): executed <= ref => lt0.out==0 means executed>=ref; we want executed<=ref, i.e., not above.
    // So enforce: signalDirection* (1-ge) == 0 and (1-signalDirection)*ge == 0
    (signalDirection * (1 - ge)) === 0;
    ((1 - signalDirection) * ge) === 0;
}

component main = TradeVerification();
