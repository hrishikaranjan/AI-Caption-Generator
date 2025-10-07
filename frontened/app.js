// ====== CONFIG ======
const CAPTION_ENDPOINT = "https://ai-caption-generator-bjxl.onrender.com/api/caption";

// ====== ELEMENTS ======
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const generateBtn = document.getElementById("generateBtn");

const captionCard = document.getElementById("captionCard");
const captionText = document.getElementById("captionText");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const saveLocalBtn = document.getElementById("saveLocalBtn");

const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// ====== STATE ======
let currentImageBlob = null;
let currentImageURL = null;
let currentCaptions = [];

// ====== TOAST SYSTEM ======
function showToast(message, type = "info") {
  const emoji = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${emoji}</span> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

// Inject toast CSS dynamically
const toastStyle = document.createElement("style");
toastStyle.textContent = `
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  opacity: 0;
  z-index: 9999;
  transition: all 0.3s ease;
}
.toast.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
#preview img,
.history-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
`;
document.head.appendChild(toastStyle);

// ====== HELPERS ======
function setPreviewPlaceholder() {
  preview.innerHTML = `
    <div class="placeholder">
      <i class="far fa-image"></i>
      <span>No image selected</span>
    </div>
  `;
}

function setPreviewImage(blob) {
  const url = URL.createObjectURL(blob);
  currentImageURL = url;
  preview.innerHTML = `<img alt="preview" src="${url}">`;
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.innerHTML = isLoading
    ? `<i class="fas fa-circle-notch fa-spin"></i> Generating...`
    : `<i class="fas fa-magic"></i> Generate Caption`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function getHistory() {
  const raw = localStorage.getItem("captionHistory");
  return raw ? JSON.parse(raw) : [];
}

function saveToHistory(entry) {
  const list = getHistory();
  list.unshift(entry);
  localStorage.setItem("captionHistory", JSON.stringify(list.slice(0, 50)));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem("captionHistory");
  renderHistory();
}

function renderHistory() {
  const items = getHistory();
  if (!items.length) {
    historySection.classList.add("hidden");
    historyList.innerHTML = "";
    return;
  }
  historySection.classList.remove("hidden");
  historyList.innerHTML = items
    .map(
      (it, idx) => `
    <div class="history-item" data-idx="${idx}">
      <img src="${it.imageDataURL}" alt="thumb">
      <div>
        <div style="font-size:.9rem; color:#e8f2f7">${it.captions.join(" | ")}</div>
        <div style="font-size:.8rem; color:#9aa4ad; margin-top:4px">${new Date(
          it.time
        ).toLocaleString()}</div>
      </div>
      <div class="mini-actions">
        <button class="icon-btn" title="Copy" data-action="copy"><i class="far fa-copy"></i></button>
        <button class="icon-btn" title="Download .txt" data-action="download"><i class="fas fa-download"></i></button>
        <button class="icon-btn" title="Delete" data-action="delete"><i class="far fa-trash-can"></i></button>
      </div>
    </div>
  `
    )
    .join("");
}

// ====== EVENTS ======
imageInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file 🖼️", "error");
    imageInput.value = "";
    return;
  }
  currentImageBlob = file;
  setPreviewImage(file);
  captionCard.classList.add("hidden");
  captionText.textContent = "";
  currentCaptions = [];
});

generateBtn.addEventListener("click", async () => {
  if (!currentImageBlob) {
    showToast("Please choose an image first 📷", "info");
    return;
  }

  setLoading(true);
  captionCard.classList.add("hidden");
  captionText.textContent = "";
  currentCaptions = [];

  try {
    const form = new FormData();
    form.append("image", currentImageBlob);

    const res = await fetch(CAPTION_ENDPOINT, { method: "POST", body: form });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Server error (${res.status})`);
    }

    const data = await res.json();
    // Accept multiple captions if backend returns array
    currentCaptions = Array.isArray(data.caption)
      ? data.caption
      : [data.caption || "(no caption)"];
    captionText.textContent = currentCaptions.join(" | ");
    captionCard.classList.remove("hidden");
    showToast("Caption generated successfully ✨", "success");
  } catch (err) {
    console.error(err);
    showToast("Error: " + err.message, "error");
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener("click", async () => {
  if (!captionText.textContent) return;
  await navigator.clipboard.writeText(captionText.textContent);
  copyBtn.classList.add("active");
  showToast("Copied to clipboard 📋", "success");
  setTimeout(() => copyBtn.classList.remove("active"), 600);
});

downloadBtn.addEventListener("click", () => {
  if (!captionText.textContent) return;
  downloadText("caption.txt", captionText.textContent);
  showToast("Caption downloaded 💾", "success");
});

saveLocalBtn.addEventListener("click", async () => {
  if (!captionText.textContent || !currentImageURL) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = currentImageURL;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const w = 256,
      h = Math.round((img.height / img.width) * 256);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const thumbDataURL = canvas.toDataURL("image/jpeg", 0.8);

    saveToHistory({
      captions: currentCaptions,
      imageDataURL: thumbDataURL,
      time: Date.now(),
    });
    showToast("Saved locally 💾", "success");
  };
});

clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Clear all saved captions?")) {
    clearHistory();
    showToast("History cleared 🗑️", "info");
  }
});

// Drag & Drop
preview.addEventListener("dragover", (e) => {
  e.preventDefault();
  preview.style.outline = "2px dashed var(--primary)";
});
preview.addEventListener("dragleave", () => {
  preview.style.outline = "none";
});
preview.addEventListener("drop", (e) => {
  e.preventDefault();
  preview.style.outline = "none";
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith("image/")) {
    currentImageBlob = file;
    setPreviewImage(file);
    captionCard.classList.add("hidden");
    captionText.textContent = "";
    currentCaptions = [];
  }
});

// ====== INIT ======
setPreviewPlaceholder();
renderHistory();
