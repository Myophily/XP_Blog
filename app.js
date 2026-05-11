const CONFIG_PLACEHOLDERS = new Set([
  "https://YOUR_PROJECT_ID.supabase.co",
  "YOUR_SUPABASE_ANON_PUBLIC_KEY",
]);

let authUnavailableMessage = "";
const appConfig = readAppConfig();
let supabaseClient = createSupabaseClient(appConfig);

function readAppConfig() {
  const configElement = document.getElementById("xp-blog-config");

  if (!configElement) {
    authUnavailableMessage =
      "Supabase configuration is missing. Add the xp-blog-config JSON block in index.html.";
    return {};
  }

  try {
    const parsed = JSON.parse(configElement.textContent || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse xp-blog-config:", error);
    authUnavailableMessage =
      "Supabase configuration could not be read. Check the xp-blog-config JSON block.";
    return {};
  }
}

function createSupabaseClient(config) {
  const url = String(config.url || "").trim();
  const anonKey = String(config.anonKey || "").trim();

  if (
    !url ||
    !anonKey ||
    CONFIG_PLACEHOLDERS.has(url) ||
    CONFIG_PLACEHOLDERS.has(anonKey)
  ) {
    if (!authUnavailableMessage) {
      authUnavailableMessage =
        "Supabase is not configured yet. Replace the placeholder URL and anon public key in the xp-blog-config block.";
    }
    return null;
  }

  if (!window.supabase) {
    authUnavailableMessage =
      "Supabase could not be loaded. Check your connection and the Supabase CDN script.";
    return null;
  }

  try {
    return window.supabase.createClient(url, anonKey);
  } catch (error) {
    console.error("Supabase init failed:", error);
    authUnavailableMessage =
      "Supabase could not be initialized. Check the URL and anon public key in xp-blog-config.";
    return null;
  }
}

function applyAppConfig() {
  const siteTitle = String(appConfig.siteTitle || "XP Blog").trim() || "XP Blog";
  const sourceUrl = String(appConfig.sourceUrl || "").trim();
  const sourceLabel = String(appConfig.sourceLabel || "Source Code").trim();

  document.title = siteTitle;

  const mainTitle = document.querySelector(
    ".main-window > .title-bar .title-bar-text"
  );
  if (mainTitle) {
    mainTitle.textContent = `${siteTitle} - Internet Explorer`;
  }

  document
    .querySelectorAll(
      "#xp-popup-window .title-bar-text, #xp-confirm-window .title-bar-text"
    )
    .forEach((title) => {
      title.textContent = siteTitle;
    });

  const sourceLink = document.querySelector(".tree-sidebar-footer a");
  if (sourceLink) {
    if (sourceUrl) {
      sourceLink.href = sourceUrl;
    }

    if (sourceLabel) {
      sourceLink.textContent = sourceLabel;
    }
  }
}

// Global state
let currentUser = null;
let isGuest = false;
let isOwner = false;
let categories = [];
let categoryPostCounts = new Map();
let categoryLoadFailed = false;
let currentCategoryId = null;
let currentCategoryIds = null;
let currentCategoryLabel = "All Posts";
let selectedManagerCategoryId = null;
let categoryFormMode = "create";
let uploadedImages = [];
let imageCounter = 0;
let pendingConfirmResolve = null;
let postsLoadRequestId = 0;
let authFlowInProgress = false;
let currentAccessToken = "";

const CATEGORY_POST_LOADING_MS = 2000;

// DOM elements
const loginTab = document.getElementById("login-tab");
const blogTab = document.getElementById("blog-tab");
const loginPanel = document.getElementById("login-panel");
const blogPanel = document.getElementById("blog-panel");
const loginSection = document.getElementById("login-section");
const userSection = document.getElementById("user-section");
const postFormSection = document.getElementById("post-form-section");
const loginForm = document.getElementById("login-form");
const postForm = document.getElementById("post-form");
const authStatus = document.getElementById("auth-status");
const postsSection = document.getElementById("posts-section");
const statusUser = document.getElementById("status-user");
const statusPosts = document.getElementById("status-posts");
const statusTime = document.getElementById("status-time");
const categoryTree = document.getElementById("category-tree");
const mobileCategorySelect = document.getElementById("mobile-category-select");
const postCategorySelect = document.getElementById("post-category-id");
const manageCategoriesBtn = document.getElementById("manage-categories-btn");
const quickAddCategoryBtn = document.getElementById("quick-add-category-btn");
const categoryManagerWindow = document.getElementById("category-manager-window");
const categoryManagerTree = document.getElementById("category-manager-tree");
const categoryEditForm = document.getElementById("category-edit-form");
const categoryNameInput = document.getElementById("category-name");
const categorySlugInput = document.getElementById("category-slug");
const categoryParentSelect = document.getElementById("category-parent-id");
const categoryDescriptionInput = document.getElementById("category-description");
const categoryVisibleInput = document.getElementById("category-is-visible");
const categorySortOrderInput = document.getElementById("category-sort-order");
const categorySaveBtn = document.getElementById("category-save-btn");
const categoryHideBtn = document.getElementById("category-hide-btn");
const categoryDeleteBtn = document.getElementById("category-delete-btn");

// Initialize the app
document.addEventListener("DOMContentLoaded", async () => {
  const bootScreen = document.getElementById("boot-screen");
  setTimeout(() => {
    if (bootScreen) {
      bootScreen.style.display = "none";
    }
  }, 3000);

  applyAppConfig();
  setupEventListeners();
  updateStatusTime();
  setInterval(updateStatusTime, 1000);

  if (!supabaseClient) {
    disableAuthUI();
    updateUIForLoggedOut();
    renderCategoryTree();
    populateCategorySelect();
    populateMobileCategorySelect();
    await loadPosts();
    return;
  }

  await checkUserSession();
  await refreshCategoryUI();
  await loadPosts();
});

// Set up all event listeners
function setupEventListeners() {
  loginTab.addEventListener("click", () => switchTab("login"));
  blogTab.addEventListener("click", () => switchTab("blog"));

  loginForm.addEventListener("submit", handleLogin);
  document
    .getElementById("register-btn")
    .addEventListener("click", handleRegister);
  document
    .getElementById("guest-btn")
    .addEventListener("click", handleGuestMode);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document
    .getElementById("switch-to-blog")
    .addEventListener("click", () => switchTab("blog"));

  postForm.addEventListener("submit", handleCreatePost);
  postForm.addEventListener("reset", clearImageUploads);

  const imageUploadInput = document.getElementById("image-upload");
  if (imageUploadInput) {
    imageUploadInput.addEventListener("change", handleImageUpload);
  }

  categoryTree.addEventListener("click", (event) => {
    const target = event.target.closest("[data-category-id]");
    if (!target || !categoryTree.contains(target)) return;
    selectCategory(target.dataset.categoryId || "all");
  });

  categoryTree.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest("[data-category-id]");
    if (!target || !categoryTree.contains(target)) return;
    event.preventDefault();
    selectCategory(target.dataset.categoryId || "all");
  });

  mobileCategorySelect.addEventListener("change", () => {
    selectCategory(mobileCategorySelect.value || "all");
  });

  manageCategoriesBtn.addEventListener("click", () =>
    showProgressBar("Opening category manager...", () => showCategoryManager())
  );
  quickAddCategoryBtn.addEventListener("click", () =>
    showProgressBar("Opening category manager...", () =>
      showCategoryManager({ mode: "create", parentId: currentCategoryId })
    )
  );

  document
    .getElementById("category-manager-close")
    .addEventListener("click", hideCategoryManager);
  document
    .getElementById("category-new-btn")
    .addEventListener("click", () =>
      setNewCategoryForm(selectedManagerCategoryId || currentCategoryId)
    );
  document
    .getElementById("category-refresh-btn")
    .addEventListener("click", () =>
      showProgressBar("Refreshing categories...", () =>
        refreshCategoryUI({ showErrors: true })
      )
    );
  categoryHideBtn.addEventListener("click", () => {
    if (selectedManagerCategoryId) {
      handleHideCategory(selectedManagerCategoryId);
    }
  });
  categoryDeleteBtn.addEventListener("click", () => {
    if (selectedManagerCategoryId) {
      handleDeleteCategory(selectedManagerCategoryId);
    }
  });
  document
    .getElementById("category-edit-cancel")
    .addEventListener("click", resetCategoryForm);
  categoryEditForm.addEventListener("submit", handleCategoryFormSubmit);

  categoryManagerTree.addEventListener("click", (event) => {
    const target = event.target.closest("[data-manager-category-id]");
    if (!target || !categoryManagerTree.contains(target)) return;
    selectManagerCategory(Number(target.dataset.managerCategoryId));
  });

  categoryManagerTree.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest("[data-manager-category-id]");
    if (!target || !categoryManagerTree.contains(target)) return;
    event.preventDefault();
    selectManagerCategory(Number(target.dataset.managerCategoryId));
  });

  categoryNameInput.addEventListener("input", () => {
    const shouldAutoSlug =
      !categorySlugInput.value.trim() ||
      categorySlugInput.dataset.autoSlug === "true";

    if (shouldAutoSlug) {
      categorySlugInput.value = slugifyCategoryName(categoryNameInput.value);
      categorySlugInput.dataset.autoSlug = "true";
    }
  });

  categorySlugInput.addEventListener("input", () => {
    categorySlugInput.dataset.autoSlug = "false";
  });

  document
    .getElementById("post-detail-close")
    .addEventListener("click", hidePostDetail);
  document.getElementById("popup-close").addEventListener("click", hidePopup);
  document.getElementById("popup-ok").addEventListener("click", hidePopup);
  document
    .getElementById("confirm-close")
    .addEventListener("click", () => closeConfirm(false));
  document
    .getElementById("confirm-ok")
    .addEventListener("click", () => closeConfirm(true));
  document
    .getElementById("confirm-cancel")
    .addEventListener("click", () => closeConfirm(false));

  document.addEventListener("click", (event) => {
    if (!event.target.classList.contains("modal-overlay")) return;

    if (isWindowOpen("xp-confirm-window")) {
      closeConfirm(false);
      return;
    }

    hidePostDetail();
    hidePopup();
    hideCategoryManager();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (isWindowOpen("xp-confirm-window")) {
      closeConfirm(false);
    } else if (isWindowOpen("xp-popup-window")) {
      hidePopup();
    } else if (isWindowOpen("post-detail-window")) {
      hidePostDetail();
    } else if (isWindowOpen("category-manager-window")) {
      hideCategoryManager();
    }
  });
}

