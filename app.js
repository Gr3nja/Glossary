/* =========================================
   用語集 — app.js
   ========================================= */

'use strict';

/* ─── 行グループ定義 ─────────────────────── */
var ROW_GROUPS = [
    { label: 'ア行', chars: 'あいうえおぁぃぅぇぉアイウエオァィゥェォ' },
    { label: 'カ行', chars: 'かきくけこがぎぐげごカキクケコガギグゲゴ' },
    { label: 'サ行', chars: 'さしすせそざじずぜぞサシスセソザジズゼゾ' },
    { label: 'タ行', chars: 'たちつてとだぢづでどっタチツテトダヂヅデドッ' },
    { label: 'ナ行', chars: 'なにぬねのナニヌネノ' },
    { label: 'ハ行', chars: 'はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ' },
    { label: 'マ行', chars: 'まみむめもマミムメモ' },
    { label: 'ヤ行', chars: 'やゆよやゆよゃゅょャュョ' },
    { label: 'ラ行', chars: 'らりるれろラリルレロ' },
    { label: 'ワ行', chars: 'わをんわをんヲン' },
    { label: '英数字・記号', chars: '' }   /* fallback */
];

/**
 * 用語の先頭文字からグループラベルを返す
 * 絵文字・記号が先頭の場合は2文字目以降を試みる
 */
function getGroup(term) {
    var reading = term.reading || term.term;

    /* 読み仮名がある場合はそちらを優先 */
    var target = reading.trim();

    /* 絵文字などを読み飛ばして最初のひらがな・カタカナ・英数字を探す */
    for (var i = 0; i < target.length; i++) {
        var c = target[i];
        for (var g = 0; g < ROW_GROUPS.length - 1; g++) {
            if (ROW_GROUPS[g].chars.indexOf(c) !== -1) {
                return ROW_GROUPS[g].label;
            }
        }
        /* 英数字 */
        if (/[A-Za-z0-9ａ-ｚＡ-Ｚ０-９]/.test(c)) {
            return '英数字・記号';
        }
    }
    return '英数字・記号';
}

/* ─── HTML エスケープ ────────────────────── */
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ─── 検索ハイライト（タグ外テキストのみ） ─ */
function highlight(html, keywords) {
    if (!keywords.length) return html;
    return html.replace(/(<[^>]*>)|([^<]+)/g, function (m, tag, text) {
        if (tag) return tag;
        keywords.forEach(function (kw) {
            var re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            text = text.replace(re, '<mark>$1</mark>');
        });
        return text;
    });
}

/* ─── DOM 取得 ──────────────────────────── */
var searchInput = document.getElementById('searchInput');
var searchCount = document.getElementById('search-count');
var indexBar = document.getElementById('index-bar');
var glossaryDiv = document.getElementById('glossary');
var noResults = document.getElementById('no-results');
var loadError = document.getElementById('load-error');

/* ─── グローバルデータ ─────────────────── */
var allTerms = [];   /* data.json の全データ */
var sectionMap = {};   /* label → { headEl, tableEl } */

/* ─── レンダリング ───────────────────────── */
function buildGlossary(terms) {
    glossaryDiv.innerHTML = '';
    sectionMap = {};

    /* グループ別に振り分け */
    var groups = {};
    ROW_GROUPS.forEach(function (g) { groups[g.label] = []; });

    terms.forEach(function (t) {
        var label = getGroup(t);
        groups[label].push(t);
    });

    /* あいうえお順にセクションを生成 */
    ROW_GROUPS.forEach(function (g) {
        var items = groups[g.label];
        if (items.length === 0) return;

        /* セクション見出し */
        var head = document.createElement('div');
        head.className = 'section-head';
        head.textContent = g.label;
        head.dataset.group = g.label;

        /* テーブル */
        var table = document.createElement('table');
        table.className = 'glossary-table';

        items.forEach(function (t) {
            var tr = document.createElement('tr');

            /* 検索用インデックス文字列 */
            tr.dataset.search = [
                t.term, t.reading || '',
                t.desc || '', t.example || ''
            ].join(' ').toLowerCase();

            /* 用語列 */
            var tdTerm = document.createElement('td');
            tdTerm.className = 'col-term';
            tdTerm.innerHTML =
                esc(t.term) +
                (t.reading ? '<span class="col-reading">' + esc(t.reading) + '</span>' : '');

            /* 説明列 */
            var tdDesc = document.createElement('td');
            tdDesc.className = 'col-desc';
            tdDesc.innerHTML =
                esc(t.desc || '') +
                (t.example
                    ? '<div class="col-example">例：' + esc(t.example) + '</div>'
                    : '');

            tr.appendChild(tdTerm);
            tr.appendChild(tdDesc);
            table.appendChild(tr);
        });

        glossaryDiv.appendChild(head);
        glossaryDiv.appendChild(table);

        sectionMap[g.label] = { headEl: head, tableEl: table };
    });
}

