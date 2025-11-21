// Supabase configuration - YOU NEED TO REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT DETAILS
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let isGuest = false;
let uploadedImages = [];
let imageCounter = 0;
let currentCategoryFilter = null; // Track the selected category filter

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
const postsSection = document.getElementById("posts-section");
const statusUser = document.getElementById("status-user");
const statusPosts = document.getElementById("status-posts");
const statusTime = document.getElementById("status-time");

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  // Show boot screen initially, then hide after 3 seconds
  const bootScreen = document.getElementById("boot-screen");
  setTimeout(() => {
    bootScreen.style.display = "none";
  }, 3000);

  setupEventListeners();
  setupCategoryFilters();
  checkUserSession();
  loadPosts(); // Load posts by default when page loads
  updateStatusTime();
  setInterval(updateStatusTime, 1000);
});

// Set up all event listeners
function setupEventListeners() {
  // Tab navigation
  loginTab.addEventListener("click", () => switchTab("login"));
  blogTab.addEventListener("click", () => switchTab("blog"));

  // Authentication
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

  // Blog functionality
  postForm.addEventListener("submit", handleCreatePost);
  postForm.addEventListener("reset", clearImageUploads);

  // Image upload functionality
  const imageUploadInput = document.getElementById("image-upload");
  if (imageUploadInput) {
    imageUploadInput.addEventListener("change", handleImageUpload);
  } else {
    console.error("Image upload input not found!");
  }

  // Modal window event listeners
  document
    .getElementById("post-detail-close")
    .addEventListener("click", hidePostDetail);
  document.getElementById("popup-close").addEventListener("click", hidePopup);
  document.getElementById("popup-ok").addEventListener("click", hidePopup);

  // Close modals when clicking overlay
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      hidePostDetail();
      hidePopup();
    }
  });
}

// Helper function to get all subcategories from a summary or category item
function getSubcategories(element) {
  const categories = [];

  // If it's a category-item, add its category
  if (element.classList.contains("category-item")) {
    const categoryName = element.getAttribute("data-category");
    if (categoryName && categoryName !== "all") {
      categories.push(categoryName);
    }
  }

  // Find the parent <li> or <details> element to search within
  const parentElement = element.closest("li") || element.closest("details");
  if (!parentElement) return categories;

  // Find all descendant category items
  const descendants = parentElement.querySelectorAll(".category-item");
  descendants.forEach((descendant) => {
    const descCategory = descendant.getAttribute("data-category");
    if (
      descCategory &&
      descCategory !== "all" &&
      !categories.includes(descCategory)
    ) {
      categories.push(descCategory);
    }
  });

  return categories;
}

// Set up category filter click handlers
function setupCategoryFilters() {
  const categoryItems = document.querySelectorAll(".category-item");
  const summaryElements = document.querySelectorAll(".tree-view summary");

  // Handle category item clicks
  categoryItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent bubbling to parent summary
      const category = item.getAttribute("data-category");

      // Remove selected class from all items and summaries
      categoryItems.forEach((el) => el.classList.remove("selected"));
      summaryElements.forEach((el) => el.classList.remove("selected"));

      // Add selected class to clicked item
      item.classList.add("selected");

      // Update filter state and reload posts
      if (category === "all") {
        currentCategoryFilter = null;
        statusUser.textContent = isGuest
          ? "Browsing as guest"
          : currentUser
          ? `Logged in as: ${currentUser.email}`
          : "Not logged in";
        loadPosts();
      } else {
        // Get all subcategories including the clicked category
        const categories = getSubcategories(item);
        currentCategoryFilter = categories.length > 1 ? categories : category;
        loadPosts(currentCategoryFilter);
      }
    });
  });

  // Handle summary element clicks (parent categories)
  summaryElements.forEach((summary) => {
    summary.addEventListener("click", () => {
      // Get all child category items
      const categories = getSubcategories(summary);

      if (categories.length > 0) {
        // Remove selected class from all items and summaries
        categoryItems.forEach((el) => el.classList.remove("selected"));
        summaryElements.forEach((el) => el.classList.remove("selected"));

        // Add selected class to clicked summary
        summary.classList.add("selected");

        // Filter by all child categories
        currentCategoryFilter = categories;
        loadPosts(categories);
      }
    });
  });
}