function disableAuthUI() {
  document.getElementById("login-btn").disabled = true;
  document.getElementById("register-btn").disabled = true;
  document.getElementById("guest-btn").disabled = false;
  showAuthStatus(getAuthUnavailableMessage());
}

function showAuthStatus(message) {
  if (!authStatus) return;

  authStatus.textContent = message;
  authStatus.hidden = false;
}

function hideAuthStatus() {
  if (!authStatus) return;

  authStatus.textContent = "";
  authStatus.hidden = true;
}

function getAuthUnavailableMessage() {
  return (
    authUnavailableMessage ||
    "Supabase is not available right now. Check your configuration and try again."
  );
}

function getDataClient() {
  if (!supabaseClient || !window.supabase) {
    return null;
  }

  const headers = currentAccessToken
    ? { Authorization: `Bearer ${currentAccessToken}` }
    : {};

  return window.supabase.createClient(appConfig.url, appConfig.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers,
    },
  });
}

function getRequiredDataClient() {
  const client = getDataClient();
  if (!client) {
    throw new Error(getAuthUnavailableMessage());
  }
  return client;
}

// Tab switching functionality
function switchTab(tab) {
  showProgressBar("Loading...", async () => {
    if (tab === "login") {
      loginTab.setAttribute("aria-selected", "true");
      blogTab.setAttribute("aria-selected", "false");
      loginPanel.removeAttribute("hidden");
      blogPanel.setAttribute("hidden", "");
    } else {
      loginTab.setAttribute("aria-selected", "false");
      blogTab.setAttribute("aria-selected", "true");
      loginPanel.setAttribute("hidden", "");
      blogPanel.removeAttribute("hidden");
      await loadPosts(currentCategoryIds);
    }
  });
}

// Check for existing user session
async function checkUserSession() {
  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session) {
      currentUser = session.user;
      currentAccessToken = session.access_token || "";
      isGuest = false;
      await refreshOwnerStatus();
      updateUIForLoggedInUser();
    } else {
      currentAccessToken = "";
      updateUIForLoggedOut();
    }
  } catch (error) {
    console.error("Error checking session:", error);
    updateUIForLoggedOut();
  }
}

async function checkOwnerStatus() {
  if (!getDataClient() || !currentUser) {
    isOwner = false;
    return;
  }

  const { data, error } = await getRequiredDataClient().rpc("is_site_owner");

  if (error) {
    console.error("Failed to check owner status:", error);
    isOwner = false;
    return;
  }

  isOwner = !!data;
}

// Handle user login
async function handleLogin(event) {
  event.preventDefault();

  if (!supabaseClient) {
    const message = getAuthUnavailableMessage();
    showAuthStatus(message);
    showAlert(message);
    return;
  }

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  authFlowInProgress = true;
  setAuthButtonsDisabled(true);
  showAuthStatus("Signing in...");

  await showProgressBar("Signing in...", async () => {
    try {
      const { data, error } = await withTimeout(
        supabaseClient.auth.signInWithPassword({
          email,
          password,
        }),
        15000,
        "Login request timed out. Check your Supabase Auth settings and network connection."
      );

      if (error) throw error;

      currentUser = data.user;
      currentAccessToken = data.session ? data.session.access_token : "";
      isGuest = false;
      showAuthStatus("Loading blog data...");
      await waitForNextTask();
      const ownerWarning = await completeSignedInState();
      hideAuthStatus();
      showAlert(ownerWarning || "Login successful!");
    } catch (error) {
      const message = getAuthErrorMessage(error, "Login failed");
      showAuthStatus(message);
      showAlert(message);
    } finally {
      authFlowInProgress = false;
      setAuthButtonsDisabled(false);
    }
  });
}