/* ─── 行インデックスボタン生成 ─────────── */
function buildIndexBar() {
    /* 既存ボタンを削除（ラベルテキスト「行:」は保持） */
    var existing = indexBar.querySelectorAll('.index-btn');
    existing.forEach(function (el) { el.remove(); });

    ROW_GROUPS.forEach(function (g) {
        var btn = document.createElement('button');
        btn.className = 'index-btn';
        btn.textContent = g.label;
        btn.dataset.group = g.label;

        /* セクションが存在しない場合はdisabled */
        if (!sectionMap[g.label]) {
            btn.classList.add('disabled');
        } else {
            btn.addEventListener('click', function () {
                var sec = sectionMap[g.label];
                if (sec) {
                    sec.headEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        indexBar.appendChild(btn);
    });
}

/* ─── 検索 ──────────────────────────────── */
function doSearch() {
    var q = searchInput.value.trim();
    var keywords = q ? q.split(/\s+/).filter(Boolean) : [];
    var kw_lower = keywords.map(function (k) { return k.toLowerCase(); });
    var visible = 0;

    /* 全 tr に対して表示／非表示を制御 */
    Object.keys(sectionMap).forEach(function (label) {
        var sec = sectionMap[label];
        var rows = sec.tableEl.querySelectorAll('tr');
        var secVisible = 0;

        rows.forEach(function (tr) {
            /* ハイライト用に td の innerHTML を取り出す */
            var tdTerm = tr.children[0];
            var tdDesc = tr.children[1];


            /* 元テキストで判定（mark タグ除去） */
            var hay = tr.dataset.search;

            var match = kw_lower.every(function (kw) { return hay.includes(kw); });

            if (match) {
                tr.classList.remove('hidden');
                secVisible++;
                visible++;

                /* ハイライト適用（前回の mark をまず除去） */
                if (keywords.length) {
                    [tdTerm, tdDesc].forEach(function (td) {
                        /* mark タグを除去してから再適用 */
                        td.innerHTML = td.innerHTML.replace(/<\/?mark>/gi, '');
                        td.innerHTML = highlight(td.innerHTML, kw_lower);
                    });
                } else {
                    /* 検索クリア時は mark を消す */
                    [tdTerm, tdDesc].forEach(function (td) {
                        td.innerHTML = td.innerHTML.replace(/<\/?mark>/gi, '');
                    });
                }
            } else {
                tr.classList.add('hidden');
                /* 非表示時も mark を消しておく */
                [tdTerm, tdDesc].forEach(function (td) {
                    td.innerHTML = td.innerHTML.replace(/<\/?mark>/gi, '');
                });
            }
        });

        /* セクション見出しごと非表示 */
        var show = secVisible > 0;
        sec.headEl.style.display = show ? '' : 'none';
        sec.tableEl.style.display = show ? '' : 'none';
    });

    /* 件数 & メッセージ */
    searchCount.textContent = keywords.length ? visible + ' 件ヒット' : '';
    noResults.style.display = (visible === 0 && keywords.length) ? 'block' : 'none';

    /* インデックスボタンの disabled 更新 */
    indexBar.querySelectorAll('.index-btn').forEach(function (btn) {
        var label = btn.dataset.group;
        var sec = sectionMap[label];
        if (!sec) {
            btn.classList.add('disabled');
            return;
        }
        var hasVisible = sec.tableEl.querySelector('tr:not(.hidden)');
        if (hasVisible) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    });
}

/* ─── データ読み込み & 初期化 ──────────── */
fetch('data.json')
    .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(function (data) {
        allTerms = data;

        allTerms.sort(function (a, b) {
            var ra = (a.reading || a.term).toLowerCase();
            var rb = (b.reading || b.term).toLowerCase();
            return ra.localeCompare(rb, 'ja');
        });

        buildGlossary(allTerms);
        buildIndexBar();

        /* 件数表示 */
        var countEl = document.getElementById('total-count');
        if (countEl) countEl.textContent = allTerms.length;
    })
    .catch(function (err) {
        loadError.style.display = 'block';
        loadError.textContent =
            'data.json の読み込みに失敗しました。' +
            'ファイルが同じフォルダーに存在するか確認してください。（' + err.message + '）';
    });

/* ─── イベント ──────────────────────────── */
searchInput.addEventListener('input', doSearch);
searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        searchInput.value = '';
        doSearch();
    }
});