// Tab switching functionality
function switchTab(tab) {
  showProgressBar("Loading...", () => {
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
      loadPosts(currentCategoryFilter);
    }
  });
}

// Check for existing user session
async function checkUserSession() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      updateUIForLoggedInUser();
    }
  } catch (error) {
    console.error("Error checking session:", error);
  }
}

// Handle user login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  showProgressBar("Signing in...", async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      currentUser = data.user;
      updateUIForLoggedInUser();
      showAlert("Login successful!");
    } catch (error) {
      showAlert("Login failed: " + error.message);
    }
  });
}

// Handle user registration
async function handleRegister() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showAlert("Please enter email and password");
    return;
  }

  showProgressBar("Creating account...", async () => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      showAlert(
        "Registration successful! Please check your email to confirm your account."
      );
    } catch (error) {
      showAlert("Registration failed: " + error.message);
    }
  });
}

// Handle guest mode
function handleGuestMode() {
  showProgressBar("Entering guest mode...", () => {
    isGuest = true;
    updateUIForGuest();
    // Directly switch to blog tab without progress bar
    loginTab.setAttribute("aria-selected", "false");
    blogTab.setAttribute("aria-selected", "true");
    loginPanel.setAttribute("hidden", "");
    blogPanel.removeAttribute("hidden");
    loadPosts(currentCategoryFilter);
    showAlert(
      "Browsing as guest - you can view posts but cannot create new ones"
    );
  });
}