// Handle user registration
async function handleRegister() {
  if (!supabaseClient) {
    const message = getAuthUnavailableMessage();
    showAuthStatus(message);
    showAlert(message);
    return;
  }

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showAlert("Please enter email and password");
    return;
  }

  setAuthButtonsDisabled(true);
  showAuthStatus("Creating account...");

  await showProgressBar("Creating account...", async () => {
    try {
      const { error } = await withTimeout(
        supabaseClient.auth.signUp({
          email,
          password,
        }),
        15000,
        "Registration request timed out. Check your Supabase Auth settings and network connection."
      );

      if (error) throw error;

      const message =
        "Registration successful. If email confirmation is enabled in Supabase, check your inbox before signing in.";
      showAuthStatus(message);
      showAlert(message);
    } catch (error) {
      const message = getAuthErrorMessage(error, "Registration failed");
      showAuthStatus(message);
      showAlert(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });
}

function setAuthButtonsDisabled(disabled) {
  document.getElementById("login-btn").disabled = disabled;
  document.getElementById("register-btn").disabled = disabled;
}

function getAuthErrorMessage(error, fallback) {
  const message = error && error.message ? error.message : "Unknown error";

  if (/email not confirmed/i.test(message)) {
    return `${fallback}: Email is not confirmed yet. Check your inbox or disable email confirmation in Supabase Auth settings for local testing.`;
  }

  return `${fallback}: ${message}`;
}

async function completeSignedInState() {
  const warnings = [];
  const ownerWarning = await refreshOwnerStatus();
  if (ownerWarning) {
    warnings.push(ownerWarning);
  }

  updateUIForLoggedInUser();
  const categoryWarning = await runOptionalStep(
    withTimeout(
      refreshCategoryUI(),
      15000,
      "Category loading timed out. Check the Supabase categories table and RLS policies."
    ),
    "Category loading failed"
  );
  if (categoryWarning) {
    warnings.push(categoryWarning);
  }

  const postsWarning = await runOptionalStep(
    withTimeout(
      loadPosts(currentCategoryIds),
      15000,
      "Post loading timed out. Check the Supabase posts table and RLS policies."
    ),
    "Post loading failed"
  );
  if (postsWarning) {
    warnings.push(postsWarning);
  }

  return warnings.length > 0 ? `Login successful, but ${warnings.join(" ")}` : "";
}

async function refreshOwnerStatus() {
  try {
    await withTimeout(
      (async () => {
        await waitForNextTask();
        await checkOwnerStatus();
      })(),
      10000,
      "Owner permission check timed out. You are signed in, but owner-only tools are disabled until Supabase responds."
    );
    return "";
  } catch (error) {
    console.error("Failed to check owner status:", error);
    isOwner = false;
    return getAuthErrorMessage(
      error,
      "owner-only tools are disabled for this session"
    );
  }
}

async function runOptionalStep(promise, fallback) {
  try {
    await promise;
    return "";
  } catch (error) {
    console.error(fallback + ":", error);
    return getAuthErrorMessage(error, fallback);
  }
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function waitForNextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Handle guest mode
function handleGuestMode() {
  showProgressBar("Entering guest mode...", async () => {
    currentUser = null;
    currentAccessToken = "";
    isGuest = true;
    isOwner = false;
    updateUIForGuest();
    await refreshCategoryUI();
    loginTab.setAttribute("aria-selected", "false");
    blogTab.setAttribute("aria-selected", "true");
    loginPanel.setAttribute("hidden", "");
    blogPanel.removeAttribute("hidden");
    await loadPosts(currentCategoryIds);
    showAlert(
      "Browsing as guest - you can view posts but cannot create new ones"
    );
  });
}

// Handle user logout
async function handleLogout() {
  showProgressBar("Signing out...", async () => {
    try {
      await supabaseClient.auth.signOut();
      currentUser = null;
      currentAccessToken = "";
      isGuest = false;
      isOwner = false;
      updateUIForLoggedOut();
      await refreshCategoryUI();
      loginTab.setAttribute("aria-selected", "true");
      blogTab.setAttribute("aria-selected", "false");
      loginPanel.removeAttribute("hidden");
      blogPanel.setAttribute("hidden", "");
      showAlert("Logged out successfully");
    } catch (error) {
      showAlert("Logout failed: " + error.message);
    }
  });
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
  loginSection.style.display = "none";
  userSection.style.display = "block";
  postFormSection.style.display = isOwner ? "block" : "none";
  document.getElementById("user-email").textContent = currentUser.email;
  hideAuthStatus();
  statusUser.textContent = isOwner
    ? `Owner: ${currentUser.email}`
    : `Logged in as: ${currentUser.email} (read only)`;
  updateOwnerControls();
}

// Update UI for guest mode
function updateUIForGuest() {
  loginSection.style.display = "none";
  userSection.style.display = "none";
  postFormSection.style.display = "none";
  hideAuthStatus();
  statusUser.textContent = "Browsing as guest";
  updateOwnerControls();
}

// Update UI for logged out state
function updateUIForLoggedOut() {
  loginSection.style.display = "block";
  userSection.style.display = "none";
  postFormSection.style.display = "none";
  statusUser.textContent = "Not logged in";

  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  if (supabaseClient) {
    hideAuthStatus();
  } else {
    showAuthStatus(getAuthUnavailableMessage());
  }
  clearImageUploads();
  updateOwnerControls();
}

function updateOwnerControls() {
  manageCategoriesBtn.hidden = !isOwner;
  quickAddCategoryBtn.hidden = !isOwner;
  postFormSection.style.display = currentUser && isOwner ? "block" : "none";
}

async function refreshCategoryUI(options = {}) {
  await loadCategories(options);

  if (
    currentCategoryId &&
    !categories.some((category) => category.id === currentCategoryId)
  ) {
    currentCategoryId = null;
    currentCategoryIds = null;
    currentCategoryLabel = "All Posts";
  } else if (currentCategoryId) {
    currentCategoryIds = getCategoryAndDescendantIds(currentCategoryId);
    currentCategoryLabel = getCategoryPath(currentCategoryId);
  }

  renderCategoryTree();
  populateCategorySelect();
  populateMobileCategorySelect();
  updateOwnerControls();

  if (isWindowOpen("category-manager-window")) {
    if (
      categoryFormMode === "edit" &&
      selectedManagerCategoryId &&
      categories.some((category) => category.id === selectedManagerCategoryId)
    ) {
      selectManagerCategory(selectedManagerCategoryId);
    } else {
      renderCategoryManagerTree();
      populateParentCategorySelect();
    }
  }
}

async function loadCategories(options = {}) {
  const showErrors = options.showErrors || false;

  if (!getDataClient()) {
    categories = [];
    categoryPostCounts = new Map();
    categoryLoadFailed = true;
    return;
  }

  try {
    const { data, error } = await getRequiredDataClient()
      .from("categories")
      .select(
        "id, name, slug, parent_id, description, sort_order, is_visible, created_by, created_at, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    categories = (data || []).map(normalizeCategory);
    categoryPostCounts = await loadCategoryPostCounts();
    categoryLoadFailed = false;
  } catch (error) {
    categories = [];
    categoryPostCounts = new Map();
    categoryLoadFailed = true;
    console.error("Failed to load categories:", error);

    if (showErrors) {
      showAlert("Failed to load categories. Please check Supabase configuration.");
    }
  }
}

async function loadCategoryPostCounts() {
  const counts = new Map();

  try {
    const { data, error } = await getRequiredDataClient()
      .from("posts")
      .select("category_id");

    if (error) throw error;

    (data || []).forEach((post) => {
      if (!post.category_id) return;
      const id = Number(post.category_id);
      counts.set(id, (counts.get(id) || 0) + 1);
    });
  } catch (error) {
    console.error("Failed to load category post counts:", error);
  }

  return counts;
}

function normalizeCategory(category) {
  return {
    ...category,
    id: Number(category.id),
    parent_id:
      category.parent_id === null || category.parent_id === undefined
        ? null
        : Number(category.parent_id),
    sort_order: Number(category.sort_order || 0),
    is_visible: category.is_visible !== false,
  };
}

function getVisibleCategories() {
  return categories.filter((category) => category.is_visible || isOwner);
}

function sortCategories(categoryList) {
  return [...categoryList].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return a.name.localeCompare(b.name);
  });
}

function getChildCategories(parentId, allCategories = categories) {
  return sortCategories(
    allCategories.filter((category) => category.parent_id === parentId)
  );
}

function renderCategoryTree() {
  if (!categoryTree) return;

  const visibleCategories = getVisibleCategories();
  const rootCategories = getChildCategories(null, visibleCategories);
  const allSelected = currentCategoryId === null ? " selected" : "";
  const allAriaSelected = currentCategoryId === null ? "true" : "false";
  let treeHtml = `
    <li
      class="category-item${allSelected}"
      data-category-id="all"
      role="treeitem"
      tabindex="0"
      aria-selected="${allAriaSelected}"
    >All Posts</li>
  `;

  if (categoryLoadFailed) {
    treeHtml += `<li class="tree-empty">Failed to load categories.</li>`;
  } else if (rootCategories.length === 0) {
    treeHtml += `<li class="tree-empty">No categories yet.</li>`;
  } else {
    treeHtml += rootCategories
      .map((category) => renderCategoryNode(category, visibleCategories))
      .join("");
  }

  categoryTree.innerHTML = treeHtml;
}

function renderCategoryNode(category, allCategories) {
  const children = getChildCategories(category.id, allCategories);
  const selected = currentCategoryId === category.id ? " selected" : "";
  const hidden = category.is_visible ? "" : " category-hidden";
  const hiddenLabel = category.is_visible ? "" : " (hidden)";
  const countText =
    categoryPostCounts.size > 0 ? ` (${getCategoryPostCount(category.id)})` : "";
  const label = `${escapeHtml(category.name)}${hiddenLabel}${countText}`;
  const ariaSelected = currentCategoryId === category.id ? "true" : "false";

  if (children.length > 0) {
    return `
      <li>
        <details open>
          <summary
            class="${selected.trim()}${hidden}"
            data-category-id="${category.id}"
            role="treeitem"
            tabindex="0"
            aria-selected="${ariaSelected}"
          >${label}</summary>
          <ul>
            ${children
              .map((child) => renderCategoryNode(child, allCategories))
              .join("")}
          </ul>
        </details>
      </li>
    `;
  }

  return `
    <li
      class="category-item${selected}${hidden}"
      data-category-id="${category.id}"
      role="treeitem"
      tabindex="0"
      aria-selected="${ariaSelected}"
    >${label}</li>
  `;
}

function populateCategorySelect() {
  if (!postCategorySelect) return;

  const previousValue = postCategorySelect.value;
  const visibleCategories = getVisibleCategories();
  const rootCategories = getChildCategories(null, visibleCategories);

  postCategorySelect.innerHTML = `<option value="">Select category...</option>`;
  rootCategories.forEach((category) =>
    appendCategoryOption(postCategorySelect, category, visibleCategories, 0)
  );

  postCategorySelect.disabled = visibleCategories.length === 0;

  if (
    previousValue &&
    visibleCategories.some((category) => String(category.id) === previousValue)
  ) {
    postCategorySelect.value = previousValue;
  }

  if (visibleCategories.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Create a category first";
    postCategorySelect.appendChild(option);
  }
}

function populateMobileCategorySelect() {
  if (!mobileCategorySelect) return;

  const selectedValue = currentCategoryId ? String(currentCategoryId) : "";
  const visibleCategories = getVisibleCategories();
  const rootCategories = getChildCategories(null, visibleCategories);

  mobileCategorySelect.innerHTML = `<option value="">All Posts</option>`;
  rootCategories.forEach((category) =>
    appendCategoryOption(mobileCategorySelect, category, visibleCategories, 0)
  );
  mobileCategorySelect.value = selectedValue;
}

function appendCategoryOption(select, category, allCategories, depth, excludeIds) {
  if (excludeIds && excludeIds.has(category.id)) return;

  const option = document.createElement("option");
  option.value = category.id;
  option.textContent = `${"-- ".repeat(depth)}${category.name}${
    category.is_visible ? "" : " (hidden)"
  }`;
  select.appendChild(option);

  getChildCategories(category.id, allCategories).forEach((child) =>
    appendCategoryOption(select, child, allCategories, depth + 1, excludeIds)
  );
}

async function selectCategory(rawId) {
  if (!rawId || rawId === "all") {
    currentCategoryId = null;
    currentCategoryIds = null;
    currentCategoryLabel = "All Posts";
    setCategorySelection("all");
    mobileCategorySelect.value = "";
    await loadPosts(null, { minLoadingMs: CATEGORY_POST_LOADING_MS });
    return;
  }

  const categoryId = Number(rawId);
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return;

  currentCategoryId = categoryId;
  currentCategoryIds = getCategoryAndDescendantIds(categoryId);
  currentCategoryLabel = getCategoryPath(categoryId);
  setCategorySelection(String(categoryId));
  mobileCategorySelect.value = String(categoryId);
  await loadPosts(currentCategoryIds, {
    minLoadingMs: CATEGORY_POST_LOADING_MS,
  });
}

function setCategorySelection(rawId) {
  categoryTree
    .querySelectorAll("[data-category-id]")
    .forEach((element) => {
      element.classList.remove("selected");
      element.setAttribute("aria-selected", "false");
    });

  const selected = categoryTree.querySelector(`[data-category-id="${rawId}"]`);
  if (selected) {
    selected.classList.add("selected");
    selected.setAttribute("aria-selected", "true");
  }
}

function getCategoryAndDescendantIds(categoryId) {
  const result = [categoryId];

  function collectChildren(parentId) {
    getChildCategories(parentId).forEach((child) => {
      result.push(child.id);
      collectChildren(child.id);
    });
  }

  collectChildren(categoryId);
  return result;
}

function getCategoryPostCount(categoryId) {
  return getCategoryAndDescendantIds(categoryId).reduce(
    (total, id) => total + (categoryPostCounts.get(id) || 0),
    0
  );
}

function getCategoryPath(categoryId) {
  const path = [];
  let category = categories.find((item) => item.id === categoryId);

  while (category) {
    path.unshift(category.name);
    category = categories.find((item) => item.id === category.parent_id);
  }

  return path.length > 0 ? path.join(" / ") : "All Posts";
}

function showCategoryManager(options = {}) {
  if (!isOwner) {
    showAlert("Only the site owner can manage categories.");
    return;
  }

  const overlay = getOrCreateOverlay();
  overlay.style.display = "block";
  categoryManagerWindow.style.display = "block";
  renderCategoryManagerTree();

  if (options.mode === "create" || categories.length === 0) {
    setNewCategoryForm(options.parentId || null);
  } else if (selectedManagerCategoryId) {
    selectManagerCategory(selectedManagerCategoryId);
  } else if (currentCategoryId) {
    selectManagerCategory(currentCategoryId);
  } else {
    selectManagerCategory(categories[0].id);
  }
}

function hideCategoryManager() {
  if (!categoryManagerWindow) return;
  categoryManagerWindow.style.display = "none";
  hideOverlayIfNoModals();
}

function renderCategoryManagerTree() {
  if (!categoryManagerTree) return;

  const rootCategories = getChildCategories(null);

  if (categoryLoadFailed) {
    categoryManagerTree.innerHTML =
      '<li class="tree-empty">Failed to load categories.</li>';
    return;
  }

  if (rootCategories.length === 0) {
    categoryManagerTree.innerHTML =
      '<li class="tree-empty">No categories yet. Create your first folder.</li>';
    return;
  }

  categoryManagerTree.innerHTML = rootCategories
    .map((category) => renderCategoryManagerNode(category))
    .join("");
}

function renderCategoryManagerNode(category) {
  const children = getChildCategories(category.id);
  const selected = selectedManagerCategoryId === category.id ? " selected" : "";
  const hidden = category.is_visible ? "" : " category-hidden";
  const hiddenLabel = category.is_visible ? "" : " (hidden)";
  const label = `${escapeHtml(category.name)}${hiddenLabel}`;
  const ariaSelected = selectedManagerCategoryId === category.id ? "true" : "false";

  if (children.length > 0) {
    return `
      <li>
        <details open>
          <summary
            class="${selected.trim()}${hidden}"
            data-manager-category-id="${category.id}"
            role="treeitem"
            tabindex="0"
            aria-selected="${ariaSelected}"
          >${label}</summary>
          <ul>
            ${children.map((child) => renderCategoryManagerNode(child)).join("")}
          </ul>
        </details>
      </li>
    `;
  }

  return `
    <li
      class="category-item${selected}${hidden}"
      data-manager-category-id="${category.id}"
      role="treeitem"
      tabindex="0"
      aria-selected="${ariaSelected}"
    >${label}</li>
  `;
}

function setNewCategoryForm(parentId = null) {
  categoryFormMode = "create";
  selectedManagerCategoryId = null;
  categoryEditForm.reset();
  populateParentCategorySelect();

  if (parentId && categories.some((category) => category.id === parentId)) {
    categoryParentSelect.value = String(parentId);
  }

  categoryVisibleInput.checked = true;
  categorySortOrderInput.value = "0";
  categorySlugInput.dataset.autoSlug = "true";
  categorySaveBtn.textContent = "Create";
  updateCategoryToolbarState();
  renderCategoryManagerTree();
  categoryNameInput.focus();
}

function selectManagerCategory(categoryId) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return;

  categoryFormMode = "edit";
  selectedManagerCategoryId = categoryId;
  populateParentCategorySelect(categoryId);
  categoryNameInput.value = category.name || "";
  categorySlugInput.value = category.slug || "";
  categoryDescriptionInput.value = category.description || "";
  categoryParentSelect.value = category.parent_id ? String(category.parent_id) : "";
  categoryVisibleInput.checked = category.is_visible;
  categorySortOrderInput.value = String(category.sort_order || 0);
  categorySlugInput.dataset.autoSlug = "false";
  categorySaveBtn.textContent = "Save";
  updateCategoryToolbarState();
  renderCategoryManagerTree();
}

