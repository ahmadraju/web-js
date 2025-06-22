// Fixed test.js script to support both compressed and uncompressed public keys

function compressPubKey(pubkey) {
    if (pubkey.length !== 65 || pubkey[0] !== 0x04) return pubkey;
    const x = pubkey.slice(1, 33);
    const y = pubkey.slice(33, 65);
    const prefix = (y[y.length - 1] % 2 === 0) ? 0x02 : 0x03;
    return Buffer.concat([Buffer.from([prefix]), x]);
}

function hexToBuffer(hex) {
    try {
        return Buffer.from(hex, 'hex');
    } catch {
        return null;
    }
}

function hhh() {
    const hex = document.getElementById("fetcher").value.trim();
    const errorEl = document.getElementById("error");
    errorEl.innerText = "";

    const pubkeyBuffer = hexToBuffer(hex);

    if (!pubkeyBuffer) {
        errorEl.innerText = "Invalid hex input.";
        return;
    }

    if (pubkeyBuffer.length !== 33 && pubkeyBuffer.length !== 65) {
        errorEl.innerText = `Invalid public key length: ${pubkeyBuffer.length}. Expected 33 (compressed) or 65 (uncompressed).`;
        return;
    }

    const compressedPubkey = (pubkeyBuffer.length === 65 && pubkeyBuffer[0] === 0x04)
        ? compressPubKey(pubkeyBuffer)
        : pubkeyBuffer;

    // Compute addresses
    try {
        const hash160 = bitcoin.crypto.hash160(compressedPubkey);

        const { address: p2pkh } = bitcoin.payments.p2pkh({ pubkey: compressedPubkey });
        const { address: p2sh } = bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({ pubkey: compressedPubkey })
        });
        const { address: bech32 } = bitcoin.payments.p2wpkh({ pubkey: compressedPubkey });

        // Also handle uncompressed if it was originally
        const { address: uncompressedP2pkh } = (pubkeyBuffer.length === 65)
            ? bitcoin.payments.p2pkh({ pubkey: pubkeyBuffer })
            : { address: "" };

        // Populate the UI
        document.getElementById("p2pkh").value = p2pkh;
        document.getElementById("uncompp2pkh").value = uncompressedP2pkh || "";
        document.getElementById("p2sh").value = p2sh;
        document.getElementById("p2wpkh").value = bech32;

    } catch (e) {
        errorEl.innerText = "Error: " + e.message;
    }
}

