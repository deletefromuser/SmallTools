(function () {
    let timer = null;
    let targetPrice = 945;
    let minPrice = 900;
    let above = false;
    let below = false;
    let notifyAudio = null;
    let audioTimers = [];
    let fallbackAudioContexts = [];
    let fallbackAudioTimers = [];


    function playDefaultBeep() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            console.log("Web Audio is unavailable; default alert sound could not play");
            return;
        }

        let context;

        try {
            context = new AudioContextClass();
        } catch (error) {
            console.log("Default alert sound could not start:", error);
            return;
        }

        fallbackAudioContexts.push(context);
        context.resume().catch(error => {
            console.log("Default alert sound could not resume:", error);
        });

        function playTone(frequency, start, duration) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
			oscillator.detune.value = 300;

            gain.gain.setValueAtTime(0, context.currentTime + start);
            gain.gain.linearRampToValueAtTime(
                0.25,
                context.currentTime + start + 0.05
            );
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                context.currentTime + start + duration
            );

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start(context.currentTime + start);
            oscillator.stop(context.currentTime + start + duration);
        }

        const fallbackChimeCount = 5;
        const fallbackChimeInterval = 1;

        for (let index = 0; index < fallbackChimeCount; index++) {
            const start = index * fallbackChimeInterval;
            playTone(440, start, 0.25);
            playTone(660, start + 0.25, 0.4);
        }

        const cleanupTimer = setTimeout(() => {
            context.close().catch(() => {});
            fallbackAudioContexts = fallbackAudioContexts.filter(item => item !== context);
            fallbackAudioTimers = fallbackAudioTimers.filter(item => item !== cleanupTimer);
        }, fallbackChimeCount * fallbackChimeInterval * 1000);

        fallbackAudioTimers.push(cleanupTimer);
    }

    // 声音
    function beep(times = 3) {

        if (!notifyAudio) {
            playDefaultBeep();
            return;
        }

        let count = 0;

        function play() {

            // 如果已经暂停，不再播放
            if (!timer) {
                return;
            }

            notifyAudio.currentTime = 0;

            notifyAudio.play().catch(err => {
                console.log("声音播放失败:", err);
            });

            count++;

            if (count < times) {
                const timeout = setTimeout(play, 1500);
                audioTimers.push(timeout);
            }
        }

        play();
    }


    // 停止声音
    function stopAudio() {

        // 取消所有等待中的播放
        audioTimers.forEach(timeout => {
            clearTimeout(timeout);
        });

        audioTimers = [];

        fallbackAudioTimers.forEach(timeout => {
            clearTimeout(timeout);
        });

        fallbackAudioTimers = [];
        fallbackAudioContexts.forEach(context => {
            context.close().catch(() => {});
        });

        fallbackAudioContexts = [];

        // 停止当前播放
        if (notifyAudio) {
            notifyAudio.pause();
            notifyAudio.currentTime = 0;
        }
    }

    function stopMonitoring(stopSound, statusText) {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }

        if (stopSound) {
            stopAudio();
        }

        document.getElementById("price_status_icon").style.color = "gray";
        document.getElementById("price_status_icon").setAttribute("aria-label", "Stopped");
        document.getElementById("price_status_text").innerText = statusText;
        document.getElementById("price_start").disabled = false;
        document.getElementById("price_stop").disabled = true;
    }


    // 检查价格
    function checkPrice() {
        const el = document.getElementById("now_price");
        if (!el) return;

        const price = parseFloat(el.innerText);

        if (isNaN(price)) return;

        console.log("Current price:", price, "minimum:", minPrice, "maximum:", targetPrice);

        if (price >= targetPrice && !above) {
            above = true;

            beep(1);
            stopMonitoring(false, "Stopped: maximum alert at " + price);

            console.log("Maximum price reached:", price);
            return;
        }

        // 跌回去后重新允许提醒
        if (price < targetPrice) {
            above = false;
        }

        if (price <= minPrice && !below) {
            below = true;

            beep(1);
            stopMonitoring(false, "Stopped: minimum alert at " + price);

            console.log("Minimum price reached:", price);
            return;
        }

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
            <input id="notify_sound" type="file" accept="audio/*">
        </div>
        <br>
        <div>
            &#26368;&#20302;&#20215;&#26684;&#25552;&#37266;:
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
            <button id="price_start"
                    style="width:60px;height:30px;background-color:limegreen;">
                开始
            </button>

            <button id="price_stop" disabled
                    style="width:60px;height:30px;background-color:red;">
                暂停
            </button>

            <button id="price_reset"
                    style="width:60px;height:30px;background-color:lightgray;">
                Reset
            </button>
        </div>

        <div id="price_status" style="margin-top:8px">
            <span id="price_status_icon" role="status" aria-label="Stopped"
                  style="color:gray">&#9679;</span>
            <span id="price_status_text">Stopped</span>
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

        document.getElementById("price_status_icon").style.color = "green";
        document.getElementById("price_status_icon").setAttribute("aria-label", "Monitoring");
        document.getElementById("price_status_text").innerText =
            "Monitoring, minimum: " + minPrice + ", maximum: " + targetPrice;
        document.getElementById("price_start").disabled = true;
        document.getElementById("price_stop").disabled = false;

        console.log("Monitoring started, minimum:", minPrice, "maximum:", targetPrice);
    };


    // 暂停
    document.getElementById("price_stop").onclick = function () {
        stopMonitoring(true, "Stopped");

        console.log("Monitoring stopped and audio cancelled");
    };

    document.getElementById("price_reset").onclick = function () {
        stopAudio();
        console.log("Notification sound reset");
    };


    // 选择声音文件
    document.getElementById("notify_sound").onchange = function (e) {

        const file = e.target.files[0];

        if (file) {

            // 如果之前有声音，先停止
            stopAudio();

            notifyAudio = new Audio(
                URL.createObjectURL(file)
            );

            console.log("声音加载完成:", file.name);
        }
    };


    console.log("价格提醒控件加载完成");

})();