function resetCategoryForm() {
  if (categoryFormMode === "edit" && selectedManagerCategoryId) {
    selectManagerCategory(selectedManagerCategoryId);
    return;
  }

  setNewCategoryForm();
}

function updateCategoryToolbarState() {
  const hasSelection = categoryFormMode === "edit" && !!selectedManagerCategoryId;
  categoryHideBtn.disabled = !hasSelection;
  categoryDeleteBtn.disabled = !hasSelection;
}

function populateParentCategorySelect(excludeCategoryId = null) {
  if (!categoryParentSelect) return;

  const excludeIds = new Set();
  if (excludeCategoryId) {
    getCategoryAndDescendantIds(excludeCategoryId).forEach((id) =>
      excludeIds.add(id)
    );
  }

  categoryParentSelect.innerHTML = `<option value="">All Categories</option>`;
  getChildCategories(null).forEach((category) =>
    appendCategoryOption(categoryParentSelect, category, categories, 0, excludeIds)
  );
}

async function handleCategoryFormSubmit(event) {
  event.preventDefault();

  const categoryId =
    categoryFormMode === "edit" ? selectedManagerCategoryId : null;
  const payload = collectCategoryPayload();
  const validation = validateCategoryInput(payload, categoryId);

  if (!validation.ok) {
    showAlert(validation.message);
    return;
  }

  if (categoryFormMode === "edit" && categoryId) {
    await handleUpdateCategory(categoryId, validation.payload);
  } else {
    await handleCreateCategory(validation.payload);
  }
}

