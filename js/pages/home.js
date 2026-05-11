(function () {
    var selectors = {
        loader: document.getElementById('page-loader'),
        logo: document.getElementById('site-logo'),
        description: document.getElementById('site-description'),
        location: document.getElementById('site-location'),
        nav: document.getElementById('site-nav'),
        quoteText: document.getElementById('site-quote-text'),
        quoteAuthor: document.getElementById('site-quote-author'),
        footerLink: document.getElementById('footer-link'),
        songTitle: document.getElementById('custom-song-title'),
        lrcDisplay: document.getElementById('custom-lrc-display'),
        lrcContent: document.getElementById('lrc-content'),
        playButton: document.getElementById('custom-play-btn'),
        playedBar: document.getElementById('custom-played-bar'),
        currentTime: document.getElementById('custom-current-time'),
        totalTime: document.getElementById('custom-total-time')
    };

    var playerInstance = null;
    var currentSongLabel = '';
    var lrcLines = [];
    var lastDisplayText = '';

    document.body.classList.add('is-loading');

    function hideLoader() {
        if (!selectors.loader || selectors.loader.classList.contains('is-hidden')) {
            document.body.classList.remove('is-loading');
            return;
        }

        selectors.loader.classList.add('is-hidden');
        document.body.classList.remove('is-loading');

        window.setTimeout(function () {
            if (selectors.loader && selectors.loader.parentNode) {
                selectors.loader.parentNode.removeChild(selectors.loader);
                selectors.loader = null;
            }
        }, 400);
    }

    function setMeta(selector, value) {
        var node = document.querySelector(selector);
        if (node) {
            node.setAttribute('content', value || '');
        }
    }

    function applySeo(seo) {
        document.title = seo.title || '';
        setMeta('meta[name="keywords"]', seo.keywords);
        setMeta('meta[name="description"]', seo.description);
        setMeta('meta[property="og:title"]', seo.ogTitle || seo.title);
        setMeta('meta[property="og:description"]', seo.ogDescription || seo.description);
        setMeta('meta[property="og:url"]', seo.ogUrl);
    }

    function renderNav(items) {
        selectors.nav.innerHTML = '';

        (items || []).forEach(function (item) {
            var link = document.createElement('a');
            link.className = 'menu-item';
            link.href = item.href || '#';
            link.textContent = item.text || '';
            selectors.nav.appendChild(link);
        });
    }

    function renderPage(data) {
        applySeo(data.seo || {});

        if (selectors.logo) {
            selectors.logo.src = data.profile.logoUrl || '';
            selectors.logo.alt = data.profile.logoAlt || 'Site Logo';
        }

        if (selectors.description) {
            selectors.description.textContent = data.profile.description || '';
        }

        if (selectors.location) {
            selectors.location.textContent = data.location.text || '';
        }

        renderNav(data.nav || []);

        if (selectors.quoteText) {
            selectors.quoteText.textContent = data.quote.text || '';
        }

        if (selectors.quoteAuthor) {
            selectors.quoteAuthor.textContent = data.quote.author || '';
        }

        if (selectors.footerLink) {
            selectors.footerLink.href = data.footer.href || '#';
            selectors.footerLink.textContent = data.footer.text || '';
        }
    }

    function formatTime(totalSeconds) {
        if (!isFinite(totalSeconds) || totalSeconds < 0) {
            return '00:00';
        }

        var minutes = Math.floor(totalSeconds / 60);
        var seconds = Math.floor(totalSeconds % 60);
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    function parseLrc(lrcText) {
        var result = [];
        var timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        lrcText.split(/\r?\n/).forEach(function (line) {
            var matches = Array.from(line.matchAll(timeReg));
            var text = line.replace(timeReg, '').trim();

            if (!matches.length || !text) {
                return;
            }

            matches.forEach(function (match) {
                var fraction = match[3].length === 2 ? Number(match[3]) / 100 : Number(match[3]) / 1000;
                result.push({
                    time: Number(match[1]) * 60 + Number(match[2]) + fraction,
                    text: text
                });
            });
        });

        return result.sort(function (left, right) {
            return left.time - right.time;
        });
    }

    function getCurrentLrc(time) {
        for (var index = lrcLines.length - 1; index >= 0; index -= 1) {
            if (time >= lrcLines[index].time) {
                return lrcLines[index].text;
            }
        }

        return '';
    }

    function updateDisplayText(text) {
        if (!selectors.lrcDisplay || text === lastDisplayText) {
            return;
        }

        lastDisplayText = text;
        selectors.lrcDisplay.innerHTML = '';

        var line = document.createElement('span');
        line.className = 'lrc-line';
        line.textContent = text;
        selectors.lrcDisplay.appendChild(line);
    }

    function setButtonState(isPlaying) {
        if (!selectors.playButton) {
            return;
        }

        selectors.playButton.innerHTML = isPlaying
            ? '<span class="pause-icon">||</span>'
            : '<span class="play-icon">&#9654;</span>';
    }

    function isCrossOriginUrl(url) {
        if (!url) {
            return false;
        }

        try {
            return new URL(url, window.location.href).origin !== window.location.origin;
        } catch (error) {
            return false;
        }
    }

    function loadLrc(url) {
        if (!url || isCrossOriginUrl(url)) {
            lrcLines = [];
            selectors.lrcContent.textContent = '';
            updateDisplayText(currentSongLabel);
            return Promise.resolve();
        }

        return fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load lrc');
                }

                return response.text();
            })
            .then(function (text) {
                selectors.lrcContent.textContent = text;
                lrcLines = parseLrc(text);
            })
            .catch(function () {
                lrcLines = [];
                selectors.lrcContent.textContent = '';
                updateDisplayText(currentSongLabel);
            });
    }

    function initPlayer(playerData) {
        currentSongLabel = playerData.displayTitle || [playerData.title, playerData.author].filter(Boolean).join(' - ');
        selectors.songTitle.textContent = currentSongLabel;
        selectors.currentTime.textContent = '00:00';
        selectors.totalTime.textContent = '00:00';
        selectors.playedBar.style.width = '0%';
        updateDisplayText(currentSongLabel);
        loadLrc(playerData.lrcUrl);

        playerInstance = new APlayer({
            element: document.getElementById('player3'),
            narrow: false,
            autoplay: false,
            showlrc: 1,
            fixed: false,
            mini: false,
            music: {
                title: playerData.title || '',
                author: playerData.author || '',
                url: playerData.audioUrl || '',
                pic: playerData.coverUrl || ''
            }
        });

        playerInstance.on('play', function () {
            setButtonState(true);
        });

        playerInstance.on('pause', function () {
            setButtonState(false);
        });

        playerInstance.on('loadedmetadata', function () {
            selectors.totalTime.textContent = formatTime(playerInstance.audio.duration);
        });

        playerInstance.on('timeupdate', function () {
            var duration = playerInstance.audio.duration || 0;
            var percent = duration ? (playerInstance.audio.currentTime / duration) * 100 : 0;
            selectors.playedBar.style.width = percent + '%';
            selectors.currentTime.textContent = formatTime(playerInstance.audio.currentTime);
            updateDisplayText(getCurrentLrc(playerInstance.audio.currentTime) || currentSongLabel);
        });

        playerInstance.on('ended', function () {
            setButtonState(false);
            updateDisplayText(currentSongLabel);
        });
    }

    function bindPlayerControls() {
        selectors.playButton.addEventListener('click', function () {
            if (!playerInstance || !playerInstance.audio) {
                return;
            }

            if (playerInstance.audio.paused) {
                playerInstance.play();
            } else {
                playerInstance.pause();
            }
        });

        var progressBar = document.querySelector('.custom-aplayer-bar');
        if (!progressBar) {
            return;
        }

        progressBar.addEventListener('click', function (event) {
            if (!playerInstance || !playerInstance.audio || !playerInstance.audio.duration) {
                return;
            }

            var rect = event.currentTarget.getBoundingClientRect();
            var percent = (event.clientX - rect.left) / rect.width;
            playerInstance.seek(percent * playerInstance.audio.duration);
        });
    }

    function initMeteorCanvas() {
        var canvas = document.getElementById('meteorCanvas');
        if (!canvas) {
            return;
        }

        var context = canvas.getContext('2d');
        var stars = [];
        var meteors = [];
        var width = 0;
        var height = 0;
        var ratio = 1;
        var starCount = 500;

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.scale(ratio, ratio);
            initStars();
        }

        function initStars() {
            stars.length = 0;
            for (var index = 0; index < starCount; index += 1) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.7 + 0.3,
                    twinkleSpeed: Math.random() * 0.02 + 0.005,
                    twinkleDirection: 1
                });
            }
        }

        function getRandomMeteorColor() {
            var colors = ['rgba(255, 255, 255, ', 'rgba(142, 197, 252, ', 'rgba(0, 245, 212, '];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function createMeteor() {
            var startX = Math.random() > 0.5 ? -100 : Math.random() * width * 0.3;
            var startY = Math.random() > 0.5 ? Math.random() * height * 0.2 : -100;

            meteors.push({
                x: startX,
                y: startY,
                endX: width + 100,
                endY: height + 100,
                length: Math.random() * 100 + 150,
                width: Math.random() * 2 + 2,
                speed: Math.random() * 10 + 5,
                progress: 0,
                alpha: 1,
                color: getRandomMeteorColor()
            });
        }

        function createMeteorAtPosition(x, y) {
            var angle = Math.PI / 5;
            var speed = Math.random() * 10 + 8;
            var flightDistance = Math.random() * 600 + 400;

            meteors.push({
                x: x,
                y: y,
                endX: x + Math.cos(angle) * flightDistance,
                endY: y + Math.sin(angle) * flightDistance,
                length: Math.random() * 80 + 120,
                width: Math.random() * 3 + 3,
                speed: speed,
                progress: 0,
                alpha: 1,
                color: getRandomMeteorColor()
            });
        }

        function drawStars() {
            context.fillStyle = 'white';

            for (var index = 0; index < stars.length; index += 1) {
                var star = stars[index];
                star.opacity += star.twinkleSpeed * star.twinkleDirection;

                if (star.opacity > 1 || star.opacity < 0.3) {
                    star.twinkleDirection *= -1;
                }

                context.globalAlpha = star.opacity;
                context.fillRect(star.x, star.y, star.size, star.size);
            }

            context.globalAlpha = 1;
        }

        function drawMeteors() {
            for (var index = meteors.length - 1; index >= 0; index -= 1) {
                var meteor = meteors[index];
                meteor.progress += meteor.speed / Math.sqrt(
                    Math.pow(meteor.endX - meteor.x, 2) + Math.pow(meteor.endY - meteor.y, 2)
                );

                var currentX = meteor.x + (meteor.endX - meteor.x) * meteor.progress;
                var currentY = meteor.y + (meteor.endY - meteor.y) * meteor.progress;
                meteor.alpha = 1 - meteor.progress;

                context.globalAlpha = meteor.alpha;

                var angle = Math.atan2(meteor.endY - meteor.y, meteor.endX - meteor.x);
                var trailX = currentX - Math.cos(angle) * meteor.length;
                var trailY = currentY - Math.sin(angle) * meteor.length;
                var gradient = context.createLinearGradient(trailX, trailY, currentX, currentY);

                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(0.5, meteor.color + (meteor.alpha * 0.3) + ')');
                gradient.addColorStop(1, meteor.color + meteor.alpha + ')');

                context.strokeStyle = gradient;
                context.lineWidth = meteor.width;
                context.lineCap = 'round';
                context.beginPath();
                context.moveTo(trailX, trailY);
                context.lineTo(currentX, currentY);
                context.stroke();

                context.beginPath();
                context.arc(currentX, currentY, meteor.width * 1.5, 0, Math.PI * 2);
                context.fillStyle = meteor.color + (meteor.alpha * 0.5) + ')';
                context.fill();

                if (meteor.progress >= 1) {
                    meteors.splice(index, 1);
                }
            }

            context.globalAlpha = 1;
        }

        function animate() {
            if (document.body.classList.contains('dark-theme')) {
                context.fillStyle = 'black';
                context.fillRect(0, 0, width, height);
                drawStars();
                drawMeteors();
            } else {
                context.clearRect(0, 0, width, height);
            }

            window.requestAnimationFrame(animate);
        }

        function scheduleMeteors() {
            if (!document.body.classList.contains('dark-theme')) {
                window.setTimeout(scheduleMeteors, 1000);
                return;
            }

            createMeteor();
            window.setTimeout(scheduleMeteors, Math.random() * 1500 + 500);
        }

        canvas.addEventListener('click', function (event) {
            if (!document.body.classList.contains('dark-theme')) {
                return;
            }

            var rect = canvas.getBoundingClientRect();
            var clickX = event.clientX - rect.left;
            var clickY = event.clientY - rect.top;
            createMeteorAtPosition(clickX, clickY);
        });

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        createMeteor();
        animate();
        scheduleMeteors();
    }

    function showLoadError() {
        document.title = 'Site data load failed';

        if (selectors.description) {
            selectors.description.textContent = 'Unable to load data/site-data.json';
        }

        if (selectors.quoteText) {
            selectors.quoteText.textContent = 'Please check the file path and JSON format.';
        }

        if (selectors.quoteAuthor) {
            selectors.quoteAuthor.textContent = '';
        }
    }

    function loadSiteData() {
        return fetch('data/site-data.json')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load data/site-data.json');
                }

                return response.json();
            });
    }

    bindPlayerControls();
    initMeteorCanvas();

    loadSiteData()
        .then(function (data) {
            renderPage(data);
            initPlayer(data.player || {});
            hideLoader();
        })
        .catch(function (error) {
            console.error(error);
            showLoadError();
            hideLoader();
        });
})();
