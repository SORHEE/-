const $ = (sel) => document.querySelector(sel);

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.reason || "요청 실패");
  return data;
}

async function refreshStatus() {
  const status = await api("/api/status");
  $("#statusBar").textContent = status.naverLoggedIn
    ? "네이버 로그인됨 · 자동 발행 시각: " + status.settings.publishTime
    : "네이버 로그인이 필요합니다 · 자동 발행 시각: " + status.settings.publishTime;
}

$("#naverLoginBtn").addEventListener("click", async () => {
  $("#naverLoginResult").textContent = "로그인 창에서 로그인해주세요...";
  $("#naverLoginBtn").disabled = true;
  try {
    await api("/api/naver/login", { method: "POST" });
    $("#naverLoginResult").textContent = "로그인 완료!";
    await refreshStatus();
  } catch (err) {
    $("#naverLoginResult").textContent = "실패: " + err.message;
  } finally {
    $("#naverLoginBtn").disabled = false;
  }
});

$("#findTopicsBtn").addEventListener("click", async () => {
  $("#findTopicsBtn").disabled = true;
  $("#topicCandidates").innerHTML = "글감을 찾는 중...";
  try {
    const { topics } = await api("/api/topics");
    $("#topicCandidates").innerHTML = "";
    topics.forEach((topic) => {
      const btn = document.createElement("button");
      btn.textContent = topic;
      btn.addEventListener("click", () => createDraft(topic));
      $("#topicCandidates").appendChild(btn);
    });
  } catch (err) {
    $("#topicCandidates").textContent = "실패: " + err.message;
  } finally {
    $("#findTopicsBtn").disabled = false;
  }
});

$("#useManualTopicBtn").addEventListener("click", () => {
  const topic = $("#manualTopic").value.trim();
  if (topic) createDraft(topic);
});

async function createDraft(topic) {
  $("#draftSection").hidden = false;
  $("#draftTitle").textContent = "초안을 만드는 중...";
  $("#draftBody").innerHTML = "";
  try {
    const draft = await api("/api/draft", {
      method: "POST",
      body: JSON.stringify({ topic }),
    });
    $("#draftTitle").textContent = draft.title;
    $("#draftBody").innerHTML = renderBlocks(draft.blocks, draft.imageUrls);
  } catch (err) {
    $("#draftTitle").textContent = "초안 생성 실패";
    $("#draftBody").textContent = err.message;
  }
}

function renderBlocks(blocks, imageUrls) {
  return blocks
    .map((b) => {
      if (b.type === "image") {
        const src = imageUrls[b.altText];
        return src ? `<img src="${src}" alt="${b.altText}" />` : `[이미지: ${b.altText}]`;
      }
      const cls = b.type === "subheading" ? "subheading" : "";
      return `<div class="${cls}">${b.lines.join("<br/>")}</div>`;
    })
    .join("\n");
}

$("#publishBtn").addEventListener("click", async () => {
  $("#publishBtn").disabled = true;
  $("#publishStatus").textContent = "네이버에 발행 중... (창이 열립니다)";
  try {
    const result = await api("/api/publish", { method: "POST" });
    $("#publishStatus").textContent = "발행 완료!";
    showResult(result);
    await refreshHistory();
  } catch (err) {
    $("#publishStatus").textContent = "실패: " + err.message;
  } finally {
    $("#publishBtn").disabled = false;
  }
});

function showResult(result) {
  $("#resultSection").hidden = false;
  $("#publishedUrl").href = result.url;
  $("#publishedUrl").textContent = result.url;

  $("#igImages").innerHTML = result.igImages.map((src) => `<img src="${src}" />`).join("");
  $("#igCaption").value = result.igCaption;

  $("#threadsPosts").innerHTML = result.threadsPosts
    .map((p) => `<div class="thread-post">${escapeHtml(p)}</div>`)
    .join("");
}

$("#copyCaptionBtn").addEventListener("click", () => {
  $("#igCaption").select();
  navigator.clipboard.writeText($("#igCaption").value);
});

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function refreshHistory() {
  const posts = await api("/api/history");
  const tbody = $("#historyTable tbody");
  tbody.innerHTML = posts
    .map(
      (p) => `<tr>
        <td>${new Date(p.createdAt).toLocaleString()}</td>
        <td>${p.topic || ""}</td>
        <td>${p.title || ""}</td>
        <td>${p.status}</td>
        <td>${p.url ? `<a href="${p.url}" target="_blank">보기</a>` : ""}</td>
      </tr>`
    )
    .join("");
}

refreshStatus();
refreshHistory();