// Handle user logout
async function handleLogout() {
  showProgressBar("Signing out...", async () => {
    try {
      await supabase.auth.signOut();
      currentUser = null;
      isGuest = false;
      updateUIForLoggedOut();
      // Directly switch to login tab without progress bar
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
  postFormSection.style.display = "block";
  document.getElementById("user-email").textContent = currentUser.email;
  statusUser.textContent = `Logged in as: ${currentUser.email}`;
}

// Update UI for guest mode
function updateUIForGuest() {
  loginSection.style.display = "none";
  userSection.style.display = "none";
  postFormSection.style.display = "none";
  statusUser.textContent = "Browsing as guest";
}

// Update UI for logged out state
function updateUIForLoggedOut() {
  loginSection.style.display = "block";
  userSection.style.display = "none";
  postFormSection.style.display = "none";
  statusUser.textContent = "Not logged in";

  // Clear form fields
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";

  // Clear image uploads
  clearImageUploads();
}

// Handle creating new posts
async function handleCreatePost(e) {
  e.preventDefault();

  if (!currentUser) {
    showAlert("You must be logged in to create posts");
    return;
  }

  const title = document.getElementById("post-title").value;
  const content = document.getElementById("post-content").value;
  const category = document.getElementById("post-category").value;

  showProgressBar("Creating post...", async () => {
    try {
      const { error } = await supabase.from("posts").insert([
        {
          title: title,
          content: content,
          category: category,
          author_email: currentUser.email,
          created_at: new Date().toISOString(),
          images: uploadedImages.length > 0 ? uploadedImages : null,
        },
      ]);

      if (error) throw error;

      showAlert("Post created successfully!");
      postForm.reset();
      clearImageUploads();
      loadPosts(currentCategoryFilter);
    } catch (error) {
      showAlert("Failed to create post: " + error.message);
    }
  });
}

// Load and display posts
async function loadPosts(category = null) {
  // Show loading indicator
  const loadingSection = document.getElementById("posts-loading");
  if (loadingSection) {
    loadingSection.style.display = "block";
  }

  try {
    let query = supabase.from("posts").select("*");

    // Apply category filter if provided
    if (category) {
      if (Array.isArray(category)) {
        // Multiple categories (hierarchical filter)
        query = query.in("category", category);
      } else {
        // Single category (exact match)
        query = query.eq("category", category);
      }
    }

    const { data: posts, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    // Hide loading indicator
    if (loadingSection) {
      loadingSection.style.display = "none";
    }

    displayPosts(posts);

    // Update status bar with filter info
    if (category) {
      if (Array.isArray(category)) {
        // Hierarchical filter - show parent category name
        const parentCategory = category[0];
        const subcategoryCount = category.length - 1;
        if (subcategoryCount > 0) {
          statusPosts.textContent = `${posts.length} posts in ${parentCategory} and subcategories`;
        } else {
          statusPosts.textContent = `${posts.length} posts in ${parentCategory}`;
        }
      } else {
        statusPosts.textContent = `${posts.length} posts in ${category}`;
      }
    } else {
      statusPosts.textContent = `${posts.length} posts`;
    }
  } catch (error) {
    // Hide loading indicator on error
    if (loadingSection) {
      loadingSection.style.display = "none";
    }

    postsSection.innerHTML =
      "<h3>Blog Posts</h3><p>Error loading posts. Please check your Supabase configuration.</p>";
    console.error("Error loading posts:", error);
  }
}

// Display posts in the UI
function displayPosts(posts) {
  if (posts.length === 0) {
    postsSection.innerHTML =
      "<h3>Blog Posts</h3><p>No posts yet. Be the first to post!</p>";
    return;
  }

  const postsHTML = posts
    .map(
      (post, index) => `
        <div class="post post-summary" data-post-index="${index}">
            <div class="post-icon"></div>
            <div class="post-title">${escapeHtml(post.title)}</div>
            <div class="post-meta">${formatDate(post.created_at)}</div>
        </div>
    `
    )
    .join("");

  postsSection.innerHTML = `<h3>Blog Posts</h3><div class="posts-container">${postsHTML}</div>`;

  // Add click handlers to post summaries
  const postElements = postsSection.querySelectorAll(".post-summary");
  postElements.forEach((element, index) => {
    element.addEventListener("click", () => {
      showProgressBar("Loading post...", () => {
        showPostDetail(posts[index]);
      });
    });
  });
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

  postDetailTitle.textContent = escapeHtml(post.title);
  postDetailContent.innerHTML = `
    <h4>${escapeHtml(post.title)}</h4>
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
  const overlay = document.querySelector(".modal-overlay");

  postDetailWindow.style.display = "none";
  if (overlay) {
    overlay.style.display = "none";
  }
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
  const overlay = document.querySelector(".modal-overlay");

  popupWindow.style.display = "none";
  if (overlay) {
    overlay.style.display = "none";
  }
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// Process code blocks enclosed in triple backticks
function processCodeBlocks(content) {
  // Regex to match ```code``` blocks (including optional language specifier)
  const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/g;

  return content.replace(codeBlockRegex, (_, codeContent) => {
    // Escape HTML within code blocks for security
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

  // Set message
  progressMessage.textContent = message || "Processing...";

  // Set up determinate progress bar
  progressBar.setAttribute("max", max);
  progressBar.setAttribute("value", 0);

  // Show overlay and progress window
  overlay.style.display = "block";
  progressWindow.style.display = "block";

  // Animate progress bar from 0 to max over 2 seconds
  const duration = 2000; // 2 seconds
  const frameRate = 60; // 60 FPS
  const totalFrames = (duration / 1000) * frameRate;
  const increment = max / totalFrames;
  let currentValue = 0;
  let frameCount = 0;

  const animationInterval = setInterval(() => {
    frameCount++;
    currentValue = Math.min(increment * frameCount, max);
    progressBar.setAttribute("value", Math.round(currentValue));

    if (frameCount >= totalFrames) {
      clearInterval(animationInterval);
      // Hide progress bar and execute callback
      setTimeout(() => {
        hideProgressBar();
        if (callback && typeof callback === "function") {
          callback();
        }
      }, 50); // Small delay to show completed state
    }
  }, 1000 / frameRate);

  // Store interval ID for cleanup
  progressBar._animationInterval = animationInterval;
}

function hideProgressBar() {
  const progressWindow = document.getElementById("progress-window");
  const progressBar = document.getElementById("progress-bar");
  const overlay = document.querySelector(".modal-overlay");

  // Clean up animation interval if it exists
  if (progressBar._animationInterval) {
    clearInterval(progressBar._animationInterval);
    progressBar._animationInterval = null;
  }

  progressWindow.style.display = "none";
  if (
    overlay &&
    document.getElementById("post-detail-window").style.display === "none" &&
    document.getElementById("xp-popup-window").style.display === "none"
  ) {
    overlay.style.display = "none";
  }
}

// Image handling functions
async function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) {
    return;
  }

  const imagePreviewArea = document.getElementById("image-preview-area");

  try {
    for (let file of files) {
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

  // Clear the input so the same file can be selected again
  event.target.value = "";
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
    <img src="${imageData.data}" alt="${imageData.filename}" class="image-preview-thumbnail">
    <div class="image-preview-controls">
      <button type="button" class="image-preview-btn" onclick="insertImageIntoContent('${imageData.id}')">Insert</button>
      <button type="button" class="image-preview-btn" onclick="removeImagePreview('${imageData.id}')">Delete</button>
    </div>
    <div class="image-preview-name">${imageData.filename}</div>
  `;

  imagePreviews.appendChild(previewItem);
}

function removeImagePreview(imageId) {
  // Remove from uploaded images array
  uploadedImages = uploadedImages.filter((img) => img.id !== imageId);

  // Remove preview element
  const previewItem = document.querySelector(`[data-image-id="${imageId}"]`);
  if (previewItem) {
    previewItem.remove();
  }

  // Hide preview area if no images left
  if (uploadedImages.length === 0) {
    document.getElementById("image-preview-area").style.display = "none";
  }
}

window.removeImagePreview = removeImagePreview;

function insertImageIntoContent(imageId) {
  const contentTextarea = document.getElementById("post-content");
  const imageData = uploadedImages.find((img) => img.id === imageId);

  if (!imageData) return;

  const cursorPosition = contentTextarea.selectionStart;
  const textBefore = contentTextarea.value.substring(0, cursorPosition);
  const textAfter = contentTextarea.value.substring(cursorPosition);

  const imageMarkdown = `![${imageData.filename}](${imageId})`;

  contentTextarea.value = textBefore + imageMarkdown + textAfter;

  // Move cursor to after inserted text
  const newCursorPosition = cursorPosition + imageMarkdown.length;
  contentTextarea.setSelectionRange(newCursorPosition, newCursorPosition);
  contentTextarea.focus();
}

// Make functions globally accessible for onclick handlers
window.insertImageIntoContent = insertImageIntoContent;

function clearImageUploads() {
  uploadedImages = [];
  imageCounter = 0;
  document.getElementById("image-previews").innerHTML = "";
  document.getElementById("image-preview-area").style.display = "none";
  document.getElementById("image-upload").value = "";
}

function renderPostContent(content, images) {
  // For preview, remove code blocks and replace with indicator
  let previewContent = content;

  // Replace code blocks with placeholder text
  const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/g;
  previewContent = previewContent.replace(codeBlockRegex, "[Code Block]");

  // Escape HTML for security
  let renderedContent = escapeHtml(previewContent);

  // Replace image markdown with simple text for list view
  if (images && images.length > 0) {
    images.forEach((image) => {
      const imageMarkdown = `![${image.filename}](${image.id})`;
      if (renderedContent.includes(imageMarkdown)) {
        renderedContent = renderedContent.replace(
          imageMarkdown,
          `<span style="color: #0066cc; font-style: italic;">[Image]</span>`
        );
      }
    });
  }

  return renderedContent;
}

function renderPostContentWithImages(content, images) {
  // Process code blocks first, then escape remaining content
  let processedContent = processCodeBlocks(content);

  // Split content into parts: code blocks and regular content
  const parts = processedContent.split(/(<pre>[\s\S]*?<\/pre>)/);

  // Process each part: escape non-pre content, keep pre content as-is
  let renderedContent = parts
    .map((part) => {
      if (part.startsWith("<pre>") && part.endsWith("</pre>")) {
        return part; // Keep code blocks as-is
      }
      return escapeHtml(part); // Escape regular content
    })
    .join("");

  // Replace image markdown with actual images
  if (images && images.length > 0) {
    images.forEach((image) => {
      const imageMarkdown = `![${image.filename}](${image.id})`;
      if (renderedContent.includes(imageMarkdown)) {
        renderedContent = renderedContent.replace(
          imageMarkdown,
          `<img src="${image.data}" alt="${image.filename}" class="post-image" style="max-width: 100%; height: auto; border: 1px solid #808080; margin: 8px 0; display: block;">`
        );
      }
    });
  }

  return `<div style="white-space: pre-line;">${renderedContent}</div>`;
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    currentUser = session.user;
    updateUIForLoggedInUser();
  } else if (event === "SIGNED_OUT") {
    currentUser = null;
    isGuest = false;
    updateUIForLoggedOut();
  }
});
