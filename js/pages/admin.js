(function () {
    var fields = {
        seoTitle: document.getElementById('seo-title'),
        seoKeywords: document.getElementById('seo-keywords'),
        seoDescription: document.getElementById('seo-description'),
        seoOgTitle: document.getElementById('seo-og-title'),
        seoOgDescription: document.getElementById('seo-og-description'),
        seoOgUrl: document.getElementById('seo-og-url'),
        profileLogoUrl: document.getElementById('profile-logo-url'),
        profileLogoAlt: document.getElementById('profile-logo-alt'),
        profileDescription: document.getElementById('profile-description'),
        locationText: document.getElementById('location-text'),
        quoteText: document.getElementById('quote-text'),
        quoteAuthor: document.getElementById('quote-author'),
        navLines: document.getElementById('nav-lines'),
        footerText: document.getElementById('footer-text'),
        footerHref: document.getElementById('footer-href'),
        playerTitle: document.getElementById('player-title'),
        playerAuthor: document.getElementById('player-author'),
        playerDisplayTitle: document.getElementById('player-display-title'),
        playerAudioUrl: document.getElementById('player-audio-url'),
        playerLrcUrl: document.getElementById('player-lrc-url'),
        playerCoverUrl: document.getElementById('player-cover-url')
    };

    var preview = document.getElementById('json-preview');
    var statusText = document.getElementById('status-text');
    var importInput = document.getElementById('json-import');
    var form = document.getElementById('admin-form');

    function setStatus(message) {
        statusText.textContent = message;
    }

    function navToLines(nav) {
        return (nav || []).map(function (item) {
            return (item.text || '') + '|' + (item.href || '');
        }).join('\n');
    }

    function linesToNav(lines) {
        return (lines || '')
            .split(/\r?\n/)
            .map(function (line) {
                return line.trim();
            })
            .filter(Boolean)
            .map(function (line) {
                var parts = line.split('|');
                return {
                    text: (parts.shift() || '').trim(),
                    href: parts.join('|').trim()
                };
            })
            .filter(function (item) {
                return item.text || item.href;
            });
    }

    function fillForm(data) {
        fields.seoTitle.value = data.seo.title || '';
        fields.seoKeywords.value = data.seo.keywords || '';
        fields.seoDescription.value = data.seo.description || '';
        fields.seoOgTitle.value = data.seo.ogTitle || '';
        fields.seoOgDescription.value = data.seo.ogDescription || '';
        fields.seoOgUrl.value = data.seo.ogUrl || '';
        fields.profileLogoUrl.value = data.profile.logoUrl || '';
        fields.profileLogoAlt.value = data.profile.logoAlt || '';
        fields.profileDescription.value = data.profile.description || '';
        fields.locationText.value = data.location.text || '';
        fields.quoteText.value = data.quote.text || '';
        fields.quoteAuthor.value = data.quote.author || '';
        fields.navLines.value = navToLines(data.nav);
        fields.footerText.value = data.footer.text || '';
        fields.footerHref.value = data.footer.href || '';
        fields.playerTitle.value = data.player.title || '';
        fields.playerAuthor.value = data.player.author || '';
        fields.playerDisplayTitle.value = data.player.displayTitle || '';
        fields.playerAudioUrl.value = data.player.audioUrl || '';
        fields.playerLrcUrl.value = data.player.lrcUrl || '';
        fields.playerCoverUrl.value = data.player.coverUrl || '';
        updatePreview();
    }

    function collectData() {
        return {
            seo: {
                title: fields.seoTitle.value.trim(),
                keywords: fields.seoKeywords.value.trim(),
                description: fields.seoDescription.value.trim(),
                ogTitle: fields.seoOgTitle.value.trim(),
                ogDescription: fields.seoOgDescription.value.trim(),
                ogUrl: fields.seoOgUrl.value.trim()
            },
            profile: {
                logoUrl: fields.profileLogoUrl.value.trim(),
                logoAlt: fields.profileLogoAlt.value.trim(),
                description: fields.profileDescription.value.trim()
            },
            location: {
                text: fields.locationText.value.trim()
            },
            nav: linesToNav(fields.navLines.value),
            quote: {
                text: fields.quoteText.value.trim(),
                author: fields.quoteAuthor.value.trim()
            },
            player: {
                title: fields.playerTitle.value.trim(),
                author: fields.playerAuthor.value.trim(),
                displayTitle: fields.playerDisplayTitle.value.trim(),
                audioUrl: fields.playerAudioUrl.value.trim(),
                lrcUrl: fields.playerLrcUrl.value.trim(),
                coverUrl: fields.playerCoverUrl.value.trim()
            },
            footer: {
                text: fields.footerText.value.trim(),
                href: fields.footerHref.value.trim()
            }
        };
    }

    function updatePreview() {
        preview.textContent = JSON.stringify(collectData(), null, 2);
    }

    function downloadJson() {
        var jsonText = JSON.stringify(collectData(), null, 2);
        var blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');

        link.href = url;
        link.download = 'site-data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setStatus('已导出 site-data.json，请替换 data/site-data.json。');
    }

    function copyJson() {
        var jsonText = JSON.stringify(collectData(), null, 2);

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            setStatus('当前环境不支持剪贴板复制，请改用导出功能。');
            return;
        }

        navigator.clipboard.writeText(jsonText)
            .then(function () {
                setStatus('JSON 已复制到剪贴板。');
            })
            .catch(function () {
                setStatus('复制失败，请改用导出功能。');
            });
    }

    function loadCurrentJson() {
        return fetch('data/site-data.json')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load data/site-data.json');
                }

                return response.json();
            })
            .then(function (data) {
                fillForm(data);
                setStatus('已读取 data/site-data.json。');
            })
            .catch(function () {
                setStatus('读取失败，请确认通过本地服务器访问，并检查 data/site-data.json 是否有效。');
            });
    }

    form.addEventListener('input', updatePreview);
    document.getElementById('load-default').addEventListener('click', loadCurrentJson);
    document.getElementById('export-json').addEventListener('click', downloadJson);
    document.getElementById('copy-json').addEventListener('click', copyJson);

    importInput.addEventListener('change', function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        var reader = new FileReader();
        reader.onload = function (loadEvent) {
            try {
                fillForm(JSON.parse(loadEvent.target.result));
                setStatus('JSON 导入成功。');
            } catch (error) {
                setStatus('导入失败，文件不是有效的 JSON。');
            }
        };
        reader.readAsText(file, 'utf-8');
    });

    loadCurrentJson();
})();