function collectCategoryPayload() {
  const name = categoryNameInput.value.trim();
  const slug = (categorySlugInput.value.trim() || slugifyCategoryName(name)).trim();
  const parentValue = categoryParentSelect.value;

  return {
    name,
    slug,
    parent_id: parentValue ? Number(parentValue) : null,
    description: categoryDescriptionInput.value.trim() || null,
    sort_order: Number(categorySortOrderInput.value || 0),
    is_visible: categoryVisibleInput.checked,
  };
}

function validateCategoryInput(payload, categoryId = null) {
  const normalizedPayload = {
    ...payload,
    name: payload.name.trim(),
    slug: slugifyCategoryName(payload.slug || payload.name),
    sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 0,
  };

  if (!normalizedPayload.name) {
    return { ok: false, message: "Name is required." };
  }

  if (normalizedPayload.name.length > 50) {
    return { ok: false, message: "Category name must be 50 characters or less." };
  }

  if (!normalizedPayload.slug) {
    return { ok: false, message: "Slug is required." };
  }

  if (
    categories.some(
      (category) =>
        category.id !== categoryId &&
        category.slug.toLowerCase() === normalizedPayload.slug.toLowerCase()
    )
  ) {
    return { ok: false, message: "This slug is already used." };
  }

  if (
    categories.some(
      (category) =>
        category.id !== categoryId &&
        category.parent_id === normalizedPayload.parent_id &&
        category.name.trim().toLowerCase() ===
          normalizedPayload.name.toLowerCase()
    )
  ) {
    return {
      ok: false,
      message: "A category with this name already exists under the selected parent.",
    };
  }

  if (categoryId && normalizedPayload.parent_id) {
    const descendantIds = getCategoryAndDescendantIds(categoryId);
    if (descendantIds.includes(normalizedPayload.parent_id)) {
      return {
        ok: false,
        message: "A category cannot be moved into itself or its subcategories.",
      };
    }
  }

  return { ok: true, payload: normalizedPayload };
}

