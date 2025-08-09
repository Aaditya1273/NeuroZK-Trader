import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModularSmartAccount", function () {
  it("should add/revoke session keys and validate", async () => {
    const [owner, guardian, sessionKey, newOwner] = await ethers.getSigners();

    const MockEntryPoint = await ethers.getContractFactory("MockEntryPoint");
    const entryPoint = await MockEntryPoint.deploy();
    await entryPoint.waitForDeployment();

    const MSA = await ethers.getContractFactory("ModularSmartAccount");
    const msa = await MSA.deploy(await entryPoint.getAddress(), owner.address);
    await msa.waitForDeployment();

    // Initially invalid
    expect(await msa.isSessionKeyValid(sessionKey.address)).to.eq(false);

    // Add session key for 1 hour
    await expect(msa.connect(owner)['addSessionKey(address,uint64)'](sessionKey.address, 3600 * 1000))
      .to.emit(msa, "SessionKeyAdded");
    expect(await msa.isSessionKeyValid(sessionKey.address)).to.eq(true);

    // Revoke
    await expect(msa.connect(owner)['revokeSessionKey(address)'](sessionKey.address))
      .to.emit(msa, "SessionKeyRevoked");
    expect(await msa.isSessionKeyValid(sessionKey.address)).to.eq(false);
  });

  it("should manage guardians and recover owner", async () => {
    const [owner, guardian, newOwner] = await ethers.getSigners();

    const MockEntryPoint = await ethers.getContractFactory("MockEntryPoint");
    const entryPoint = await MockEntryPoint.deploy();
    await entryPoint.waitForDeployment();

    const MSA = await ethers.getContractFactory("ModularSmartAccount");
    const msa = await MSA.deploy(await entryPoint.getAddress(), owner.address);
    await msa.waitForDeployment();

    // Add guardian
    await expect(msa.connect(owner).addGuardian(guardian.address))
      .to.emit(msa, "GuardianAdded");

    // Recover owner by guardian
    await expect(msa.connect(guardian).recoverOwner(newOwner.address))
      .to.emit(msa, "OwnerRecovered")
      .withArgs(guardian.address, newOwner.address);

    // New owner can add a guardian now
    await expect(msa.connect(newOwner).addGuardian(owner.address))
      .to.emit(msa, "GuardianAdded");
  });
});
