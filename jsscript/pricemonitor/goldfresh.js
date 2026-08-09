// setInterval(refreshNameAndCode, 1000);

(function () {
    let timer = null;
    let targetPrice = 945;
    let minPrice = 900;
    let above = false;
    let below = false;

    // 声音
    function beep(times = 5) {
    let count = 0;

    function playOnce() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        function playTone(freq, start, duration) {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = freq;

            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(
                0.25,
                ctx.currentTime + start + 0.05
            );
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + start + duration
            );

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start(ctx.currentTime + start);
            oscillator.stop(ctx.currentTime + start + duration);
        }

        // 叮咚
        // playTone(880, 0, 0.25);
        // playTone(660, 0.25, 0.4);
        playTone(587, 0, 0.25);
        playTone(660, 0.25, 0.4);

        setTimeout(() => ctx.close(), 1000);

        count++;

        if (count < times) {
            setTimeout(playOnce, 1000);
        }
    }

    playOnce();
}


    // 检查价格
    function checkPrice() {
        const el = document.getElementById("now_price");
        if (!el) return;

        const price = parseFloat(el.innerText);

        if (isNaN(price)) return;

        console.log("当前价格:", price, "最低:", minPrice, "最高:", targetPrice);

        if (price >= targetPrice && !above) {
            above = true;
            beep(5);
            console.log("🔔 达到目标价格:", price);
        }

        // 跌回去后重新允许提醒
        if (price < targetPrice) {
            above = false;
        }

        if (price <= minPrice && !below) {
            below = true;
            beep(5);
            console.log("低于最低价格:", price);
        }

        // 涨回去后重新允许下限提醒
        if (price > minPrice) {
            below = false;
        }
    }


    // 创建控制面板
    const panel = document.createElement("div");

    panel.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: white;
        border: 2px solid #333;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        box-shadow: 0 0 10px #999;
    `;

    panel.innerHTML = `
        <div>
            提醒声音:
            <input type="file" accept="audio/*">
        </div>
        <div>
            最低价格提醒:
            <input id="price_min_input"
                   value="${minPrice}"
                   type="number"
                   style="width:80px;border: black solid 1px;">
        </div>
        <div>
            最高价格提醒:
            <input id="price_target_input"
                   value="${targetPrice}"
                   type="number"
                   style="width:80px;border: black solid 1px;">
        </div>
        <div style="margin-top:10px">
            <button id="price_start" style="width: 60px; height: 30px;background-color: limegreen;">开始</button>
            <button id="price_stop" style="width: 60px; height: 30px;background-color: red;">暂停</button>
        </div>
        <div id="price_status"
             style="margin-top:8px;color:green">
             未启动
        </div>
    `;

    document.body.appendChild(panel);


    // 开始
    document.getElementById("price_start").onclick = function () {

        targetPrice = parseFloat(
            document.getElementById("price_target_input").value
        );
        minPrice = parseFloat(
            document.getElementById("price_min_input").value
        );

        if (isNaN(targetPrice) || isNaN(minPrice)) {
            return;
        }

        if (!timer) {
            timer = setInterval(checkPrice, 1000);
        }

        above = false;
        below = false;

        document.getElementById("price_status").innerText =
            "监控中，最低: " + minPrice + "，最高: " + targetPrice;

        console.log("监控启动，最低:", minPrice, "最高:", targetPrice);
    };


    // 暂停
    document.getElementById("price_stop").onclick = function () {

        if (timer) {
            clearInterval(timer);
            timer = null;
        }

        document.getElementById("price_status").innerText =
            "已暂停";

        console.log("监控停止");
    };


    console.log("价格提醒控件加载完成");
})();
