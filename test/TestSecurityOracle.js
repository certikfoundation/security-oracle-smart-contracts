const SecurityOracle = artifacts.require("CertiKSecurityOracle");

async function tryCatch(promise, message) {
  const PREFIX = "VM Exception while processing transaction: ";

  try {
    await promise;
    throw null;
  } catch (error) {
    assert(error, "Expected an error but did not get one");
    assert(
      error.message.indexOf(PREFIX + message) !== -1,
      "Expected an error containing '" +
        PREFIX +
        message +
        "' but got '" +
        error.message +
        "' instead"
    );
  }
}

contract("SecurityOracle", () => {
  let so;

  before(async function () {
    so = await SecurityOracle.new();
  });

  it("should proceed for contract address only call", async function () {
    await so.getSecurityScore("0xc06Ca4a7DaEB0D1601Bb47297d9Fd170f231D872");
  });

  it("should revert if contract address is 0", async function () {
    await tryCatch(
      so.getSecurityScore("0x0000000000000000000000000000000000000000"),
      "revert"
    );
  });

  it("should proceed for contract address and non 0 function signature call", async function () {
    await so.getSecurityScoreBytes4(
      "0xc06Ca4a7DaEB0D1601Bb47297d9Fd170f231D872",
      "0x00000001"
    );
  });

  it("should revert if function signature is 0", async function () {
    await tryCatch(
      so.getSecurityScoreBytes4(
        "0xc06Ca4a7DaEB0D1601Bb47297d9Fd170f231D872",
        "0x00000000"
      ),
      "revert"
    );
  });
});

contract("SecurityOracle Role Access", accounts => {
  const admin = accounts[0];
  const editor = accounts[1];
  const reader = accounts[2];
  let so;

  before(async function () {
    so = await SecurityOracle.new({ from: admin });
  });

  it("grant/revoke editor", async function () {
    assert.equal(
      await so.isEditor(editor),
      false,
      "should not be editor before grant"
    );

    await so.grantEditor(editor);

    assert.equal(
      await so.isEditor(editor),
      true,
      "should be editor after grant"
    );

    await so.revokeEditor(editor);

    assert.equal(
      await so.isEditor(editor),
      false,
      "should not be editor after revoke"
    );
  });

  it("should only allow admin to update default score", async function () {
    await tryCatch(so.updateDefaultScore.call(60, { from: editor }), "revert");

    await tryCatch(so.updateDefaultScore.call(60, { from: reader }), "revert");
    await so.updateDefaultScore.call(60, { from: admin });
  });

  it("should only allow editor and admin to push result", async function () {
    await tryCatch(
      so.pushResult.call(admin, "0x00000001", 10, 10, { from: reader }),
      "revert"
    );

    await so.grantEditor(editor);
    await so.pushResult.call(admin, "0x00000001", 10, 10, { from: editor });

    await so.pushResult.call(admin, "0x00000001", 10, 10, { from: admin });
  });
});