function slugifyCategoryName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function handleCreateCategory(payload) {
  if (!isOwner) {
    showAlert("Only the site owner can create categories.");
    return;
  }

  let newCategoryId = null;

  try {
    newCategoryId = await showProgressBar("Creating category...", async () => {
      const { data, error } = await getRequiredDataClient()
        .from("categories")
        .insert([
          {
            name: payload.name,
            slug: payload.slug,
            parent_id: payload.parent_id,
            description: payload.description,
            sort_order: payload.sort_order,
            is_visible: payload.is_visible,
            created_by: currentUser.id,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      await refreshCategoryUI();
      return data ? Number(data.id) : null;
    });
  } catch (error) {
    showAlert("Failed to create category: " + error.message);
    return;
  }

  if (newCategoryId) {
    selectedManagerCategoryId = newCategoryId;
    if (postCategorySelect) {
      postCategorySelect.value = String(newCategoryId);
    }
    selectManagerCategory(newCategoryId);
  }

  showAlert("Category created successfully.");
}

async function handleUpdateCategory(categoryId, payload) {
  if (!isOwner) {
    showAlert("Only the site owner can update categories.");
    return;
  }

  const existing = categories.find((category) => category.id === categoryId);
  if (!existing) return;

  if (
    existing.slug !== payload.slug &&
    !(await showConfirm("Changing the slug may affect existing links. Continue?"))
  ) {
    return;
  }

  if (
    existing.parent_id !== payload.parent_id &&
    !(await showConfirm("Move this category to a different parent?"))
  ) {
    return;
  }

  if (
    existing.is_visible &&
    !payload.is_visible &&
    !(await showConfirm("Hide this category from the public sidebar?"))
  ) {
    return;
  }

  try {
    await showProgressBar("Saving category...", async () => {
      const { error } = await getRequiredDataClient()
        .from("categories")
        .update({
          name: payload.name,
          slug: payload.slug,
          parent_id: payload.parent_id,
          description: payload.description,
          sort_order: payload.sort_order,
          is_visible: payload.is_visible,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId);

      if (error) throw error;

      await refreshCategoryUI();
      if (currentCategoryId) {
        currentCategoryIds = getCategoryAndDescendantIds(currentCategoryId);
        currentCategoryLabel = getCategoryPath(currentCategoryId);
      }
      selectManagerCategory(categoryId);
    });
  } catch (error) {
    showAlert("Failed to update category: " + error.message);
    return;
  }

  showAlert("Category updated successfully.");
}

async function handleHideCategory(categoryId) {
  if (!isOwner) {
    showAlert("Only the site owner can update categories.");
    return;
  }

  if (!(await showConfirm("Hide this category from the public sidebar?"))) {
    return;
  }

  try {
    await showProgressBar("Hiding category...", async () => {
      const { error } = await getRequiredDataClient()
        .from("categories")
        .update({
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId);

      if (error) throw error;

      await refreshCategoryUI();
      selectManagerCategory(categoryId);
    });
  } catch (error) {
    showAlert("Failed to hide category: " + error.message);
    return;
  }

  showAlert("Category hidden successfully.");
}

async function canDeleteCategory(categoryId) {
  const children = categories.filter((category) => category.parent_id === categoryId);

  if (children.length > 0) {
    return {
      ok: false,
      reason: "This category contains subcategories. Hide it or move them first.",
    };
  }

  const { count, error } = await getRequiredDataClient()
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (error) {
    return {
      ok: false,
      reason: error.message,
    };
  }

  if (count > 0) {
    return {
      ok: false,
      reason: `This category contains ${count} posts. Hide it or move posts first.`,
    };
  }

  return { ok: true };
}

async function handleDeleteCategory(categoryId) {
  if (!isOwner) {
    showAlert("Only the site owner can delete categories.");
    return;
  }

  const result = await showProgressBar("Checking category...", () =>
    canDeleteCategory(categoryId)
  );

  if (!result.ok) {
    showAlert(result.reason);
    return;
  }

  if (!(await showConfirm("Delete this empty category?"))) {
    return;
  }

  try {
    await showProgressBar("Deleting category...", async () => {
      const { error } = await getRequiredDataClient()
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      if (currentCategoryId === categoryId) {
        currentCategoryId = null;
        currentCategoryIds = null;
        currentCategoryLabel = "All Posts";
      }

      selectedManagerCategoryId = null;
      await refreshCategoryUI();
      setNewCategoryForm();
      await loadPosts(currentCategoryIds);
    });
  } catch (error) {
    showAlert("Failed to delete category: " + error.message);
    return;
  }

  showAlert("Category deleted successfully.");
}

// Handle creating new posts
async function handleCreatePost(event) {
  event.preventDefault();

  if (!currentUser) {
    showAlert("You must be logged in to create posts.");
    return;
  }

  if (!isOwner) {
    showAlert("Only the site owner can create posts.");
    return;
  }

  const title = document.getElementById("post-title").value;
  const content = document.getElementById("post-content").value;
  const categoryId = Number(postCategorySelect.value);

  if (!categoryId) {
    showAlert("Please select a category.");
    return;
  }

  showProgressBar("Creating post...", async () => {
    try {
      const { error } = await getRequiredDataClient().from("posts").insert([
        {
          title,
          content,
          category_id: categoryId,
          author_email: currentUser.email,
          created_at: new Date().toISOString(),
          images: uploadedImages.length > 0 ? uploadedImages : null,
        },
      ]);

      if (error) throw error;

      showAlert("Post created successfully!");
      postForm.reset();
      clearImageUploads();
      await refreshCategoryUI();
      await loadPosts(currentCategoryIds);
    } catch (error) {
      showAlert("Failed to create post: " + error.message);
    }
  });
}

// Load and display posts
async function loadPosts(categoryIds = null, options = {}) {
  const requestId = ++postsLoadRequestId;
  const minLoadingPromise = waitForMinimumLoading(options.minLoadingMs);

  if (!getDataClient()) {
    postsSection.innerHTML = `
      <h3>Blog Posts</h3>
      <p>No posts available. Supabase is not configured.</p>
    `;
    statusPosts.textContent = "0 posts";
    return;
  }

  postsSection.innerHTML = `
    <h3>Blog Posts</h3>
    <div id="posts-loading">
      <p>Loading posts...</p>
      <progress max="100" value="80"></progress>
    </div>
  `;

  try {
    const posts = await fetchPosts(categoryIds);
    await minLoadingPromise;
    if (requestId !== postsLoadRequestId) return;

    displayPosts(posts);

    const suffix = currentCategoryId ? ` in ${currentCategoryLabel}` : "";
    statusPosts.textContent = `${posts.length} posts${suffix}`;
  } catch (error) {
    await minLoadingPromise;
    if (requestId !== postsLoadRequestId) return;

    postsSection.innerHTML = `
      <h3>Blog Posts</h3>
      <p>Error loading posts. Please check your Supabase configuration.</p>
    `;
    console.error("Error loading posts:", error);
  }
}

function waitForMinimumLoading(minLoadingMs = 0) {
  const delayMs = Number(minLoadingMs) || 0;
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchPosts(categoryIds = null) {
  let query = getRequiredDataClient()
    .from("posts")
    .select("*, categories (id, name, slug)");

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (!error) {
    return data || [];
  }

  throw error;
}

// Display posts in the UI
function displayPosts(posts) {
  if (posts.length === 0) {
    const emptyMessage = currentCategoryId
      ? "No posts in this folder."
      : "No posts yet.";
    postsSection.innerHTML = `<h3>Blog Posts</h3><p>${emptyMessage}</p>`;
    return;
  }

  const postsHTML = posts
    .map((post, index) => {
      const categoryName = getPostCategoryName(post);
      return `
        <div class="post post-summary" data-post-index="${index}">
          <div class="post-icon"></div>
          <div class="post-title">${escapeHtml(post.title)}</div>
          <div class="post-meta">
            ${escapeHtml(categoryName)}<br>
            ${formatDate(post.created_at)}
          </div>
        </div>
      `;
    })
    .join("");

  postsSection.innerHTML = `<h3>Blog Posts</h3><div class="posts-container">${postsHTML}</div>`;

  const postElements = postsSection.querySelectorAll(".post-summary");
  postElements.forEach((element, index) => {
    element.addEventListener("click", () => {
      showProgressBar("Loading post...", () => {
        showPostDetail(posts[index]);
      });
    });
  });
}

function getPostCategoryName(post) {
  if (post.categories && post.categories.name) {
    return post.categories.name;
  }

  const category = categories.find((item) => item.id === Number(post.category_id));
  if (category) {
    return category.name;
  }

  return "Uncategorized";
}

// Update status bar time
function updateStatusTime() {
  const now = new Date();
  statusTime.textContent = now.toLocaleTimeString();
}

// Post detail modal functions
function showPostDetail(post) {
  const postDetailWindow = document.getElementById("post-detail-window");
  const postDetailTitle = document.getElementById("post-detail-title");
  const postDetailContent = document.getElementById("post-detail-content");
  const overlay = getOrCreateOverlay();
  const categoryName = getPostCategoryName(post);

  postDetailTitle.textContent = post.title || "Post Details";
  postDetailContent.innerHTML = `
    <h4>${escapeHtml(post.title)}</h4>
    <div class="post-detail-category">Folder: ${escapeHtml(categoryName)}</div>
    <div>${renderPostContentWithImages(post.content, post.images)}</div>
    <small>
      By: ${escapeHtml(post.author_email)} |
      ${formatDate(post.created_at)}
    </small>
  `;

  overlay.style.display = "block";
  postDetailWindow.style.display = "block";
}

function hidePostDetail() {
  const postDetailWindow = document.getElementById("post-detail-window");

  postDetailWindow.style.display = "none";
  hideOverlayIfNoModals();
}

// XP-style popup functions
function showAlert(message) {
  const popupWindow = document.getElementById("xp-popup-window");
  const popupContent = document.getElementById("popup-content");
  const overlay = getOrCreateOverlay();

  popupContent.textContent = message;
  overlay.style.display = "block";
  popupWindow.style.display = "block";
}

function hidePopup() {
  const popupWindow = document.getElementById("xp-popup-window");

  popupWindow.style.display = "none";
  hideOverlayIfNoModals();
}

function showConfirm(message) {
  const confirmWindow = document.getElementById("xp-confirm-window");
  const confirmContent = document.getElementById("confirm-content");
  const overlay = getOrCreateOverlay();

  if (pendingConfirmResolve) {
    closeConfirm(false);
  }

  confirmContent.textContent = message;
  overlay.style.display = "block";
  confirmWindow.style.display = "block";
  document.getElementById("confirm-ok").focus();

  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;
  });
}

function closeConfirm(value) {
  const confirmWindow = document.getElementById("xp-confirm-window");
  const resolve = pendingConfirmResolve;

  pendingConfirmResolve = null;
  confirmWindow.style.display = "none";

  if (resolve) {
    resolve(value);
  }

  hideOverlayIfNoModals();
}

function getOrCreateOverlay() {
  let overlay = document.querySelector(".modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }
  return overlay;
}

function isWindowOpen(id) {
  const element = document.getElementById(id);
  return !!element && element.style.display !== "none";
}

function hideOverlayIfNoModals() {
  const overlay = document.querySelector(".modal-overlay");
  if (!overlay) return;

  const openModalIds = [
    "post-detail-window",
    "category-manager-window",
    "xp-popup-window",
    "xp-confirm-window",
    "progress-window",
  ];

  const hasOpenModal = openModalIds.some((id) => isWindowOpen(id));
  if (!hasOpenModal) {
    overlay.style.display = "none";
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// Process code blocks enclosed in triple backticks
function processCodeBlocks(content) {
  const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/g;

  return String(content || "").replace(codeBlockRegex, (_, codeContent) => {
    const div = document.createElement("div");
    div.textContent = codeContent.trim();
    const escapedCode = div.innerHTML;

    return `<pre>${escapedCode}</pre>`;
  });
}

// Progress Bar Utilities
function showProgressBar(message, callback, max = 100) {
  const progressWindow = document.getElementById("progress-window");
  const progressMessage = document.getElementById("progress-message");
  const progressBar = document.getElementById("progress-bar");
  const overlay = getOrCreateOverlay();
  const maximum = Number(max) || 100;
  const minVisiblePromise = waitForMinimumLoading(300);

  if (progressBar._animationInterval) {
    clearInterval(progressBar._animationInterval);
    progressBar._animationInterval = null;
  }

  progressMessage.textContent = message || "Processing...";
  progressBar.setAttribute("max", maximum);
  progressBar.setAttribute("value", 0);

  overlay.style.display = "block";
  progressWindow.style.display = "block";

  let currentValue = 0;
  const softMaximum = Math.max(maximum - 5, 1);
  const increment = Math.max(maximum / 40, 1);

  progressBar._animationInterval = setInterval(() => {
    currentValue = Math.min(currentValue + increment, softMaximum);
    progressBar.setAttribute("value", Math.round(currentValue));
  }, 75);

  return Promise.resolve()
    .then(() =>
      callback && typeof callback === "function" ? callback() : undefined
    )
    .then(
      async (result) => {
        await minVisiblePromise;
        progressBar.setAttribute("value", maximum);
        hideProgressBar();
        return result;
      },
      async (error) => {
        await minVisiblePromise;
        hideProgressBar();
        throw error;
      }
    );
}

function hideProgressBar() {
  const progressWindow = document.getElementById("progress-window");
  const progressBar = document.getElementById("progress-bar");

  if (progressBar._animationInterval) {
    clearInterval(progressBar._animationInterval);
    progressBar._animationInterval = null;
  }

  progressWindow.style.display = "none";
  hideOverlayIfNoModals();
}

// Image handling functions
async function handleImageUpload(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  await showProgressBar("Processing images...", async () => {
    const imagePreviewArea = document.getElementById("image-preview-area");

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          showAlert(`${file.name} is not an image file`);
          continue;
        }

        const base64 = await fileToBase64(file);
        const imageId = `img-${++imageCounter}`;

        const imageData = {
          id: imageId,
          filename: file.name,
          data: base64,
          type: file.type,
        };

        uploadedImages.push(imageData);
        addImagePreview(imageData);
      }

      if (uploadedImages.length > 0) {
        imagePreviewArea.style.display = "block";
      }
    } catch (error) {
      showAlert("Error processing images: " + error.message);
    }

    event.target.value = "";
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function addImagePreview(imageData) {
  const imagePreviews = document.getElementById("image-previews");
  const previewItem = document.createElement("div");
  previewItem.className = "image-preview-item";
  previewItem.setAttribute("data-image-id", imageData.id);

  previewItem.innerHTML = `
    <img src="${imageData.data}" alt="${escapeAttribute(
    imageData.filename
  )}" class="image-preview-thumbnail">
    <div class="image-preview-controls">
      <button type="button" class="image-preview-btn" onclick="insertImageIntoContent('${imageData.id}')">Insert</button>
      <button type="button" class="image-preview-btn" onclick="removeImagePreview('${imageData.id}')">Delete</button>
    </div>
    <div class="image-preview-name">${escapeHtml(imageData.filename)}</div>
  `;

  imagePreviews.appendChild(previewItem);
}

function removeImagePreview(imageId) {
  uploadedImages = uploadedImages.filter((image) => image.id !== imageId);

  const previewItem = document.querySelector(`[data-image-id="${imageId}"]`);
  if (previewItem) {
    previewItem.remove();
  }

  if (uploadedImages.length === 0) {
    document.getElementById("image-preview-area").style.display = "none";
  }
}

window.removeImagePreview = removeImagePreview;

function insertImageIntoContent(imageId) {
  const contentTextarea = document.getElementById("post-content");
  const imageData = uploadedImages.find((image) => image.id === imageId);

  if (!imageData) return;

  const cursorPosition = contentTextarea.selectionStart;
  const textBefore = contentTextarea.value.substring(0, cursorPosition);
  const textAfter = contentTextarea.value.substring(cursorPosition);
  const imageMarkdown = `![${imageData.filename}](${imageId})`;

  contentTextarea.value = textBefore + imageMarkdown + textAfter;

  const newCursorPosition = cursorPosition + imageMarkdown.length;
  contentTextarea.setSelectionRange(newCursorPosition, newCursorPosition);
  contentTextarea.focus();
}

window.insertImageIntoContent = insertImageIntoContent;

function clearImageUploads() {
  uploadedImages = [];
  imageCounter = 0;

  const imagePreviews = document.getElementById("image-previews");
  const imagePreviewArea = document.getElementById("image-preview-area");
  const imageUpload = document.getElementById("image-upload");

  if (imagePreviews) imagePreviews.innerHTML = "";
  if (imagePreviewArea) imagePreviewArea.style.display = "none";
  if (imageUpload) imageUpload.value = "";
}

function renderPostContent(content, images) {
  let previewContent = String(content || "");
  const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/g;
  previewContent = previewContent.replace(codeBlockRegex, "[Code Block]");

  let renderedContent = escapeHtml(previewContent);

  if (images && images.length > 0) {
    images.forEach((image) => {
      const imageMarkdown = escapeHtml(`![${image.filename}](${image.id})`);
      if (renderedContent.includes(imageMarkdown)) {
        renderedContent = renderedContent.replace(
          imageMarkdown,
          '<span class="post-inline-marker">[Image]</span>'
        );
      }
    });
  }

  return renderedContent;
}

function renderPostContentWithImages(content, images) {
  const processedContent = processCodeBlocks(content);
  const parts = processedContent.split(/(<pre>[\s\S]*?<\/pre>)/);

  let renderedContent = parts
    .map((part) => {
      if (part.startsWith("<pre>") && part.endsWith("</pre>")) {
        return part;
      }
      return escapeHtml(part);
    })
    .join("");

  if (images && images.length > 0) {
    images.forEach((image) => {
      const imageMarkdown = escapeHtml(`![${image.filename}](${image.id})`);
      if (renderedContent.includes(imageMarkdown)) {
        renderedContent = renderedContent.replace(
          imageMarkdown,
          `<img src="${image.data}" alt="${escapeAttribute(
            image.filename
          )}" class="post-image">`
        );
      }
    });
  }

  return `<div style="white-space: pre-line;">${renderedContent}</div>`;
}

// Listen for auth state changes
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session && session.access_token) {
      currentAccessToken = session.access_token;
    }

    if (event === "TOKEN_REFRESHED") {
      return;
    }

    if (event === "SIGNED_IN") {
      currentUser = session ? session.user : null;
      isGuest = false;

      if (authFlowInProgress || !currentUser) {
        return;
      }

      setTimeout(async () => {
        try {
          await completeSignedInState();
        } catch (error) {
          console.error("Failed to refresh signed-in state:", error);
          showAuthStatus(getAuthErrorMessage(error, "Login refresh failed"));
        }
      }, 0);
    } else if (event === "SIGNED_OUT") {
      setTimeout(async () => {
        currentUser = null;
        currentAccessToken = "";
        isGuest = false;
        isOwner = false;
        updateUIForLoggedOut();
        await refreshCategoryUI();
      }, 0);
    }
  });
}
